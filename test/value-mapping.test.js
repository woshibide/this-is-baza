import test from "node:test";
import assert from "node:assert/strict";
import { remapValue } from "../src/lib/values.js";
import { evaluateCurve, rampDefault, envelopeDefault } from "../src/lib/bezier.js";

test("ramp and envelope map normalized endpoints and peak to the output range", () => {
  const range = { min: 26, max: 77 };
  const sample = (curve, progress) => remapValue(evaluateCurve(curve, progress), range);
  assert.equal(sample(rampDefault, 0), 26);
  assert.equal(sample(rampDefault, 1), 77);
  assert.equal(sample(envelopeDefault, 0), 26);
  assert.equal(sample(envelopeDefault, 0.5), 77);
  assert.equal(sample(envelopeDefault, 1), 26);
});

test("mapping preserves fractional, negative, reversed and coincident ranges and overshoot", () => {
  assert.equal(remapValue(0.5, { min: -10, max: 20.5 }), 5.25);
  assert.equal(remapValue(-0.25, { min: 20, max: 80 }), 5);
  assert.equal(remapValue(1.25, { min: 20, max: 80 }), 95);
  assert.equal(remapValue(0.25, { min: 80, max: 20 }), 65);
  assert.equal(remapValue(1.5, { min: 26, max: 26 }), 26);
});
