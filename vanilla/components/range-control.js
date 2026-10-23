// Ordered numeric bounds as {min,max}; drag the band to translate both bounds, or either end to resize; crossing clamps.
import { checkProps, modelSetter, h, attr, style, text, children, renderer } from "../dom.js";
import { createLimitsEditor } from "./limits-editor.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { effectiveLimits, displayLimits, clampToLimits, moveInterval } from "../../src/lib/numeric-limits.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ min: 0, max: 100 }) },
  onBoundsInput: { type: Function },
};
const ENDS = ["min", "max"];

export function createRangeControl(given) {
  let props = checkProps("RangeControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => apply({ bounds }), () => ready);
  const effective = () => effectiveLimits(props.bounds);
  const scale = () => displayLimits(props.bounds, [props.value.min, props.value.max]);
  const percent = (value) => {
    const { min, max } = scale();
    return ((value - min) / (max - min)) * 100;
  };
  let activeDrag = null;

  function move(part, delta, initial = props.value) {
    setModel(moveInterval(initial, part, delta, effective()));
  }
  function startDrag(event, part) {
    if (event.button !== 0 || activeDrag) return;
    event.preventDefault();
    event.currentTarget.focus();
    const { min, max } = scale();
    activeDrag = {
      part,
      pointerId: event.pointerId,
      x: event.clientX,
      width: track.getBoundingClientRect().width,
      initial: { ...props.value },
      span: max - min,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function drag(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const { part, x, width, initial, span } = activeDrag;
    move(part, Math.round(((event.clientX - x) / width) * span), initial);
  }
  function stopDrag(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    activeDrag = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function nudge(event, part) {
    const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const delta =
      event.key === "Home"
        ? scale().min - props.value[part === "band" ? "min" : part]
        : event.key === "End"
          ? scale().max - props.value[part === "band" ? "max" : part]
          : direction * (event.shiftKey ? 5 : 1);
    move(part, delta);
  }
  const dragEvents = (part) => ({
    pointerdown: (event) => startDrag(event, part),
    pointermove: drag,
    pointerup: stopDrag,
    pointercancel: stopDrag,
    lostpointercapture: stopDrag,
    keydown: (event) => nudge(event, part),
  });

  const combined = h("span", { class: "range-value", "aria-hidden": "true" });
  const values = ENDS.map(() => h("span", { class: "range-value", "aria-hidden": "true" }));
  const band = h("button", { class: "range-band", "aria-label": "Move entire interval", on: dragEvents("band") });
  const handles = ENDS.map((end) =>
    h("button", { class: "range-handle", role: "slider", "aria-label": end === "min" ? "Minimum bound" : "Maximum bound", on: dragEvents(end) }),
  );
  const track = h("div", { class: "range-track" });
  const editor = createLimitsEditor({
    value: props.bounds,
    onInput: (bounds) => setBounds(bounds),
    label: "Interval",
    layout: "rail",
    integer: true,
    content: track,
  });
  const readout = h("output", { class: "readout range-readout" });
  const panel = createGraphicPanel({ content: editor.element, footer: readout });
  const element = h(
    "section",
    { class: "baza-range-control", "aria-label": "Range and interval" },
    h("h2", null, "Range & interval"),
    h("p", null, "Maps 0–100% to pixel values in both motion previews."),
    panel.element,
  );

  const render = renderer(draw);
  function draw() {
    const { min, max } = props.value;
    const limits = effective();
    const close = percent(max) - percent(min) < 40;
    if (close) {
      style(combined, "left", `clamp(48px, ${(percent(min) + percent(max)) / 2}%, calc(100% - 48px))`);
      text(combined, `${min === max ? min : `${min}–${max}`} px`);
    } else {
      ENDS.forEach((end, i) => {
        style(values[i], "left", `clamp(24px, ${percent(props.value[end])}%, calc(100% - 24px))`);
        text(values[i], `${props.value[end]} px`);
      });
    }
    style(band, "left", percent(min) + "%");
    style(band, "width", percent(max) - percent(min) + "%");
    ENDS.forEach((end, i) => {
      attr(handles[i], "aria-valuemin", end === "min" ? limits.min : min);
      attr(handles[i], "aria-valuemax", end === "min" ? max : limits.max);
      attr(handles[i], "aria-valuenow", props.value[end]);
      attr(handles[i], "aria-valuetext", props.value[end] + " pixels");
      style(handles[i], "left", percent(props.value[end]) + "%");
    });
    children(track, [close ? combined : values, band, handles]);
    text(readout, `${min}–${max} px`);
    editor.update({ value: props.bounds });
  }
  // Mirrors the Vue component's watch on the effective bounds: new bounds clamp both ends.
  function apply(partial) {
    const before = props;
    props = { ...props, ...partial };
    if (rendered) render();
    if (before.bounds !== props.bounds) clampEnds();
  }
  function clampEnds() {
    const limits = effective();
    setModel({ min: clampToLimits(props.value.min, limits), max: clampToLimits(props.value.max, limits) });
  }

  clampEnds();
  render();
  rendered = ready = true;
  return {
    element,
    update(partial) {
      apply(checkProps("RangeControl", SPEC, partial, props));
    },
    destroy() {
      editor.destroy();
    },
  };
}
