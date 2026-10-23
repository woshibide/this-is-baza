import test from "node:test";
import assert from "node:assert/strict";
import { restoreValues } from "../../vanilla/saved-state.js";
import { defaults, validators } from "../../src/lib/demo-state.js";

const payload = (values, version = 1) => JSON.stringify({ version, values });

test("valid saved values replace defaults key by key", () => {
  const values = restoreValues(payload({ slider: 12, rotation: 720 }), defaults, validators);
  assert.equal(values.slider, 12);
  assert.equal(values.rotation, 720);
  assert.deepEqual(values.range, defaults.range);
});

test("invalid or unknown saved values fall back to defaults", () => {
  const values = restoreValues(payload({ slider: 1.5, range: { min: 9, max: 1 }, extra: true }), defaults, validators);
  assert.equal(values.slider, defaults.slider);
  assert.deepEqual(values.range, defaults.range);
  assert.equal("extra" in values, false);
});

test("another payload version or no saved state keeps the defaults", () => {
  assert.deepEqual(restoreValues(payload({ slider: 12 }, 2), defaults, validators), defaults);
  assert.deepEqual(restoreValues(null, defaults, validators), defaults);
});

test("restored values are copies, never the defaults themselves", () => {
  const values = restoreValues(null, defaults, validators);
  values.range.min = 99;
  assert.equal(defaults.range.min, 20);
});

test("corrupt JSON throws so the store can report it", () => {
  assert.throws(() => restoreValues("{not json", defaults, validators), SyntaxError);
});
