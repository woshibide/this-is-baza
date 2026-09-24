import test from "node:test";
import assert from "node:assert/strict";
import { rampDefault, envelopeDefault, moveCurvePoint } from "../src/lib/bezier.js";
import { curveViewport, curveGridValues, graphHeight, plotPadding, moveCurvePointInPlot } from "../src/lib/bezier-plot.js";

test("resting plot preserves main height and quarters both old margins", () => {
  const view = curveViewport(rampDefault);
  assert.equal(view.height, 140);
  assert.equal(view.py(1), 105 / 4);
  assert.equal(graphHeight - view.py(0), 105 / 4);
});

test("both overshoot directions compress a shared scale inside the fixed frame", () => {
  const upper = moveCurvePoint(rampDefault, { index: 1, kind: "in" }, 0.8, 1.75);
  const both = moveCurvePoint(upper, { index: 0, kind: "out" }, 0.2, -0.75);
  const view = curveViewport(both);
  assert.ok(view.height < curveViewport(upper).height);
  assert.ok(curveViewport(upper).height < 140);
  assert.ok(view.py(1.75) > 0);
  assert.ok(view.py(-0.75) < graphHeight);
  assert.ok(Math.abs((view.py(0) - view.py(0.25)) - view.height / 4) < 1e-10);
});

test("drag sensitivity stays linear as the viewport rescales, including the envelope peak", () => {
  for (const [points, selected] of [
    [rampDefault, { index: 0, kind: "out" }],
    [rampDefault, { index: 1, kind: "in" }],
    [envelopeDefault, { index: 1, kind: "anchor" }],
  ]) {
    const anchor = points[selected.index];
    const initial = selected.kind === "anchor" ? anchor : anchor[selected.kind];
    const view = curveViewport(points);
    for (const distance of [-100, -20, 0, 20, 100]) {
      const pixelY = view.py(initial.y) + distance;
      const actual = moveCurvePointInPlot(points, selected, 0.4, pixelY);
      const anchor = actual[selected.index];
      const point = selected.kind === "anchor" ? anchor : anchor[selected.kind];
      assert.ok(Math.abs(point.y - (initial.y - distance / 280)) < 1e-8);
      assert.equal(point.x, 0.4);
    }
  }
});

test("dragging beyond the frame remains bounded and returning restores the scale", () => {
  const selected = { index: 1, kind: "in" };
  const extreme = moveCurvePointInPlot(rampDefault, selected, 2, -10000);
  assert.equal(extreme[1].in.y, 6);
  assert.ok(curveViewport(extreme).py(extreme[1].in.y) >= 8);
  assert.deepEqual(extreme, moveCurvePointInPlot(rampDefault, selected, 2, -20000));
  assert.equal(extreme[1].in.x, 1);
  const returned = moveCurvePointInPlot(rampDefault, selected, 0.78, plotPadding);
  assert.ok(Math.abs(curveViewport(returned).height - 140) < 1e-7);
});

test("large positive and negative overshoots remain visible with a bounded grid", () => {
  let curve = moveCurvePoint(rampDefault, { index: 0, kind: "out" }, 0.2, -100);
  curve = moveCurvePoint(curve, { index: 1, kind: "in" }, 0.8, 100);
  const view = curveViewport(curve);
  assert.ok(view.py(6) >= 8);
  assert.ok(view.py(-5) <= graphHeight - 8);
  const grid = curveGridValues(curve);
  assert.ok(grid.length <= 11);
  assert.ok(grid.includes(0) && grid.includes(1));
  assert.ok(grid.some((v) => v < -1) && grid.some((v) => v > 2));
});

test("screen-edge dragging reverses immediately and cannot move fixed endpoints", () => {
  const selected = { index: 0, kind: "out" };
  const edge = moveCurvePointInPlot(rampDefault, selected, 0.2, graphHeight + 100);
  const back = moveCurvePointInPlot(rampDefault, selected, 0.2, graphHeight + 99);
  assert.ok(edge[0].out.y < 0);
  assert.ok(back[0].out.y > edge[0].out.y);
  assert.deepEqual(moveCurvePointInPlot(rampDefault, { index: 0, kind: "anchor" }, 0.4, -100), rampDefault);
});

test("each overshoot direction reaches its full allowance without consuming the other", () => {
  for (const order of ["up-first", "down-first"]) {
    let curve = rampDefault;
    const up = { index: 1, kind: "in" };
    const down = { index: 0, kind: "out" };
    if (order === "up-first") {
      curve = moveCurvePointInPlot(curve, up, 0.8, -10000);
      curve = moveCurvePointInPlot(curve, down, 0.2, graphHeight + 10000);
    } else {
      curve = moveCurvePointInPlot(curve, down, 0.2, graphHeight + 10000);
      curve = moveCurvePointInPlot(curve, up, 0.8, -10000);
    }
    assert.equal(curve[0].out.y, -5);
    assert.equal(curve[1].in.y, 6);
    assert.ok(curveViewport(curve).py(6) >= 8);
    assert.ok(curveViewport(curve).py(-5) <= graphHeight - 8);
  }
});

test("small drags at extreme overshoot no longer collapse the entire scale", () => {
  let curve = moveCurvePoint(rampDefault, { index: 0, kind: "out" }, 0.2, -5);
  const selected = { index: 1, kind: "in" };
  curve = moveCurvePoint(curve, selected, 0.8, 6);
  const start = curveViewport(curve).py(6);
  const short = moveCurvePointInPlot(curve, selected, 0.8, start + 5);
  const longer = moveCurvePointInPlot(curve, selected, 0.8, start + 10);
  assert.ok(short[1].in.y > 5.8);
  assert.ok(Math.abs((6 - longer[1].in.y) - 2 * (6 - short[1].in.y)) < 1e-10);
  assert.deepEqual(moveCurvePointInPlot(curve, selected, 0.8, start), curve);
});
