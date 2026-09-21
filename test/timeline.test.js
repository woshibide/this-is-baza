import test from "node:test";
import assert from "node:assert/strict";
import {
  createTimeline,
  validTimeline,
  trackBounds,
  trackPhase,
  trackProgress,
  moveTrack,
  scaleScene,
  sequenceDuration,
  sceneOffsets,
  sequencePosition,
} from "../src/lib/timeline.js";
import { validators } from "../src/lib/demo-state.js";

test("scene cuts and absolute time have one unambiguous boundary", () => {
  const scenes = createTimeline();
  assert.equal(sequenceDuration(scenes), 8);
  assert.deepEqual(sceneOffsets(scenes), [0, 4]);
  assert.deepEqual(sequencePosition(scenes, 3.5), { index: 0, local: 3.5 });
  assert.deepEqual(sequencePosition(scenes, 4), { index: 1, local: 0 });
  assert.deepEqual(sequencePosition(scenes, 9), { index: 1, local: 4 });
  assert.deepEqual(sequencePosition(scenes, -1), { index: 0, local: 0 });
});

test("phase evaluation skips zero lengths and supports holding without an outro", () => {
  const track = { start: 0.5, intro: 1, hold: 2, outro: 0.5 };
  assert.deepEqual(trackPhase(track, 0.25), { phase: "waiting", progress: 0 });
  assert.deepEqual(trackPhase(track, 1), { phase: "intro", progress: 0.5 });
  assert.equal(trackPhase(track, 1.5).phase, "hold");
  assert.deepEqual(trackPhase(track, 3.75), { phase: "outro", progress: 0.5 });
  assert.equal(trackProgress(track, 4), 0);
  assert.equal(trackProgress({ ...track, outro: 0 }, 4), 1);
  const empty = { start: 0, intro: 0, hold: 0, outro: 0 };
  assert.equal(trackPhase(empty, 0).phase, "finished");
  assert.equal(trackProgress(empty, 0), 0);
  assert.equal(trackPhase({ ...empty, hold: 2 }, 0).phase, "hold");
});

test("ramp returns along its curve and pulse holds at its movable peak", () => {
  const track = { start: 0, intro: 1, hold: 2, outro: 1 };
  assert.equal(trackProgress(track, 0.5), 0.5);
  assert.equal(trackProgress(track, 2), 1);
  assert.equal(trackProgress(track, 3.5), 0.5);
  assert.equal(trackProgress(track, 0.5, 0.4, 1), 0.2);
  assert.equal(trackProgress(track, 2, 0.4, 1), 0.4);
  assert.equal(trackProgress(track, 3.5, 0.4, 1), 0.7);
  assert.equal(trackProgress(track, 4, 0.4, 1), 1);
});

test("moving clips preserves phases and boundaries cannot cross", () => {
  const track = { start: 0.5, intro: 1, hold: 1, outro: 1 };
  assert.deepEqual(moveTrack(track, "move", 10, 4), { ...track, start: 1 });
  assert.deepEqual(moveTrack(track, "move", -10, 4), { ...track, start: 0 });
  assert.deepEqual(
    trackBounds(moveTrack(track, 1, 10, 4)),
    [0.5, 2.5, 2.5, 3.5],
  );
  assert.deepEqual(
    trackBounds(moveTrack(track, 2, -10, 4)),
    [0.5, 1.5, 1.5, 3.5],
  );
  assert.deepEqual(trackBounds(moveTrack(track, 3, 10, 4)), [0.5, 1.5, 2.5, 4]);
  assert.equal(track.start, 0.5);
});

test("scene resizing scales every phase without modifying neighboring scenes", () => {
  const scenes = createTimeline();
  const next = scaleScene(scenes, 0, 2);
  assert.deepEqual(next[0].tracks.ramp, {
    start: 0,
    intro: 0.5,
    hold: 1,
    outro: 0.5,
  });
  assert.deepEqual(next[0].tracks.envelope, {
    start: 0.25,
    intro: 0.5,
    hold: 0.5,
    outro: 0.5,
  });
  assert.deepEqual(next[1], scenes[1]);
  assert.equal(scenes[0].duration, 4);
  assert.equal(sequenceDuration(next), 6);
  assert.ok(validTimeline(next));
  assert.throws(() => scaleScene(scenes, 0, 0), RangeError);
});

test("saved scenes preserve timing and reject corrupt or out-of-scene tracks", () => {
  const scenes = createTimeline();
  assert.ok(validators.timeline(JSON.parse(JSON.stringify(scenes))));
  for (const invalid of [undefined, {}, [], [null], [scenes[0], scenes[0]]])
    assert.equal(validTimeline(invalid), false);
  const bad = structuredClone(scenes);
  bad[0].tracks.ramp.hold = 99;
  assert.equal(validTimeline(bad), false);
  bad[0].tracks.ramp.hold = NaN;
  assert.equal(validTimeline(bad), false);
});
