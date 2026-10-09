// Steps play back to back; each step holds keyframed tracks in step-local seconds.
// A step is { id, name, duration, tracks: [spec] }; a spec is
// { id, name, start, end, ease, envelope?, params?: { key: param }, range?(track) }, where a param is a number
// { label, value, min, max, step }, a choice { label, value, options: [[id, label]] }, or an XY point { label, value: { x, y }, position: true } in 0–100%.
// Durations and tracks are saved state keyed by step id; one clock drives preview, scrubbing, and export.
import { clamp, clone, finite } from "./values.js";
import { evaluateCurve, validCurve, rampDefault, envelopeDefault } from "./bezier.js";

export const MIN_STEP = 0.1;
export const seconds = (value) => String(Number(value.toFixed(2)));
const round = (value) => Number(value.toFixed(4));

export const defaultDurations = (steps) => Object.fromEntries(steps.map((step) => [step.id, step.duration]));
export const validDurations = (steps, durations, max = Number.MAX_SAFE_INTEGER) =>
  durations !== null && typeof durations === "object" && steps.every((step) => finite(durations[step.id], MIN_STEP, max));

export function stepOffsets(steps, durations) {
  let start = 0;
  return steps.map((step) => {
    const offset = start;
    start += durations[step.id];
    return offset;
  });
}
export const sequenceDuration = (steps, durations) => steps.reduce((sum, step) => sum + durations[step.id], 0);

// { index, local, progress } of the step containing time; the end time belongs to the last step.
export function stepAt(steps, durations, time) {
  const offsets = stepOffsets(steps, durations);
  const t = clamp(time, 0, sequenceDuration(steps, durations));
  let index = 0;
  for (let i = 1; i < steps.length; i++) if (t >= offsets[i]) index = i;
  const duration = durations[steps[index].id];
  const local = clamp(t - offsets[index], 0, duration);
  return { index, local, progress: local / duration };
}

// Playback range: the open step loops; otherwise the whole sequence plays once.
export function playRange(steps, durations, open = null) {
  const index = steps.findIndex((step) => step.id === open);
  if (index < 0) return { start: 0, end: sequenceDuration(steps, durations), loop: false };
  const start = stepOffsets(steps, durations)[index];
  return { start, end: start + durations[open], loop: true };
}

// Ruler ticks: the first spacing that keeps at most 24 ticks across the span.
export function ticks(span, spacings) {
  const every = spacings.find((value) => span / value <= 24) ?? spacings.at(-1);
  return Array.from({ length: Math.floor(span / every + 1e-9) + 1 }, (_, i) => round(i * every));
}

// Named eases as CSS cubic-bezier control points, offered as presets for two-point curves.
export const CURVES = [
  { id: "linear", label: "Linear", bezier: [0, 0, 1, 1] },
  { id: "out", label: "Out", bezier: [0.16, 1, 0.3, 1] },
  { id: "in", label: "In", bezier: [0.7, 0, 0.84, 0] },
  { id: "inOut", label: "In-out", bezier: [0.83, 0, 0.17, 1] },
  { id: "soft", label: "Soft", bezier: [0.65, 0, 0.35, 1] },
  { id: "settle", label: "Settle", bezier: [0.7, 0, 0.2, 1.06] },
  { id: "back", label: "Back", bezier: [0.34, 1.56, 0.64, 1] },
  { id: "pen", label: "Pen", bezier: [0.42, 0, 0.3, 1] },
];
// A cubic-bezier as a Baza ramp curve, the editable form stored per track.
export const ramp = ([x1, y1, x2, y2]) => [
  { x: 0, y: 0, out: { x: x1, y: y1 } },
  { x: 1, y: 1, in: { x: x2, y: y2 } },
];
export const easeOf = (id) => ramp(CURVES.find((curve) => curve.id === id).bezier);

export function defaultTrack(spec) {
  const track = { start: spec.start, end: spec.end, ease: clone(spec.ease) };
  for (const [key, param] of Object.entries(spec.params ?? {})) track[key] = clone(param.value);
  return track;
}
export const defaultTracks = (steps) =>
  Object.fromEntries(steps.map((step) => [step.id, Object.fromEntries(step.tracks.map((spec) => [spec.id, defaultTrack(spec)]))]));

export function validParam(param, value) {
  if (param.options) return param.options.some(([id]) => id === value);
  if (param.position) return value !== null && typeof value === "object" && finite(value.x, 0, 100) && finite(value.y, 0, 100);
  return finite(value, param.min, param.max);
}

// Merges a saved track into its defaults key by key; times must fit the step, or the default is fitted to it.
export function restoreTrack(spec, saved, duration) {
  const track = defaultTrack(spec);
  saved ??= {};
  if (finite(saved.start, 0, duration) && finite(saved.end, saved.start, duration)) {
    track.start = saved.start;
    track.end = saved.end;
  } else if (track.end > duration) {
    const ratio = duration / track.end;
    track.start = round(track.start * ratio);
    track.end = round(duration);
  }
  if (validCurve(saved.ease, spec.envelope ? envelopeDefault : rampDefault)) track.ease = clone(saved.ease);
  for (const [key, param] of Object.entries(spec.params ?? {})) if (validParam(param, saved[key])) track[key] = clone(saved[key]);
  return track;
}
export const restoreTracks = (steps, saved, durations) =>
  Object.fromEntries(
    steps.map((step) => [
      step.id,
      Object.fromEntries(step.tracks.map((spec) => [spec.id, restoreTrack(spec, saved?.[step.id]?.[spec.id], durations[step.id])])),
    ]),
  );

// Rescales a step's keyframes when its duration changes, keeping their relative timing.
export const scaleTracks = (tracks, ratio) =>
  Object.fromEntries(Object.entries(tracks).map(([id, t]) => [id, { ...t, start: round(t.start * ratio), end: round(t.end * ratio) }]));

// Moving keeps the length; each keyframe stays between 0, its partner, and the step's end.
export function moveTrack(track, handle, delta, duration) {
  if (handle === "move") {
    const start = clamp(track.start + delta, 0, duration - (track.end - track.start));
    return { ...track, start: round(start), end: round(start + track.end - track.start) };
  }
  if (handle === "start") return { ...track, start: round(clamp(track.start + delta, 0, track.end)) };
  return { ...track, end: round(clamp(track.end + delta, track.start, duration)) };
}

// Linear progress and eased value of a track at a step-local time; a zero-length track is a cut.
export function trackValue(track, local) {
  const span = track.end - track.start;
  const progress = span > 0 ? clamp((local - track.start) / span, 0, 1) : local >= track.start ? 1 : 0;
  return { progress, value: evaluateCurve(track.ease, progress) };
}
