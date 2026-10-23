// Dimensions as {width,height,locked}. Either field drives proportional resizing.
import { checkProps, modelSetter, h, svg, attr, prop, text } from "../dom.js";
import { effectiveLimits, clampToLimits } from "../../src/lib/numeric-limits.js";
import { createNumberField } from "./number-field.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { clamp } from "../../src/lib/values.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ width: { min: 1, max: 4096 }, height: { min: 1, max: 4096 } }) },
  onBoundsInput: { type: Function },
};
const AXES = ["width", "height"];

export function createDimensionsControl(given) {
  let props = checkProps("DimensionsControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => apply({ bounds }), () => ready);
  const effective = () => ({
    width: effectiveLimits(props.bounds.width, 1),
    height: effectiveLimits(props.bounds.height, 1),
  });
  const previewSize = () => {
    const scale = Math.min(192 / props.value.width, 100 / props.value.height);
    return { width: props.value.width * scale, height: props.value.height * scale };
  };
  function resize(axis, value) {
    const model = props.value;
    const limits = effective();
    const other = axis === "width" ? "height" : "width",
      ratio = model[other] / model[axis];
    const next = model.locked
      ? clamp(value, Math.max(limits[axis].min, limits[other].min / ratio), Math.min(limits[axis].max, limits[other].max / ratio))
      : value;
    setModel({ ...model, [axis]: next, ...(model.locked ? { [other]: next * ratio } : {}) });
  }

  const box = svg("rect", { class: "size-box plot-shape" });
  const widthGroup = svg("g");
  const widthAxis = svg("path", { class: "plot-axis" });
  const widthValue = svg("text", { class: "size-value", y: "-6", "text-anchor": "middle" });
  const widthLabel = svg("text", { class: "plot-label", y: "20", "text-anchor": "middle" }, "Width");
  widthGroup.append(widthAxis, widthValue, widthLabel);
  const heightGroup = svg("g");
  const heightAxis = svg("path", { class: "plot-axis" });
  const heightValue = svg("text", { class: "size-value", x: "10" });
  const heightLabel = svg("text", { class: "plot-label", x: "10" }, "Height");
  heightGroup.append(heightAxis, heightValue, heightLabel);
  const preview = svg(
    "svg",
    { class: "size-preview plot-surface", viewBox: "0 0 400 180", role: "img" },
    svg("path", { class: "plot-grid", d: "M200 16V164M16 80H384" }),
    box,
    widthGroup,
    heightGroup,
  );
  const fields = AXES.map((axis) =>
    createNumberField({
      label: axis === "width" ? "Width (px)" : "Height (px)",
      limits: props.bounds[axis],
      // The Vue component writes the axis limits into its bounds object; the port passes a new object instead.
      onLimitsInput: (limits) => setBounds({ ...props.bounds, [axis]: limits }),
      managedLimits: true,
      limitMin: 1,
      value: +props.value[axis].toFixed(3),
      min: effective()[axis].min,
      max: effective()[axis].max,
      onInput: (value) => resize(axis, value),
    }),
  );
  const lock = h("input", { type: "checkbox", on: { change: (event) => setModel({ ...props.value, locked: event.target.checked }) } });
  const readout = h("output", { class: "readout" });
  const panel = createGraphicPanel({
    content: preview,
    fields: [h("div", { class: "pair" }, fields[0].element, fields[1].element), h("label", { class: "inline aspect-lock" }, lock, "Lock aspect ratio")],
  });
  const element = h(
    "section",
    { class: "baza-dimensions-control", "aria-label": "Linked dimensions" },
    h("h2", null, "Linked dimensions"),
    h("p", null, "Lock the current ratio to resize proportionally."),
    panel.element,
    readout,
  );

  function render() {
    const { width, height } = props.value;
    const w = +width.toFixed(3), hgt = +height.toFixed(3);
    const size = previewSize();
    const limits = effective();
    attr(preview, "aria-label", `Dimensions preview: ${w} by ${hgt} pixels`);
    attr(box, "x", 200 - size.width / 2);
    attr(box, "y", 80 - size.height / 2);
    attr(box, "width", size.width);
    attr(box, "height", size.height);
    attr(widthGroup, "transform", `translate(${200 - size.width / 2} ${80 + size.height / 2 + 22})`);
    attr(widthAxis, "d", `M0 -4V4M0 0H${size.width}M${size.width} -4V4`);
    attr(widthValue, "x", size.width / 2);
    text(widthValue, `${w} px`);
    attr(widthLabel, "x", size.width / 2);
    attr(heightGroup, "transform", `translate(${200 + size.width / 2 + 16} ${80 - size.height / 2})`);
    attr(heightAxis, "d", `M-4 0H4M0 0V${size.height}M-4 ${size.height}H4`);
    attr(heightValue, "y", size.height / 2 - 4);
    text(heightValue, `${hgt} px`);
    attr(heightLabel, "y", size.height / 2 + 14);
    AXES.forEach((axis, i) =>
      fields[i].update({ limits: props.bounds[axis], value: +props.value[axis].toFixed(3), min: limits[axis].min, max: limits[axis].max }),
    );
    prop(lock, "checked", props.value.locked);
    text(readout, `${w} × ${hgt} px · ratio ${(width / height).toFixed(3)}`);
  }
  // Mirrors the Vue component's watch on the effective bounds: new bounds clamp both dimensions.
  function apply(partial) {
    const before = props;
    props = { ...props, ...partial };
    if (rendered) render();
    if (before.bounds !== props.bounds) clampSize();
  }
  function clampSize() {
    const limits = effective();
    setModel({
      ...props.value,
      width: clampToLimits(props.value.width, limits.width),
      height: clampToLimits(props.value.height, limits.height),
    });
  }

  clampSize();
  render();
  rendered = ready = true;
  return {
    element,
    update(partial) {
      apply(checkProps("DimensionsControl", SPEC, partial, props));
    },
    destroy() {
      fields.forEach((field) => field.destroy());
    },
  };
}
