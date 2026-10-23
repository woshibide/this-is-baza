// Normalized XY position as {x,y} in percent. Coordinates are independent of display size.
import { checkProps, modelSetter, uid, h, svg, attr, style, text, children, renderer } from "../dom.js";
import { effectiveLimits } from "../../src/lib/numeric-limits.js";
import { createLimitsEditor } from "./limits-editor.js";
import { createNumberField } from "./number-field.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { clamp, arrowDelta } from "../../src/lib/values.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ x: { min: 0, max: 100 }, y: { min: 0, max: 100 } }) },
  onBoundsInput: { type: Function },
  heading: { type: String, default: "XY position" },
};

export function createPositionControl(given) {
  let props = checkProps("PositionControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => apply({ bounds }), () => ready);
  const xLimits = () => effectiveLimits(props.bounds.x, 0, 100);
  const yLimits = () => effectiveLimits(props.bounds.y, 0, 100);
  const hatchId = uid();
  const maskId = uid();
  const restricted = () => {
    const x = xLimits(), y = yLimits();
    return x.min > 0 || x.max < 100 || y.min > 0 || y.max < 100;
  };
  let pointer = null;
  function move(x, y) {
    const xl = xLimits(), yl = yLimits();
    setModel({ x: clamp(x, xl.min, xl.max), y: clamp(y, yl.min, yl.max) });
  }
  function start(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.focus();
    pointer = event.pointerId;
    pad.setPointerCapture(pointer);
    drag(event);
  }
  function drag(event) {
    if (event.pointerId !== pointer) return;
    const rect = pad.getBoundingClientRect();
    move(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
  }
  function finish() {
    pointer = null;
  }
  function nudge(event) {
    const delta = arrowDelta(event);
    if (delta) move(props.value.x + delta.x, props.value.y + delta.y);
  }

  const allowedHole = svg("rect", { fill: "black" });
  const excluded = svg(
    "svg",
    { class: "xy-excluded", "aria-hidden": "true" },
    svg(
      "defs",
      null,
      svg(
        "pattern",
        { id: hatchId, width: "8", height: "8", patternUnits: "userSpaceOnUse" },
        svg("path", { d: "M-2 2L2-2 M0 8L8 0 M6 10L10 6", stroke: "var(--_plot-hatch)", "stroke-opacity": "var(--plot-hatch-opacity, 0.7)" }),
      ),
      svg("mask", { id: maskId }, svg("rect", { width: "100%", height: "100%", fill: "white" }), allowedHole),
    ),
    svg("rect", { width: "100%", height: "100%", fill: `url(#${hatchId})`, mask: `url(#${maskId})` }),
  );
  const allowed = h("div", { class: "xy-allowed", "aria-hidden": "true" });
  const horizontal = h("div", { class: "xy-crosshair horizontal", "aria-hidden": "true" });
  const vertical = h("div", { class: "xy-crosshair vertical", "aria-hidden": "true" });
  const handle = h("button", { class: "xy-handle", "aria-label": "Position point; use arrow keys to move", on: { keydown: nudge } });
  const pad = h("div", {
    class: "xy-pad plot-surface plot-grid-surface",
    on: { pointerdown: start, pointermove: drag, pointerup: finish, pointercancel: finish, lostpointercapture: finish },
  });
  // The Vue component writes each axis into its bounds object; the port passes a new object instead.
  const axisEditor = (axis) =>
    createLimitsEditor({
      value: props.bounds[axis],
      onInput: (limits) => setBounds({ ...props.bounds, [axis]: limits }),
      label: `${axis.toUpperCase()} %`,
      layout: `axis-${axis}`,
      axis: `${axis.toUpperCase()} %`,
      hardMin: 0,
      hardMax: 100,
    });
  const yEditor = axisEditor("y");
  const xEditor = axisEditor("x");
  const xField = createNumberField({ label: "X %", value: +props.value.x.toFixed(2), min: xLimits().min, max: xLimits().max, onInput: (value) => move(value, props.value.y) });
  const yField = createNumberField({ label: "Y %", value: +props.value.y.toFixed(2), min: yLimits().min, max: yLimits().max, onInput: (value) => move(props.value.x, value) });
  const panel = createGraphicPanel({
    content: h("div", { class: "xy-instrument" }, pad, yEditor.element, xEditor.element),
    fields: h("div", { class: "pair" }, xField.element, yField.element),
  });
  const title = h("h2");
  const element = h(
    "section",
    { class: "baza-position-control" },
    title,
    h("p", null, "Drag, use arrow keys, or enter exact coordinates."),
    panel.element,
    h("p", { class: "note" }, " Fixed 0–100% canvas. Hatched areas are outside the limits. Shift nudges by 5%. "),
  );

  const render = renderer(draw);
  function draw() {
    const { x, y } = props.value;
    const xl = xLimits(), yl = yLimits();
    attr(element, "aria-label", props.heading);
    text(title, props.heading);
    attr(allowedHole, "x", xl.min + "%");
    attr(allowedHole, "y", yl.min + "%");
    attr(allowedHole, "width", xl.max - xl.min + "%");
    attr(allowedHole, "height", yl.max - yl.min + "%");
    for (const [key, value] of Object.entries({ left: xl.min + "%", top: yl.min + "%", width: xl.max - xl.min + "%", height: yl.max - yl.min + "%" }))
      style(allowed, key, value);
    style(horizontal, "top", y + "%");
    style(vertical, "left", x + "%");
    style(handle, "left", x + "%");
    style(handle, "top", y + "%");
    attr(handle, "aria-description", `X ${x.toFixed(1)}%, Y ${y.toFixed(1)}%. Allowed X ${xl.min}–${xl.max}%, Y ${yl.min}–${yl.max}%.`);
    children(pad, [excluded, restricted() && allowed, horizontal, vertical, handle]);
    yEditor.update({ value: props.bounds.y });
    xEditor.update({ value: props.bounds.x });
    xField.update({ value: +x.toFixed(2), min: xl.min, max: xl.max });
    yField.update({ value: +y.toFixed(2), min: yl.min, max: yl.max });
  }
  // Mirrors the Vue component's watch on both axis limits: new limits move the point inside them.
  function apply(partial) {
    const before = props;
    props = { ...props, ...partial };
    if (rendered) render();
    if (before.bounds !== props.bounds) move(props.value.x, props.value.y);
  }

  move(props.value.x, props.value.y);
  render();
  rendered = ready = true;
  return {
    element,
    update(partial) {
      apply(checkProps("PositionControl", SPEC, partial, props));
    },
    destroy() {
      xEditor.destroy();
      yEditor.destroy();
      xField.destroy();
      yField.destroy();
    },
  };
}
