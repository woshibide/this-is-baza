import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCurve,
  rampDefault,
  envelopeDefault,
  validCurve,
  moveCurvePoint,
} from "../src/lib/bezier.js";
import { parseHex } from "../src/lib/values.js";
import { defaults, validators } from "../src/lib/demo-state.js";

test("Bézier evaluation solves X before evaluating Y", () => {
  const curve = [
    { x: 0, y: 0, out: { x: 0, y: 0 } },
    { x: 1, y: 1, in: { x: 0, y: 1 } },
  ];
  // Bx(u)=u^3; at x=1/8, u=1/2 and By(u)=1/2.
  assert.ok(Math.abs(evaluateCurve(curve, 0.125) - 0.5) < 1e-8);
});

test("ramp and envelope preserve exact endpoints and envelope peak", () => {
  assert.equal(evaluateCurve(rampDefault, 0), 0);
  assert.equal(evaluateCurve(rampDefault, 1), 1);
  assert.equal(evaluateCurve(envelopeDefault, 0), 0);
  assert.equal(evaluateCurve(envelopeDefault, 0.5), 1);
  assert.equal(evaluateCurve(envelopeDefault, 1), 0);
});

test("restored curves reject out-of-segment handles and collapsed anchors", () => {
  const badHandles = structuredClone(rampDefault);
  badHandles[0].out.x = 1.1;
  badHandles[1].in.x = 0.1;
  assert.equal(validCurve(badHandles, rampDefault), false);
  const collapsed = structuredClone(envelopeDefault);
  collapsed[1].x = 0;
  assert.equal(validCurve(collapsed, envelopeDefault), false);
});

test("crossed handles and vertical overshoot survive curve validation", () => {
  const curve = moveCurvePoint(
    rampDefault,
    { index: 0, kind: "out" },
    0.9,
    1.75,
  );
  const crossed = moveCurvePoint(curve, { index: 1, kind: "in" }, 0.1, -0.75);
  assert.equal(crossed[0].out.x, 0.9);
  assert.equal(crossed[1].in.x, 0.1);
  assert.equal(crossed[0].out.y, 1.75);
  assert.equal(crossed[1].in.y, -0.75);
  assert.ok(validCurve(crossed, rampDefault));
  assert.ok(validators.ramp(JSON.parse(JSON.stringify(crossed))));
  assert.ok(Math.abs(evaluateCurve(crossed, 0.5) - 0.5) < 1e-8);
});

test("fully crossed time handles still evaluate a single continuous curve", () => {
  const curve = [
    { x: 0, y: 0, out: { x: 1, y: 1.75 } },
    { x: 1, y: 1, in: { x: 0, y: -0.75 } },
  ];
  for (const u of [0.1, 0.25, 0.49, 0.5, 0.51, 0.75, 0.9]) {
    const x = 3 * u - 6 * u * u + 4 * u * u * u;
    const y =
      3 * (1 - u) * (1 - u) * u * 1.75 +
      3 * (1 - u) * u * u * -0.75 +
      u * u * u;
    assert.ok(Math.abs(evaluateCurve(curve, x) - y) < 2e-5);
  }
});

test("evaluation preserves values outside the nominal range", () => {
  const above = [
    { x: 0, y: 0, out: { x: 0, y: 1.75 } },
    { x: 1, y: 1, in: { x: 1, y: 1.75 } },
  ];
  const below = [
    { x: 0, y: 0, out: { x: 0, y: -0.75 } },
    { x: 1, y: 1, in: { x: 1, y: -0.75 } },
  ];
  assert.ok(evaluateCurve(above, 0.5) > 1);
  assert.ok(evaluateCurve(below, 0.5) < 0);
});

test("moving the envelope peak preserves valid segments with crossed handles", () => {
  let curve = moveCurvePoint(
    envelopeDefault,
    { index: 0, kind: "out" },
    0.49,
    1.5,
  );
  curve = moveCurvePoint(curve, { index: 1, kind: "in" }, 0.1, -0.5);
  curve = moveCurvePoint(curve, { index: 1, kind: "out" }, 0.9, 1.4);
  curve = moveCurvePoint(curve, { index: 2, kind: "in" }, 0.51, -0.4);
  for (const x of [0.02, 0.25, 0.75, 0.98]) {
    const moved = moveCurvePoint(curve, { index: 1, kind: "anchor" }, x, 1);
    assert.ok(validCurve(moved, envelopeDefault));
    assert.equal(moved[1].x, x);
    assert.equal(moved[1].y, 1);
    assert.equal(moved[1].in.y, -0.5);
    assert.equal(evaluateCurve(moved, x), 1);
  }
});

test("handle motion clamps time to its segment with independent 500% overshoot limits", () => {
  const upper = moveCurvePoint(rampDefault, { index: 0, kind: "out" }, 2, 3);
  assert.deepEqual(upper[0].out, { x: 1, y: 3 });
  const lower = moveCurvePoint(rampDefault, { index: 1, kind: "in" }, -1, -2);
  assert.deepEqual(lower[1].in, { x: 0, y: -2 });
  assert.ok(validators.ramp(JSON.parse(JSON.stringify(upper))));
  assert.ok(validators.ramp(JSON.parse(JSON.stringify(lower))));
  assert.deepEqual(rampDefault[0].out, { x: 0.22, y: 0 });
});

test("RGB hex edits preserve zero alpha; RGBA edits replace it", () => {
  const color = { hex: "#006a78", alpha: 0 };
  assert.deepEqual(parseHex("#ff0000", color), { hex: "#ff0000", alpha: 0 });
  assert.deepEqual(parseHex("#11223380", color), {
    hex: "#112233",
    alpha: 128 / 255,
  });
  assert.equal(parseHex("invalid", color), null);
});

test("saved state validates defaults and rejects invalid domains", () => {
  for (const [name, value] of Object.entries(defaults))
    assert.ok(validators[name](value), name);
  assert.equal(validators.count(2.5), false);
  assert.equal(validators.range({ min: 90, max: 20 }), false);
  assert.equal(validators.duration(0), false);
  assert.equal(validators.position({ x: NaN, y: 20 }), false);
  assert.equal(
    validators.dimensions({ width: 320, height: 0, locked: true }),
    false,
  );
  assert.ok(validators.palette([{ hex: "#006a78", alpha: 0 }]));
});

test("middle anchor moves vertically with its handles and survives persistence", () => {
  for (const y of [-5, -0.75, 0.4, 1.5, 1.75, 6]) {
    const moved = moveCurvePoint(
      envelopeDefault,
      { index: 1, kind: "anchor" },
      0.6,
      y,
    );
    assert.equal(moved[1].y, y);
    assert.equal(moved[1].in.y, y);
    assert.equal(moved[1].out.y, y);
    assert.equal(evaluateCurve(moved, 0.6), y);
    assert.ok(validators.envelope(JSON.parse(JSON.stringify(moved))));
  }
  const limited = moveCurvePoint(
    envelopeDefault,
    { index: 1, kind: "anchor" },
    0.5,
    9,
  );
  assert.equal(limited[1].y, 6);
  assert.deepEqual(
    moveCurvePoint(envelopeDefault, { index: 0, kind: "anchor" }, 0.2, 0.5),
    envelopeDefault,
  );
});
