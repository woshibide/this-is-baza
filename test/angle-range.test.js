import test from "node:test";
import assert from "node:assert/strict";
import { angleRangeArc, moveAngleRange, validAngleRange, wrapDegrees } from "../src/lib/angle-range.js";

test("rotating across zero preserves the allowed sweep in either direction", () => {
  assert.deepEqual(moveAngleRange({ start: 300, sweep: 120 }, "band", 90), { start: 30, sweep: 120 });
  assert.deepEqual(moveAngleRange({ start: 30, sweep: 120 }, "band", -90), { start: 300, sweep: 120 });
  assert.equal(wrapDegrees(-720), 0);
});

test("resizing across zero holds the opposite endpoint fixed", () => {
  const interval = { start: 350, sweep: 40 };
  assert.deepEqual(moveAngleRange(interval, "start", 20), { start: 10, sweep: 20 });
  assert.deepEqual(moveAngleRange(interval, "end", -35), { start: 350, sweep: 5 });
  for (const delta of [-800, -30, 0, 30, 800]) {
    const moved = moveAngleRange(interval, "start", delta);
    assert.equal(wrapDegrees(moved.start + moved.sweep), 30);
    assert.ok(validAngleRange(moved));
  }
});

test("endpoints clamp without flipping between empty and full intervals", () => {
  assert.deepEqual(moveAngleRange({ start: 300, sweep: 120 }, "start", 200), { start: 60, sweep: 0 });
  assert.deepEqual(moveAngleRange({ start: 300, sweep: 120 }, "end", 300), { start: 300, sweep: 360 });
  assert.deepEqual(moveAngleRange({ start: 300, sweep: 360 }, "start", -1), { start: 300, sweep: 360 });
  assert.deepEqual(moveAngleRange({ start: 300, sweep: 0 }, "end", -1), { start: 300, sweep: 0 });
  assert.notEqual(angleRangeArc(300, 0), angleRangeArc(300, 360));
  assert.equal((angleRangeArc(300, 360).match(/A52/g) ?? []).length, 2);
});

test("persisted intervals retain zero/full sweeps and reject invalid values", () => {
  for (const sweep of [0, 1, 120, 359, 360])
    assert.ok(validAngleRange(JSON.parse(JSON.stringify({ start: 300, sweep }))));
  for (const value of [null, {}, { start: 360, sweep: 20 }, { start: -1, sweep: 20 },
    { start: 0, sweep: 361 }, { start: 0, sweep: -1 }, { start: 0.5, sweep: 30 }, { start: 0, sweep: NaN }])
    assert.equal(validAngleRange(value), false);
});
