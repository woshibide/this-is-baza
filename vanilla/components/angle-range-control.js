// Clockwise allowed interval as {start: 0..359, sweep: 0..360}, in whole degrees.
import { checkProps, modelSetter, h, svg, attr, toggle, text, listen, renderer } from "../dom.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { createNumberField } from "./number-field.js";
import { angleAtPoint, rotationAtAngle } from "../../src/lib/angle.js";
import { anglePoint, angleRangeArc, moveAngleRange, wrapDegrees } from "../../src/lib/angle-range.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
};
const PARTS = ["start", "end"];

export function createAngleRangeControl(given) {
  let props = checkProps("AngleRangeControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }), () => ready);
  const end = () => wrapDegrees(props.value.start + props.value.sweep);
  const handlePoints = () => {
    const near = Math.min(props.value.sweep, 360 - props.value.sweep) < 30;
    return { start: anglePoint(props.value.start, near ? 24 : 52), end: anglePoint(end()) };
  };
  let pointer = null;
  let gesture = null;
  let stopBlur = null;

  function setEndpoint(part, value) {
    const start = part === "start" ? value : props.value.start;
    const finish = part === "end" ? value : end();
    const sweep = wrapDegrees(finish - start);
    setModel({ start, sweep: sweep === 0 && props.value.sweep === 360 ? 360 : sweep });
  }
  function pointerAngle(event) {
    const matrix = dial.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return angleAtPoint(point.x - 160, point.y - 90);
  }
  function start(event, part) {
    if (event.button !== 0 || event.isPrimary === false || pointer !== null) return;
    const angle = pointerAngle(event);
    if (angle === null) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    gesture = { part, initial: { ...props.value }, angle, rotation: angle };
    pointer = event.pointerId;
    render();
    dial.setPointerCapture(event.pointerId);
    stopBlur = listen(window, "blur", finish);
  }
  function drag(event) {
    if (event.pointerId !== pointer || !gesture) return;
    event.preventDefault();
    gesture.rotation = rotationAtAngle(gesture.rotation, pointerAngle(event), { min: -Infinity, max: Infinity }, 0.001);
    const step = event.shiftKey ? 15 : 1;
    const delta = Math.round((gesture.rotation - gesture.angle) / step) * step;
    setModel(moveAngleRange(gesture.initial, gesture.part, delta));
  }
  function finish(event) {
    if (event?.pointerId !== undefined && event.pointerId !== pointer) return;
    const id = pointer;
    pointer = null;
    gesture = null;
    stopBlur?.();
    stopBlur = null;
    if (id !== null && dial.hasPointerCapture(id)) dial.releasePointerCapture(id);
    render();
  }
  function cancel(event) {
    if (!gesture) return;
    event.preventDefault();
    setModel(gesture.initial);
    finish();
  }
  function nudge(event, part) {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!direction && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (direction) setModel(moveAngleRange(props.value, part, direction * (event.shiftKey ? 15 : 1)));
    else if (part === "band") setModel({ ...props.value, start: event.key === "Home" ? 0 : 359 });
    else {
      const sweep = event.key === "Home" ? 0 : 360;
      setModel(moveAngleRange(props.value, part, (sweep - props.value.sweep) * (part === "start" ? -1 : 1)));
    }
  }

  const sector = svg("path", { class: "sector" });
  const arc = svg("path", { class: "arc" });
  const bandHit = svg("path", { class: "band-hit" });
  const band = svg(
    "g",
    {
      class: "band",
      role: "slider",
      tabindex: "0",
      "aria-label": "Rotate angle interval",
      "aria-valuemin": 0,
      "aria-valuemax": 359,
      "aria-description": "Drag or use arrow keys to rotate the whole interval. Shift adjusts by 15 degrees.",
      on: { pointerdown: (event) => start(event, "band"), keydown: (event) => nudge(event, "band"), blur: finish },
    },
    sector,
    arc,
    bandHit,
    svg("circle", { class: "focus-ring", cx: "160", cy: "90", r: "9" }),
  );
  const handles = PARTS.map((part) => {
    const line = svg("path", { class: "plot-shape" });
    const circles = ["handle-hit", "focus-ring", "handle-mark"].map((name, i) => svg("circle", { class: name, r: [14, 10, 6][i] }));
    const element = svg(
      "g",
      {
        class: `handle handle-${part}`,
        role: "slider",
        tabindex: "0",
        "aria-label": `${part === "start" ? "Start" : "End"} angle handle`,
        "aria-description": "Arrow keys adjust one degree; Shift adjusts 15. Home closes the interval; End allows a full turn. Escape cancels a drag.",
        on: { pointerdown: (event) => start(event, part), keydown: (event) => nudge(event, part), blur: finish },
      },
      line,
      circles,
    );
    return { part, element, line, circles };
  });
  const dial = svg(
    "svg",
    {
      class: "angle-range plot-surface",
      viewBox: "0 0 320 180",
      role: "group",
      "aria-label": "Allowed angle interval dial",
      on: { pointermove: drag, pointerup: finish, pointercancel: finish, lostpointercapture: finish, keydown: (event) => event.key === "Escape" && cancel(event) },
    },
    svg("path", { class: "plot-grid", d: "M160 26V154M88 90H232" }),
    svg("circle", { class: "plot-axis", cx: "160", cy: "90", r: "52" }),
    Array.from({ length: 24 }, (_, i) =>
      svg("path", { class: "plot-grid", d: (i + 1) % 6 === 1 ? "M160 32V44" : "M160 35V39", transform: `rotate(${i * 15} 160 90)` }),
    ),
    svg("text", { class: "plot-label", x: "160", y: "17", "text-anchor": "middle" }, "0°"),
    svg("text", { class: "plot-label", x: "242", y: "94" }, "90°"),
    svg("text", { class: "plot-label", x: "160", y: "170", "text-anchor": "middle" }, "180°"),
    svg("text", { class: "plot-label", x: "77", y: "94", "text-anchor": "end" }, "270°"),
    band,
    handles.map((handle) => handle.element),
    svg("circle", { cx: "160", cy: "90", r: "3", fill: "var(--_plot-value)", "pointer-events": "none" }),
  );
  const startField = createNumberField({ label: "Start (°)", value: props.value.start, min: 0, max: 359, step: 1, onInput: (value) => setEndpoint("start", value) });
  const endField = createNumberField({ label: "End (°)", value: end(), min: 0, max: 359, step: 1, onInput: (value) => setEndpoint("end", value) });
  const sweepField = createNumberField({ label: "Allowed (°)", value: props.value.sweep, min: 0, max: 360, step: 1, onInput: (value) => setModel({ ...props.value, sweep: value }) });
  const readout = h("output", { class: "readout" });
  const panel = createGraphicPanel({
    content: dial,
    fields: h("div", { class: "fields" }, startField.element, endField.element, sweepField.element),
  });
  const element = h(
    "section",
    { class: "baza-angle-range-control", "aria-label": "Angle interval" },
    h("h2", null, "Angle interval"),
    h("p", null, "Drag either endpoint to set the allowed arc, or drag the arc to rotate it."),
    panel.element,
    readout,
    h("p", { class: "note" }, "Zero points up; angles run clockwise and can cross 0°. Hollow handle: start. Solid handle: end. Shift adjusts by 15°."),
  );

  const render = renderer(draw);
  function draw() {
    const { start, sweep } = props.value;
    const finishAt = end();
    const path = angleRangeArc(start, sweep);
    const points = handlePoints();
    toggle(dial, "dragging", pointer !== null);
    attr(band, "aria-valuenow", start);
    attr(band, "aria-valuetext", `${start} to ${finishAt} degrees clockwise; ${sweep} degrees allowed`);
    attr(sector, "d", `${path} L160 90 Z`);
    attr(arc, "d", path);
    attr(bandHit, "d", path);
    for (const { part, element, line, circles } of handles) {
      const p = points[part];
      attr(element, "aria-valuemin", part === "start" ? start + sweep - 360 : start);
      attr(element, "aria-valuemax", part === "start" ? start + sweep : start + 360);
      attr(element, "aria-valuenow", part === "start" ? start : start + sweep);
      attr(element, "aria-valuetext", `${part === "start" ? start : finishAt} degrees; ${sweep} degrees allowed clockwise`);
      attr(line, "d", `M160 90 L${p.x} ${p.y}`);
      for (const circle of circles) {
        attr(circle, "cx", p.x);
        attr(circle, "cy", p.y);
      }
    }
    startField.update({ value: start });
    endField.update({ value: finishAt });
    sweepField.update({ value: sweep });
    text(readout, `${start}° → ${finishAt}° clockwise · ${sweep}° allowed`);
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
      apply(checkProps("AngleRangeControl", SPEC, partial, props));
    },
    destroy() {
      finish();
      [startField, endField, sweepField].forEach((field) => field.destroy());
    },
  };
}
