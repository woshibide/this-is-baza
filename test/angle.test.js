import test from "node:test";
import assert from "node:assert/strict";
import { angleAtPoint, rotationAtAngle } from "../src/lib/angle.js";

const limits = { min: -36000, max: 36000 };

test("dial coordinates follow the printed cardinal directions and ignore the center", () => {
  assert.equal(angleAtPoint(0, -52), 0);
  assert.equal(angleAtPoint(52, 0), 90);
  assert.equal(angleAtPoint(0, 52), 180);
  assert.equal(angleAtPoint(-52, 0), 270);
  assert.equal(angleAtPoint(1, -1), null);
  assert.equal(rotationAtAngle(15, null, limits), 15);
});

test("crossing zero in either direction retains complete turns", () => {
  assert.equal(rotationAtAngle(359, 1, limits), 361);
  assert.equal(rotationAtAngle(1, 359, limits), -1);
  assert.equal(rotationAtAngle(720, 90, limits), 810);
  assert.equal(rotationAtAngle(-720, 270, limits), -810);
  let value = 0;
  for (const angle of [90, 180, 270, 0, 90, 180, 270, 0])
    value = rotationAtAngle(value, angle, limits);
  assert.equal(value, 720);
});

test("dial edits snap to whole degrees or shift increments and respect custom bounds", () => {
  assert.equal(rotationAtAngle(15, 28.8, limits), 29);
  assert.equal(rotationAtAngle(15, 28.8, limits, 15), 30);
  assert.equal(rotationAtAngle(40, 90, { min: 0, max: 45 }), 45);
  assert.equal(rotationAtAngle(0, 350, { min: 0, max: 45 }), 0);
  assert.equal(rotationAtAngle(45, 30, { min: 0, max: 45 }), 30);
});
