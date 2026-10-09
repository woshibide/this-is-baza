import test from "node:test";
import assert from "node:assert/strict";
import {
  CURVES,
  defaultDurations,
  defaultTracks,
  easeOf,
  moveTrack,
  playRange,
  ramp,
  restoreTracks,
  scaleTracks,
  sequenceDuration,
  stepAt,
  stepOffsets,
  ticks,
  trackValue,
  validDurations,
} from "../src/lib/timeline.js";
import { envelopeDefault } from "../src/lib/bezier.js";

const steps = [
  {
    id: "in",
    name: "In",
    duration: 4,
    tracks: [
      {
        id: "fade",
        name: "Fade",
        start: 0.5,
        end: 2.5,
        ease: easeOf("out"),
        params: {
          slide: { label: "Slide", value: 10, min: 0, max: 100, step: 1 },
          order: { label: "Order", value: "first", options: [["first", "First"], ["last", "Last"]] },
          from: { label: "From", value: { x: 50, y: 60 }, position: true },
        },
      },
      { id: "pulse", name: "Pulse", start: 0, end: 4, ease: envelopeDefault, envelope: true },
    ],
  },
  { id: "out", name: "Out", duration: 2, tracks: [] },
];
const durations = defaultDurations(steps);

test("steps meet at one unambiguous boundary and the end belongs to the last step", () => {
  assert.equal(sequenceDuration(steps, durations), 6);
  assert.deepEqual(stepOffsets(steps, durations), [0, 4]);
  assert.deepEqual(stepAt(steps, durations, 3.5), { index: 0, local: 3.5, progress: 0.875 });
  assert.deepEqual(stepAt(steps, durations, 4), { index: 1, local: 0, progress: 0 });
  assert.deepEqual(stepAt(steps, durations, 9), { index: 1, local: 2, progress: 1 });
  assert.deepEqual(stepAt(steps, durations, -1), { index: 0, local: 0, progress: 0 });
});

test("an open step loops its own range; otherwise the sequence plays once", () => {
  assert.deepEqual(playRange(steps, durations), { start: 0, end: 6, loop: false });
  assert.deepEqual(playRange(steps, durations, "out"), { start: 4, end: 6, loop: true });
  assert.deepEqual(playRange(steps, durations, "missing"), { start: 0, end: 6, loop: false });
});

test("ruler ticks keep at most 24 marks and include both ends when they align", () => {
  assert.deepEqual(ticks(4, [0.25, 0.5, 1, 2]), [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4]);
  assert.deepEqual(ticks(30, [1, 2, 5, 10]), [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
  assert.deepEqual(ticks(1000, [1, 2]).length, 501);
});

test("track progress is linear inside the clip, eased by its curve, and a zero-length clip is a cut", () => {
  const track = { start: 1, end: 3, ease: ramp([0, 0, 1, 1]) };
  assert.deepEqual(trackValue(track, 0), { progress: 0, value: 0 });
  assert.equal(trackValue(track, 2).progress, 0.5);
  assert.ok(Math.abs(trackValue(track, 2).value - 0.5) < 1e-6);
  assert.deepEqual(trackValue(track, 5), { progress: 1, value: 1 });
  const cut = { start: 1, end: 1, ease: track.ease };
  assert.equal(trackValue(cut, 0.99).progress, 0);
  assert.equal(trackValue(cut, 1).progress, 1);
  const envelope = { start: 0, end: 2, ease: envelopeDefault };
  assert.equal(trackValue(envelope, 1).value, 1);
  assert.equal(trackValue(envelope, 2).value, 0);
});

test("moving a clip keeps its length and keyframes cannot cross or leave the step", () => {
  const track = { start: 1, end: 2, ease: easeOf("linear") };
  assert.deepEqual(moveTrack(track, "move", 10, 4), { ...track, start: 3, end: 4 });
  assert.deepEqual(moveTrack(track, "move", -10, 4), { ...track, start: 0, end: 1 });
  assert.deepEqual(moveTrack(track, "start", 5, 4), { ...track, start: 2 });
  assert.deepEqual(moveTrack(track, "end", -5, 4), { ...track, end: 1 });
  assert.deepEqual(moveTrack(track, "end", 5, 4), { ...track, end: 4 });
  assert.equal(track.start, 1);
});

test("rescaling a step keeps keyframes at the same relative times", () => {
  const scaled = scaleTracks(defaultTracks(steps).in, 0.5);
  assert.equal(scaled.fade.start, 0.25);
  assert.equal(scaled.fade.end, 1.25);
  assert.equal(scaled.pulse.end, 2);
  assert.equal(scaled.fade.slide, 10);
});

test("saved tracks merge key by key and corrupt values fall back to defaults", () => {
  const defaults = defaultTracks(steps);
  assert.deepEqual(restoreTracks(steps, undefined, durations), defaults);
  assert.deepEqual(restoreTracks(steps, JSON.parse(JSON.stringify(defaults)), durations), defaults);
  const saved = {
    in: {
      fade: { start: 1, end: 3, ease: CURVES, slide: 500, order: "last", from: { x: 20, y: 101 } },
      pulse: { start: 3, end: 2, ease: easeOf("out") },
    },
  };
  const restored = restoreTracks(steps, saved, durations);
  assert.deepEqual(restored.in.fade, { ...defaults.in.fade, start: 1, end: 3, order: "last" });
  assert.deepEqual(restored.in.pulse, defaults.in.pulse);
  const moved = restoreTracks(steps, { in: { fade: { from: { x: 20, y: 30 } } } }, durations);
  assert.deepEqual(moved.in.fade.from, { x: 20, y: 30 });
  assert.notEqual(defaultTracks(steps).in.fade.from, steps[0].tracks[0].params.from.value);
  // A shorter saved step fits its default keyframes inside it.
  const fitted = restoreTracks(steps, null, { in: 2, out: 2 });
  assert.equal(fitted.in.pulse.end, 2);
  assert.equal(fitted.in.fade.end, 2);
  assert.equal(fitted.in.fade.start, 0.4);
});

test("durations validate per step", () => {
  assert.ok(validDurations(steps, durations));
  assert.equal(validDurations(steps, { in: 4 }), false);
  assert.equal(validDurations(steps, { in: 4, out: 0 }), false);
  assert.equal(validDurations(steps, null), false);
  assert.equal(validDurations(steps, { in: 4, out: 61 }, 60), false);
});
