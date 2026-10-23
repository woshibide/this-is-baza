// Direction and length as {angle: degrees with full turns, length: % of the dial radius, unbounded above}.
import { checkProps, modelSetter, h, svg, attr, toggle, text, children, listen, renderer } from "../dom.js";
import { createNumberField } from "./number-field.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { effectiveLimits, clampToLimits } from "../../src/lib/numeric-limits.js";
import { angleAtPoint, rotationAtAngle } from "../../src/lib/angle.js";
import { alongDirection, dialScale, lengthAfterDrag, pointDistance } from "../../src/lib/vector.js";

// Rest radius in pixels: the dial spans 80% of the 320px height.
const RADIUS = 128;
// Grid lines and the rail extend this far; wider than any panel, so the outer svg clips them.
const SPAN = 1600;
const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ angle: { min: -36000, max: 36000 }, length: { min: 0, max: 200 } }) },
  onBoundsInput: { type: Function },
};

export function createVectorControl(given) {
  let props = checkProps("VectorControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => apply({ bounds }), () => ready);
  const angleLimits = () => effectiveLimits(props.bounds.angle);
  const lengthLimits = () => effectiveLimits(props.bounds.length, 0);
  const orientation = () => ((props.value.angle % 360) + 360) % 360;
  const scale = () => dialScale(props.value.length);
  const rim = () => 160 - RADIUS * scale();
  const point = () => 160 - RADIUS * pointDistance(props.value.length);
  // The dashed rail runs to the upper limit at the current zoom; the outer svg clips it.
  const rail = () => Math.max(-SPAN, Math.min(rim(), 160 - (RADIUS * scale() * lengthLimits().max) / 100));
  // A vector reaching past the rim fades the cardinal label it crosses.
  // Labels follow the shrinking rim but keep their type size.
  const labels = () => {
    const r = RADIUS * scale();
    return [[0, 160, 146 - r], [90, 175 + r, 155], [180, 160, 183 + r], [270, 145 - r, 155]].map(([degrees, x, y]) => ({
      degrees, x, y,
      covered: props.value.length > 100 && Math.abs(((orientation() - degrees + 540) % 360) - 180) < 20,
    }));
  };
  // Two grid levels centered on the dial; halving spacing cycles seamlessly, so zooming out never ends.
  const grid = () => {
    const zoom = -Math.log2(scale());
    const fraction = zoom - Math.floor(zoom);
    const spacing = 64 * 2 ** -fraction;
    return [[0, 1], [spacing / 2, 1 - fraction]].map(([offset, opacity]) => {
      let d = "";
      for (let at = offset; at <= SPAN; at += spacing)
        for (const side of at === 0 ? [0] : [at, -at])
          d += `M${160 + side} 0V320` + (160 + side >= 0 && 160 + side <= 320 ? `M${160 - SPAN} ${160 + side}H${160 + SPAN}` : "");
      return { d, opacity };
    });
  };
  let pointer = null;
  let gesture = null;
  let stopBlur = null;

  function start(event, part) {
    if (event.button !== 0 || event.isPrimary === false || pointer !== null) return;
    event.preventDefault();
    (part === "angle" ? direction : event.currentTarget).focus({ preventScroll: true });
    gesture = { part, initial: { ...props.value } };
    pointer = event.pointerId;
    render();
    dial.setPointerCapture(event.pointerId);
    stopBlur = listen(window, "blur", finish);
    drag(event);
  }
  function drag(event) {
    if (event.pointerId !== pointer || !gesture) return;
    const matrix = frame.getScreenCTM();
    if (!matrix) return;
    event.preventDefault();
    const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    setModel(
      gesture.part === "angle"
        ? { ...props.value, angle: rotationAtAngle(props.value.angle, angleAtPoint(x - 160, y - 160), angleLimits(), event.shiftKey ? 15 : 1) }
        : { ...props.value, length: dragLength(alongDirection((x - 160) / RADIUS, (y - 160) / RADIUS, props.value.angle), event.shiftKey ? 10 : 1) },
    );
  }
  // Relative to where the drag began, so grabbing the point never jumps the value.
  function dragLength(along, step) {
    gesture.along ??= along;
    return lengthAfterDrag(gesture.initial.length, along - gesture.along, lengthLimits(), step);
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
    const step = event.shiftKey ? (part === "angle" ? 15 : 10) : 1;
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!delta && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const limits = part === "angle" ? angleLimits() : lengthLimits();
    const value = event.key === "Home" ? limits.min : event.key === "End" ? limits.max : props.value[part] + delta * step;
    setModel({ ...props.value, [part]: clampToLimits(value, limits) });
  }

  const gridPaths = [0, 1].map(() => svg("path", { class: "plot-grid", "pointer-events": "none" }));
  const zoomed = svg(
    "g",
    { "pointer-events": "none" },
    svg("circle", { class: "plot-axis", cx: "160", cy: "160", r: "128" }),
    Array.from({ length: 24 }, (_, i) =>
      svg("path", { class: "plot-grid", d: (i + 1) % 6 === 1 ? "M160 26V38" : "M160 30V34", transform: `rotate(${i * 15} 160 160)` }),
    ),
  );
  const labelTexts = [0, 90, 180, 270].map((degrees) => svg("text", { class: "plot-label", "text-anchor": "middle", "pointer-events": "none" }, `${degrees}°`));
  const guide = svg("path", { class: "plot-guide" });
  const railHit = svg("path", { class: "rail-hit" });
  const tip = svg("circle", { class: "tip", cx: "160", r: "4" });
  const tipRing = svg("circle", { class: "focus-ring", cx: "160", r: "9" });
  const direction = svg(
    "g",
    {
      class: "direction",
      role: "slider",
      tabindex: "0",
      "aria-label": "Vector direction",
      "aria-description": "Click or drag the dial to rotate. Arrow keys adjust by one degree; Shift uses 15 degrees. Escape cancels a drag.",
      on: { keydown: (event) => nudge(event, "angle"), blur: finish },
    },
    guide,
    railHit,
    tip,
    tipRing,
  );
  const shaft = svg("path", { class: "plot-shape", "pointer-events": "none" });
  const pointCircles = ["length-hit", "focus-ring", "plot-point"].map((name, i) => svg("circle", { class: name, cx: "160", r: [14, 10, 6][i] }));
  const length = svg(
    "g",
    {
      class: "length",
      role: "slider",
      tabindex: "0",
      "aria-label": "Vector length",
      "aria-description": "Drag along the line to change length. Arrow keys adjust by one percent; Shift uses 10. Escape cancels a drag.",
      on: {
        pointerdown: (event) => {
          event.stopPropagation();
          start(event, "length");
        },
        keydown: (event) => nudge(event, "length"),
        blur: finish,
      },
    },
    pointCircles,
  );
  const rotated = svg("g", null, direction, shaft, length);
  // Pixel units with the dial centered horizontally at (160, 160), whatever the panel width.
  const frame = svg(
    "g",
    { transform: "translate(-160 0)" },
    gridPaths,
    zoomed,
    labelTexts,
    rotated,
    svg("circle", { cx: "160", cy: "160", r: "3", fill: "var(--_plot-value)", "pointer-events": "none" }),
  );
  const dial = svg(
    "svg",
    {
      class: "vector plot-surface",
      role: "group",
      "aria-label": "Vector dial",
      on: {
        pointerdown: (event) => start(event, "angle"),
        pointermove: drag,
        pointerup: finish,
        pointercancel: finish,
        lostpointercapture: finish,
        keydown: (event) => event.key === "Escape" && cancel(event),
      },
    },
    svg("svg", { x: "50%", overflow: "visible" }, frame),
  );
  // The Vue component writes each limit into its bounds object; the port passes a new object instead.
  const angleField = createNumberField({
    label: "Rotation (degrees)",
    value: props.value.angle,
    limits: props.bounds.angle,
    onLimitsInput: (limits) => setBounds({ ...props.bounds, angle: limits }),
    step: 1,
    onInput: (value) => setModel({ ...props.value, angle: value }),
  });
  const lengthField = createNumberField({
    label: "Length (%)",
    value: props.value.length,
    limits: props.bounds.length,
    onLimitsInput: (limits) => setBounds({ ...props.bounds, length: limits }),
    min: 0,
    step: 1,
    onInput: (value) => setModel({ ...props.value, length: value }),
  });
  const readout = h("output", { class: "readout" });
  const panel = createGraphicPanel({ content: dial, fields: h("div", { class: "pair" }, angleField.element, lengthField.element) });
  const element = h(
    "section",
    { class: "baza-vector-control", "aria-label": "Vector" },
    h("h2", null, "Vector"),
    h("p", null, "Drag the dial to set direction; drag the point along the line to set length. Past the rim, the dial shrinks to show the length."),
    panel.element,
    readout,
    h(
      "p",
      { class: "note" },
      "Zero points up; positive turns clockwise. Length is a percentage of the dial radius; past 100% the point stays on the outer ring while the dial and grid shrink to 100/length. The dashed line ends at the upper limit. Shift snaps to 15° or 10%. Full turns are retained.",
    ),
  );

  const render = renderer(draw);
  function draw() {
    const { angle } = props.value;
    const al = angleLimits(), ll = lengthLimits();
    toggle(dial, "dragging", pointer !== null);
    grid().forEach((level, i) => {
      attr(gridPaths[i], "d", level.d);
      attr(gridPaths[i], "opacity", level.opacity);
    });
    attr(zoomed, "transform", `translate(160 160) scale(${scale()}) translate(-160 -160)`);
    labels().forEach((label, i) => {
      attr(labelTexts[i], "x", label.x);
      attr(labelTexts[i], "y", label.y);
      attr(labelTexts[i], "opacity", label.covered ? 0.2 : 1);
    });
    attr(rotated, "transform", `rotate(${angle % 360} 160 160)`);
    attr(direction, "aria-valuemin", al.min);
    attr(direction, "aria-valuemax", al.max);
    attr(direction, "aria-valuenow", angle);
    attr(direction, "aria-valuetext", `${angle} degrees; orientation ${orientation()} degrees`);
    attr(guide, "d", `M160 160V${rail()}`);
    attr(railHit, "d", `M160 160V${rail()}`);
    attr(tip, "cy", rim());
    attr(tipRing, "cy", rim());
    attr(shaft, "d", `M160 160V${point()}`);
    attr(length, "aria-valuemin", ll.min);
    attr(length, "aria-valuemax", ll.max);
    attr(length, "aria-valuenow", props.value.length);
    attr(length, "aria-valuetext", `${props.value.length} percent of the dial radius`);
    for (const circle of pointCircles) attr(circle, "cy", point());
    angleField.update({ value: angle, limits: props.bounds.angle });
    lengthField.update({ value: props.value.length, limits: props.bounds.length });
    text(readout, `${angle}° stored · orientation ${orientation()}° · length ${props.value.length}%`);
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
      apply(checkProps("VectorControl", SPEC, partial, props));
    },
    destroy() {
      finish();
      angleField.destroy();
      lengthField.destroy();
    },
  };
}
