import test from "node:test";
import assert from "node:assert/strict";
import { alongDirection, dialScale, lengthAfterDrag, pointDistance, validVector } from "../src/lib/vector.js";

const open = { min: 0, max: Number.MAX_SAFE_INTEGER };

test("pointer offsets project onto the vector's direction", () => {
  assert.equal(alongDirection(0, -0.5, 0), 0.5);
  assert.ok(Math.abs(alongDirection(1, 0, 90) - 1) < 1e-12);
  assert.equal(alongDirection(0.8, -0.5, 0), 0.5);
  assert.ok(Math.abs(alongDirection(0, -0.5, 720) - 0.5) < 1e-12);
  assert.ok(alongDirection(0, 0.6, 0) < 0);
});

test("dragging changes length by 100% per rest radius at any zoom", () => {
  assert.equal(lengthAfterDrag(50, 0.5, open), 100);
  assert.equal(lengthAfterDrag(150, 0.5, open), 200);
  assert.equal(lengthAfterDrag(150, -2, open), 0);
  assert.equal(lengthAfterDrag(150, 5, { min: 0, max: 200 }), 200);
  assert.equal(lengthAfterDrag(0, 0.48, open, 10), 50);
});

test("past the rim the point holds still while the dial shrinks to 100/length", () => {
  assert.equal(pointDistance(50), 0.5);
  assert.equal(pointDistance(100), 1);
  assert.equal(pointDistance(400), 1);
  assert.equal(dialScale(50), 1);
  assert.equal(dialScale(200), 0.5);
  assert.equal(dialScale(1000), 0.1);
});

test("saved vectors keep accumulated turns and any non-negative length", () => {
  assert.ok(validVector({ angle: 765, length: 0 }));
  assert.ok(validVector({ angle: -30, length: 500 }));
  assert.equal(validVector({ angle: 1.5, length: 50 }), false);
  assert.equal(validVector({ angle: 0, length: -1 }), false);
  assert.equal(validVector(null), false);
});
