import test from "node:test";
import assert from "node:assert/strict";
import { tick } from "../../vanilla/playback.js";

const once = { start: 0, end: 2, loop: false };
const looping = { start: 1, end: 3, loop: true };

test("the first frame after starting only takes a timestamp", () => {
  assert.deepEqual(tick(0.5, null, once), { time: 0.5, playing: true });
});

test("a frame advances by the elapsed time, at most 0.1 s", () => {
  assert.equal(tick(0.5, 0.016, once).time, 0.516);
  assert.equal(tick(0.5, 2, once).time, 0.6);
});

test("a range that does not loop stops at its end", () => {
  assert.deepEqual(tick(1.95, 0.1, once), { time: 2, playing: false });
  assert.deepEqual(tick(2, null, once), { time: 2, playing: false });
});

test("a looping range wraps past its end and keeps playing", () => {
  const { time, playing } = tick(2.95, 0.1, looping);
  assert.ok(Math.abs(time - 1.05) < 1e-9);
  assert.equal(playing, true);
});

test("an empty looping range holds at its end without stopping", () => {
  assert.deepEqual(tick(1, 0.05, { start: 1, end: 1, loop: true }), { time: 1, playing: true });
});
