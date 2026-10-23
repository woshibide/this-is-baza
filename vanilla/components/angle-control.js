// Rotation in degrees. Preserve full turns, even when the orientation wraps.
import { checkProps, modelSetter, h, svg, attr, toggle, text, listen, renderer } from "../dom.js";
import { createNumberField } from "./number-field.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { effectiveLimits, clampToLimits } from "../../src/lib/numeric-limits.js";
import { angleAtPoint, rotationAtAngle } from "../../src/lib/angle.js";

const SPEC = {
  value: { type: Number, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ min: -36000, max: 36000 }) },
  onBoundsInput: { type: Function },
};
// The dial's fixed marks: cross, ring, 15° ticks, and cardinal labels.
function dialMarks() {
  return [
    svg("path", { class: "plot-grid", d: "M160 26V154M88 90H232" }),
    svg("circle", { class: "plot-axis", cx: "160", cy: "90", r: "52" }),
    ...Array.from({ length: 24 }, (_, i) =>
      svg("path", { class: "plot-grid", d: (i + 1) % 6 === 1 ? "M160 32V44" : "M160 35V39", transform: `rotate(${i * 15} 160 90)` }),
    ),
    svg("text", { class: "plot-label", x: "160", y: "17", "text-anchor": "middle" }, "0°"),
    svg("text", { class: "plot-label", x: "242", y: "94" }, "90°"),
    svg("text", { class: "plot-label", x: "160", y: "170", "text-anchor": "middle" }, "180°"),
    svg("text", { class: "plot-label", x: "77", y: "94", "text-anchor": "end" }, "270°"),
  ];
}

export function createAngleControl(given) {
  let props = checkProps("AngleControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => apply({ bounds }), () => ready);
  const effective = () => effectiveLimits(props.bounds);
  let pointer = null;
  let initial = 0;
  let stopBlur = null;

  function start(event) {
    if (event.button !== 0 || event.isPrimary === false || pointer !== null) return;
    event.preventDefault();
    initial = props.value;
    pointer = event.pointerId;
    render();
    dial.focus({ preventScroll: true });
    dial.setPointerCapture(event.pointerId);
    stopBlur = listen(window, "blur", finish);
    drag(event);
  }
  function drag(event) {
    if (event.pointerId !== pointer) return;
    const matrix = dial.getScreenCTM();
    if (!matrix) return;
    event.preventDefault();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    setModel(rotationAtAngle(props.value, angleAtPoint(point.x - 160, point.y - 90), effective(), event.shiftKey ? 15 : 1));
  }
  function finish(event) {
    if (event?.pointerId !== undefined && event.pointerId !== pointer) return;
    const id = pointer;
    pointer = null;
    stopBlur?.();
    stopBlur = null;
    if (id !== null && dial.hasPointerCapture(id)) dial.releasePointerCapture(id);
    render();
  }
  function nudge(event) {
    if (event.key === "Escape" && pointer !== null) {
      event.preventDefault();
      setModel(clampToLimits(initial, effective()));
      finish();
      return;
    }
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!direction && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const limits = effective();
    setModel(clampToLimits(event.key === "Home" ? limits.min : event.key === "End" ? limits.max : props.value + direction * (event.shiftKey ? 15 : 1), limits));
  }

  const needle = svg("g", null, svg("path", { class: "plot-shape", d: "M160 90V38" }), svg("circle", { class: "plot-point", cx: "160", cy: "38", r: "6" }));
  const dial = svg(
    "svg",
    {
      class: "direction plot-surface",
      viewBox: "0 0 320 180",
      role: "slider",
      tabindex: "0",
      "aria-label": "Rotation dial",
      "aria-description": "Click or drag to rotate. Arrow keys adjust by one degree; Shift uses 15 degrees. Escape restores the starting rotation.",
      on: { pointerdown: start, pointermove: drag, pointerup: finish, pointercancel: finish, lostpointercapture: finish, blur: finish, keydown: nudge },
    },
    dialMarks(),
    needle,
    svg("circle", { cx: "160", cy: "90", r: "3", fill: "var(--_plot-value)" }),
  );
  const field = createNumberField({
    label: "Rotation (degrees)",
    value: props.value,
    onInput: (value) => setModel(value),
    limits: props.bounds,
    onLimitsInput: (bounds) => setBounds(bounds),
    step: 1,
  });
  const readout = h("output", { class: "readout" });
  const panel = createGraphicPanel({ content: dial, fields: field.element });
  const element = h(
    "section",
    { class: "baza-angle-control", "aria-label": "Angle and direction" },
    h("h2", null, "Angle & direction"),
    h("p", null, "Click or drag the dial, or enter an exact rotation."),
    panel.element,
    readout,
    h("p", { class: "note" }, " Zero points up; positive turns clockwise. Shift snaps to 15°. Full turns are retained. "),
  );

  const render = renderer(draw);
  function draw() {
    const value = props.value;
    const limits = effective();
    const orientation = ((value % 360) + 360) % 360;
    toggle(dial, "dragging", pointer !== null);
    attr(dial, "aria-valuemin", limits.min);
    attr(dial, "aria-valuemax", limits.max);
    attr(dial, "aria-valuenow", value);
    attr(dial, "aria-valuetext", `${value} degrees; orientation ${orientation} degrees`);
    attr(needle, "transform", `rotate(${value % 360} 160 90)`);
    field.update({ value, limits: props.bounds });
    text(readout, `${value}° stored · orientation ${orientation}°`);
  }
  function apply(partial) {
    props = { ...props, ...partial };
    if (rendered) render();
  }

  render();
  rendered = ready = true;
  return {
    element,
    update(partial) {
      apply(checkProps("AngleControl", SPEC, partial, props));
    },
    destroy() {
      finish();
      field.destroy();
    },
  };
}
