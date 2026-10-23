// Bézier timing curve: drag or nudge anchors and handles; the preview plays from the owner's clock through `progress`.
// onTogglePreview asks the owner to play or pause; `playing` reflects its answer.
import { checkProps, modelSetter, h, svg, attr, style, text, children, renderer } from "../dom.js";
import { createIcon } from "./icon.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { clamp, clone, arrowDelta, remapValue } from "../../src/lib/values.js";
import { rampDefault, envelopeDefault, evaluateCurve, moveCurvePoint } from "../../src/lib/bezier.js";
import { graphHeight, curveViewport, curveGridValues, moveCurvePointInPlot } from "../../src/lib/bezier-plot.js";

const SPEC = {
  value: { type: Array, required: true },
  onInput: { type: Function },
  envelope: { type: Boolean },
  playing: { type: Boolean },
  progress: { type: Number, default: 0 },
  outputRange: { type: Object, required: true },
  unit: { type: String, default: "" },
  propertyLabel: { type: String, default: "" },
  heading: { type: String, default: "" },
  resetCurve: { type: Array, default: null },
  onTogglePreview: { type: Function },
};
const valueFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export function createBezierControl(given) {
  let props = checkProps("BezierControl", SPEC, given);
  let selected = { index: 0, kind: "out" };
  let pointer = null;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }));

  const title = () => props.heading || (props.envelope ? "Bézier pulse envelope" : "Bézier timing ramp");
  const phase = () => clamp(props.progress, 0, 1);
  const evaluated = () => evaluateCurve(props.value, phase());
  const formatValue = (value) => `${valueFormatter.format(value)}${props.unit ? ` ${props.unit}` : ""}`;
  const viewport = () => curveViewport(props.value);
  const px = (x) => 24 + x * 252,
    py = (y) => viewport().py(y);
  const previewDomain = () => ({ min: Math.min(-0.75, viewport().min - 0.1), max: Math.max(1.75, viewport().max + 0.1) });
  const previewPosition = (value) => {
    const domain = previewDomain();
    return (value - domain.min) / (domain.max - domain.min);
  };
  const current = () => (selected.kind === "anchor" ? props.value[selected.index] : props.value[selected.index][selected.kind]);
  const name = (i, kind) =>
    (i === 0 ? "Start" : i === props.value.length - 1 ? "Finish" : "Peak") +
    " " +
    (kind === "anchor" ? "anchor" : kind === "in" ? "incoming handle" : "outgoing handle");
  const targets = () =>
    props.value.flatMap((anchor, index) =>
      ["anchor", "in", "out"]
        .filter((kind) => kind === "anchor" || anchor[kind])
        .map((kind) => ({ index, kind, key: `${index}-${kind}`, name: name(index, kind), value: kind === "anchor" ? anchor : anchor[kind] })),
    );
  const curvePath = () => {
    const points = props.value;
    let d = `M ${px(points[0].x)} ${py(points[0].y)}`;
    points.slice(1).forEach((b, i) => {
      const a = points[i];
      d += ` C ${px(a.out.x)} ${py(a.out.y)} ${px(b.in.x)} ${py(b.in.y)} ${px(b.x)} ${py(b.y)}`;
    });
    return d;
  };

  function select(point) {
    selected = { index: point.index, kind: point.kind };
    render();
  }
  function move(x, y) {
    setModel(moveCurvePoint(props.value, selected, x, y));
  }
  function reset() {
    setModel(clone(props.resetCurve ?? (props.envelope ? envelopeDefault : rampDefault)));
    selected = { index: 0, kind: "out" };
    render();
  }
  function cursorPosition(event) {
    const matrix = graph.getScreenCTM();
    if (!matrix) return;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }
  function start(event, point) {
    if (event.button !== 0 || pointer) return;
    event.preventDefault();
    select(point);
    event.currentTarget.focus();
    const cursor = cursorPosition(event);
    if (!cursor) return;
    pointer = {
      id: event.pointerId,
      points: clone(props.value),
      offsetX: cursor.x - px(point.value.x),
      offsetY: cursor.y - py(point.value.y),
    };
    graph.setPointerCapture(pointer.id);
  }
  function drag(event) {
    if (event.pointerId !== pointer?.id) return;
    const cursor = cursorPosition(event);
    if (!cursor) return;
    setModel(moveCurvePointInPlot(pointer.points, selected, (cursor.x - pointer.offsetX - 24) / 252, cursor.y - pointer.offsetY));
  }
  function finish() {
    pointer = null;
  }
  function nudge(event, point) {
    select(point);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      return;
    }
    const delta = arrowDelta(event);
    if (delta) move(current().x + delta.x / 100, current().y - delta.y / 100);
  }

  const heading = h("h2");
  const resetButton = h("button", { on: { click: reset } }, createIcon({ name: "reset" }).element, "Reset ");
  const overflow = svg("rect", { class: "graph-overflow", x: "24", y: "0", width: "252" });
  const main = svg("rect", { class: "graph-main", x: "24", width: "252" });
  const frame = svg("rect", { class: "graph-frame", x: "24", y: "0", width: "252" });
  const columns = Array.from({ length: 9 }, (_, i) => svg("path", { class: `graph-grid plot-grid${(i + 1) % 2 === 0 ? " minor" : ""}` }));
  // Rows are keyed by value like the Vue v-for, so a row that stays keeps its nodes.
  const rows = new Map();
  const row = (value) => {
    if (!rows.has(value)) {
      const boundary = value === 0 || value === 1;
      rows.set(value, {
        path: svg("path", { class: `graph-grid ${boundary ? "plot-boundary" : "plot-grid"}` }),
        label: boundary ? svg("text", { class: "plot-label", x: "17", "text-anchor": "end", "dominant-baseline": "middle" }, `${Math.round(value * 100)}% `) : null,
      });
    }
    return rows.get(value);
  };
  const overshoot = svg("text", { class: "plot-label", x: "276", y: "-4", "text-anchor": "end" }, "Overshoot");
  const timeLabels = [0, 1].map((x) => svg("text", { class: "plot-label", "text-anchor": "middle" }, `${x * 100}% `));
  const zones = svg("g", { class: "graph-zones", "aria-hidden": "true" });
  const curve = svg("path", { class: "curve-path plot-shape" });
  const playhead = svg("line", { class: "playhead" });
  const dot = svg("circle", { class: "curve-dot plot-point", r: "3" });
  // Parts are keyed like the Vue v-for; handlers read the part's latest target, as Vue rebinds them on render.
  const pointParts = new Map();
  const pointPart = (point) => {
    if (!pointParts.has(point.key)) {
      const mark = svg("circle", { class: "mark" });
      const latest = () => pointParts.get(point.key).point;
      const group = svg(
        "g",
        {
          class: `point ${point.kind}`,
          tabindex: "0",
          role: "button",
          on: {
            focus: () => select(latest()),
            click: () => select(latest()),
            pointerdown: (event) => start(event, latest()),
            keydown: (event) => nudge(event, latest()),
          },
        },
        svg("circle", { class: "hit", r: "12" }),
        svg("circle", { class: "selection-ring", r: "7.5" }),
        mark,
      );
      pointParts.set(point.key, { group, mark, line: point.kind === "anchor" ? null : svg("line", { class: "handle-line" }) });
    }
    const part = pointParts.get(point.key);
    part.point = point;
    return part;
  };
  const graph = svg("svg", {
    class: "curve-graph",
    viewBox: `-16 -12 328 ${graphHeight + 44}`,
    role: "group",
    on: { pointermove: drag, pointerup: finish, pointercancel: finish, lostpointercapture: finish },
  });

  const playButton = h("button", { on: { click: () => props.onTogglePreview?.() } });
  const playIcon = createIcon({ name: "play" });
  const playText = document.createTextNode("");
  playButton.append(playIcon.element, playText);
  const travelPoint = h("span", { class: "travel-point" });
  const travelMin = h("small", { class: "travel-start travel-value" });
  const travelMax = h("small", { class: "travel-end travel-value" });
  const sample = h(
    "div",
    { class: "curve-sample plot-surface", role: "img" },
    h(
      "div",
      { class: "travel-domain" },
      h("div", { class: "travel-track" }),
      travelPoint,
      travelMin,
      travelMax,
      h("small", { class: "travel-start" }, "0%"),
      h("small", { class: "travel-end" }, "100%"),
      h("small", { class: "travel-overshoot" }, "Overshoot"),
    ),
  );
  const readout = h("output", { class: "curve-value readout" });
  const panel = createGraphicPanel({
    flush: true,
    content: graph,
    footer: h(
      "details",
      { class: "preview-disclosure" },
      h("summary", null, "Motion preview"),
      h("div", { class: "preview-heading row" }, playButton),
      sample,
      readout,
    ),
  });
  const element = h("section", { class: "baza-bezier-control" }, h("div", { class: "row between" }, heading, resetButton), panel.element);

  const render = renderer(draw);
  function draw() {
    const view = viewport();
    const all = targets();
    const time = phase();
    const value = evaluated();
    attr(element, "aria-label", title());
    text(heading, title());
    attr(resetButton, "aria-label", `Reset ${title()}`);
    attr(graph, "aria-label", title() + " graph");
    attr(overflow, "height", graphHeight);
    attr(main, "y", py(1));
    attr(main, "height", view.height);
    attr(frame, "height", graphHeight);
    columns.forEach((column, i) => attr(column, "d", `M${px(i / 8)} 0V${graphHeight}`));
    const gridValues = curveGridValues(props.value);
    for (const key of [...rows.keys()]) if (!gridValues.includes(key)) rows.delete(key);
    const gridNodes = gridValues.flatMap((v) => {
      const { path, label } = row(v);
      attr(path, "d", `M24 ${py(v)}H276`);
      if (label) attr(label, "y", py(v));
      return [path, label];
    });
    timeLabels.forEach((label, i) => {
      attr(label, "x", px(i));
      attr(label, "y", graphHeight + 14);
    });
    children(zones, [overflow, main, frame, columns, gridNodes, overshoot, timeLabels]);
    attr(curve, "d", curvePath());
    const parts = all.map((point) => {
      const part = pointPart(point);
      if (part.line) {
        attr(part.line, "x1", px(props.value[point.index].x));
        attr(part.line, "y1", py(props.value[point.index].y));
        attr(part.line, "x2", px(point.value.x));
        attr(part.line, "y2", py(point.value.y));
      }
      attr(part.group, "transform", `translate(${px(point.value.x)} ${py(point.value.y)})`);
      attr(part.group, "aria-label", point.name);
      attr(part.group, "aria-pressed", String(selected.index === point.index && selected.kind === point.kind));
      attr(part.group, "aria-description", `Time ${(point.value.x * 100).toFixed(1)}%, value ${(point.value.y * 100).toFixed(1)}%. Arrow keys adjust; Shift moves faster.`);
      attr(part.mark, "r", point.kind === "anchor" ? 5 : 4);
      return part;
    });
    attr(playhead, "x1", px(time));
    attr(playhead, "x2", px(time));
    attr(playhead, "y1", py(1));
    attr(playhead, "y2", py(0));
    attr(dot, "cx", px(time));
    attr(dot, "cy", py(value));
    children(graph, [zones, curve, parts.map((part) => part.line), playhead, dot, parts.map((part) => part.group)]);

    attr(playButton, "aria-label", props.playing ? "Pause motion preview" : "Play motion preview");
    playIcon.update({ name: props.playing ? "pause" : "play" });
    text(playText, props.playing ? "Pause" : "Play");
    style(sample, "--preview-start", `${previewPosition(0) * 100}%`);
    style(sample, "--preview-end", `${previewPosition(1) * 100}%`);
    attr(sample, "aria-label", `Output mapping: 0% is ${formatValue(props.outputRange.min)}; 100% is ${formatValue(props.outputRange.max)}.`);
    style(travelPoint, "left", previewPosition(value) * 100 + "%");
    text(travelMin, formatValue(props.outputRange.min));
    text(travelMax, formatValue(props.outputRange.max));
    text(
      readout,
      `${props.propertyLabel || (props.envelope ? "Spread" : "Distance")} ${formatValue(remapValue(value, props.outputRange))} (${(value * 100).toFixed(1)}%) at time ${(time * 100).toFixed(1)}%`,
    );
  }
  function apply(partial) {
    props = { ...props, ...partial };
    render();
  }

  render();
  return {
    element,
    update(partial) {
      apply(checkProps("BezierControl", SPEC, partial, props));
    },
    destroy() {},
  };
}
