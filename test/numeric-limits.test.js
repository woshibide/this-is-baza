import test from "node:test";
import assert from "node:assert/strict";
import {
  parseLimit,
  validLimits,
  effectiveLimits,
  displayLimits,
  moveInterval,
  clampToLimits,
} from "../src/lib/numeric-limits.js";
import { validators } from "../src/lib/demo-state.js";

test("zero remains a bound; only the -0 sentinel clears a bound and survives JSON", () => {
  const limits = { min: -10, max: 100 };
  assert.deepEqual(parseLimit("0", "min", limits).value, { min: 0, max: 100 });
  const cleared = parseLimit("−0", "min", limits).value;
  assert.deepEqual(JSON.parse(JSON.stringify(cleared)), {
    min: null,
    max: 100,
  });
  assert.equal(effectiveLimits(cleared).min, Number.MIN_SAFE_INTEGER);
});

test("limits are never clamped: any safe number is a limit, with no domain or hardcoded range", () => {
  assert.deepEqual(parseLimit("-1e6", "min", { min: 0, max: 100 }).value, { min: -1e6, max: 100 });
  assert.deepEqual(parseLimit("1e9", "max", { min: 0, max: 100 }).value, { min: 0, max: 1e9 });
  assert.deepEqual(effectiveLimits({ min: -500, max: 9000 }), { min: -500, max: 9000 });
  assert.ok(validLimits({ min: -1e6, max: 1e9 }));
});

test("limits reject invalid drafts, crossing, and unsafe numbers", () => {
  for (const text of ["", "-", "Infinity", "NaN", "1e100", "4px"])
    assert.ok(parseLimit(text, "min", { min: 0, max: 100 }).error, text);
  assert.ok(parseLimit("101", "min", { min: 0, max: 100 }).error);
  assert.ok(
    parseLimit("1.5", "min", { min: 0, max: 100 }, { integer: true }).error,
  );
  assert.equal(parseLimit("0.25", "min", { min: 0, max: 100 }).value.min, 0.25);
  assert.ok(validLimits({ min: 2, max: 2 }));
  assert.equal(validLimits({ min: 0.5, max: 10 }, { integer: true }), false);
});

test("interval moves preserve width and enforce editable limits without crossing", () => {
  const bounds = { min: -200, max: 400 };
  const interval = { min: -50, max: 150 };
  assert.deepEqual(moveInterval(interval, "band", 1000, bounds), {
    min: 200,
    max: 400,
  });
  assert.deepEqual(moveInterval(interval, "band", -1000, bounds), {
    min: -200,
    max: 0,
  });
  assert.deepEqual(moveInterval(interval, "min", 1000, bounds), {
    min: 150,
    max: 150,
  });
  assert.deepEqual(moveInterval(interval, "max", -1000, bounds), {
    min: -50,
    max: -50,
  });
  const unbounded = effectiveLimits({ min: null, max: null });
  assert.deepEqual(moveInterval(interval, "band", -500, unbounded), {
    min: -550,
    max: -350,
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(interval).map(([k, v]) => [
        k,
        clampToLimits(v, { min: 500, max: 1000 }),
      ]),
    ),
    { min: 500, max: 500 },
  );
});

test("unbounded and coincident tracks have a finite nonzero display span", () => {
  for (const [limits, values] of [
    [{ min: null, max: null }, [-500, 400]],
    [{ min: 500, max: null }, [500, 600]],
    [{ min: null, max: -100 }, [-300, -100]],
    [{ min: 20, max: 20 }, [20, 20]],
  ]) {
    const scale = displayLimits(limits, values);
    assert.ok(Number.isFinite(scale.min) && Number.isFinite(scale.max));
    assert.ok(scale.max > scale.min);
    assert.ok(
      values.every((value) => value >= scale.min && value <= scale.max),
    );
  }
});

test("restoration accepts any values and bounds the user's limits allowed", () => {
  assert.ok(validators.range({ min: -1000, max: 5000 }));
  assert.ok(validators.durations({ rise: 90, pulse: 2 }));
  assert.ok(validators.dimensions({ width: 8192, height: 4608, locked: true }));
  assert.ok(validators.rotation(72000));
  assert.ok(validators.rangeBounds({ min: null, max: null }));
  assert.equal(validators.rangeBounds({ min: 1.5, max: 2 }), false);
  assert.ok(validators.durationLimits({ min: -5, max: null }));
  assert.ok(validators.positionBounds({ x: { min: -50, max: 150 }, y: { min: 0, max: 100 } }));
  assert.ok(validators.gradientBounds({ min: -20, max: 120 }));
  assert.ok(validators.dimensionsBounds({ width: { min: -10, max: null }, height: { min: 0, max: 10 } }));
  assert.ok(validators.vectorBounds({ angle: { min: null, max: null }, length: { min: -100, max: 100 } }));
  assert.ok(validators.position({ x: -20, y: 140 }));
  assert.equal(validators.durations({ rise: 0, pulse: 2 }), false);
});
