// Scene-local phase tracks share one absolute clock. Scenes meet at a cut; rendering continuity belongs to the consuming project.
import { clamp, finite } from "./values.js";

export const PHASES = ["intro", "hold", "outro"];
export const TIMING_FIELDS = ["start", ...PHASES];
export const TRACKS = [
  { id: "ramp", label: "Timing ramp" },
  { id: "envelope", label: "Pulse envelope" },
];
export const MIN_SCENE_DURATION = 0.1;
export const seconds = (value) => String(Number(value.toFixed(2)));
const precise = (value) => Number(value.toFixed(9));

export function createTimeline(duration = 4) {
  return [0, 1].map((index) => ({
    id: `scene-${index + 1}`,
    name: `Scene ${String(index + 1).padStart(2, "0")}`,
    duration,
    tracks: {
      ramp: {
        start: 0,
        intro: duration / 4,
        hold: duration / 2,
        outro: duration / 4,
      },
      envelope: {
        start: duration / 8,
        intro: duration / 4,
        hold: duration / 4,
        outro: duration / 4,
      },
    },
  }));
}

export function trackBounds(track) {
  const introEnd = track.start + track.intro;
  const holdEnd = introEnd + track.hold;
  return [track.start, introEnd, holdEnd, holdEnd + track.outro];
}

export function validTrack(track, duration) {
  return Boolean(
    track &&
    TIMING_FIELDS.every((key) => finite(track[key], 0, duration)) &&
    trackBounds(track)[3] <= duration + 1e-8,
  );
}

export function validTimeline(scenes) {
  if (!Array.isArray(scenes) || !scenes.length) return false;
  const ids = new Set();
  return (
    scenes.every((scene) => {
      if (
        !scene ||
        typeof scene.id !== "string" ||
        !scene.id ||
        ids.has(scene.id)
      )
        return false;
      ids.add(scene.id);
      return (
        typeof scene.name === "string" &&
        Boolean(scene.name.trim()) &&
        finite(scene.duration, MIN_SCENE_DURATION, Number.MAX_SAFE_INTEGER) &&
        TRACKS.every(({ id }) => validTrack(scene.tracks?.[id], scene.duration))
      );
    }) && Number.isFinite(sequenceDuration(scenes))
  );
}

export function sceneOffsets(scenes) {
  let start = 0;
  return scenes.map((scene) => {
    const offset = start;
    start += scene.duration;
    return offset;
  });
}

export function sequenceDuration(scenes) {
  return scenes.reduce((total, scene) => total + scene.duration, 0);
}

export function sequencePosition(scenes, time) {
  const offsets = sceneOffsets(scenes);
  const t = clamp(time, 0, sequenceDuration(scenes));
  let index = 0;
  for (let i = 1; i < scenes.length; i++) if (t >= offsets[i]) index = i;
  const local = clamp(t - offsets[index], 0, scenes[index].duration);
  return { index, local };
}

export function trackPhase(track, time) {
  const [start, introEnd, holdEnd, end] = trackBounds(track);
  if (time < start) return { phase: "waiting", progress: 0 };
  if (time >= end) return { phase: "finished", progress: 1 };
  if (time < introEnd)
    return { phase: "intro", progress: (time - start) / track.intro };
  if (time < holdEnd) return { phase: "hold", progress: 1 };
  return { phase: "outro", progress: (time - holdEnd) / track.outro };
}

// The gallery maps intro/hold/outro onto a curve; projects can consume trackPhase directly.
export function trackProgress(track, time, peak = 1, end = 0) {
  const state = trackPhase(track, time);
  if (state.phase === "intro") return state.progress * peak;
  if (state.phase === "hold") return peak;
  if (state.phase === "outro") return peak + state.progress * (end - peak);
  if (state.phase === "finished") {
    return track.outro === 0 && track.intro + track.hold > 0 ? peak : end;
  }
  return 0;
}

// Boundary edits redistribute neighbors; moving a whole clip preserves all phases.
export function moveTrack(track, handle, delta, duration) {
  const bounds = trackBounds(track);
  if (handle === "move")
    return {
      ...track,
      start: precise(
        clamp(
          track.start + delta,
          0,
          Math.max(0, duration - bounds[3] + bounds[0]),
        ),
      ),
    };
  const index = Number(handle);
  if (!Number.isInteger(index) || index < 0 || index > 3)
    throw new RangeError("Unknown timeline boundary.");
  bounds[index] = clamp(
    bounds[index] + delta,
    index ? bounds[index - 1] : 0,
    index < 3 ? bounds[index + 1] : duration,
  );
  return {
    start: precise(bounds[0]),
    intro: precise(bounds[1] - bounds[0]),
    hold: precise(bounds[2] - bounds[1]),
    outro: precise(bounds[3] - bounds[2]),
  };
}

export function scaleScene(scenes, index, duration) {
  if (!finite(duration, MIN_SCENE_DURATION, Number.MAX_SAFE_INTEGER))
    throw new RangeError("Scene duration must be at least 0.1 seconds.");
  const scene = scenes[index];
  const ratio = duration / scene.duration;
  const next = scenes.map((entry, i) =>
    i !== index
      ? { ...entry }
      : {
          ...scene,
          duration,
          tracks: Object.fromEntries(
            TRACKS.map(({ id }) => [
              id,
              Object.fromEntries(
                TIMING_FIELDS.map((key) => [
                  key,
                  scene.tracks[id][key] * ratio,
                ]),
              ),
            ]),
          ),
        },
  );
  return next;
}
