// Slider: Baza's control for one number. Drag the number, step with the -/+ buttons, or type an
// exact value; all three share the editable bounds (null removes a custom bound). This is what
// "slider" means in Baza: never a native <input type="range"> track.
import { checkProps, modelSetter, h, attr, prop, text, children } from "../dom.js";
import { createNumberField } from "./number-field.js";
import { createIcon } from "./icon.js";
import { effectiveLimits, clampToLimits, SAFE_MIN, SAFE_MAX } from "../../src/lib/numeric-limits.js";

const SPEC = {
  value: { type: Number, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ min: 1, max: 24 }) },
  onBoundsInput: { type: Function },
  label: { type: String, default: "Copies" },
  heading: { type: String, default: "" }, // gallery heading and hint; omit inside a panel
  min: { type: Number, default: SAFE_MIN }, // intrinsic domain; bounds stay within it
  max: { type: Number, default: SAFE_MAX },
  step: { type: Number, default: 1 }, // the buttons' increment; fractional steps work too
};

export function createSliderControl(given) {
  let props = checkProps("SliderControl", SPEC, given);
  let ready = false;
  let rendered = false;
  const keep = (partial) => {
    props = { ...props, ...partial };
    if (rendered) render();
  };
  const setValue = modelSetter(given, () => props, "value", (value) => keep({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => keep({ bounds }), () => ready);
  const effective = () => effectiveLimits(props.bounds, props.min, props.max);
  // Steps snap to the step grid so fractional steps never accumulate float error.
  const decimals = () => (String(props.step).split(".")[1] ?? "").length;
  function nudge(direction) {
    const snapped = Math.round(props.value / props.step + direction) * props.step;
    setValue(clampToLimits(Number(snapped.toFixed(decimals())), effective()));
  }

  const decrease = h("button", { on: { click: () => nudge(-1) } }, createIcon({ name: "minus" }).element);
  const increase = h("button", { on: { click: () => nudge(1) } }, createIcon({ name: "plus" }).element);
  const fieldProps = () => ({
    value: props.value,
    limits: props.bounds,
    label: props.label,
    min: props.min,
    max: props.max,
    step: props.step,
  });
  const field = createNumberField({
    ...fieldProps(),
    onInput: (value) => setValue(value),
    onLimitsInput: (bounds) => setBounds(bounds),
    decrease,
    increase,
  });
  const title = h("h2");
  const hint = h("p", null, "Drag the number, step with the buttons, or enter an exact value.");
  const element = h("section", { class: "baza-slider-control" });

  function render() {
    const bounds = effective();
    attr(element, "aria-label", props.heading || props.label);
    text(title, props.heading);
    children(element, [props.heading && title, props.heading && hint, field.element]);
    prop(decrease, "disabled", props.value <= bounds.min);
    attr(decrease, "aria-label", `Decrease ${props.label}`);
    prop(increase, "disabled", props.value >= bounds.max);
    attr(increase, "aria-label", `Increase ${props.label}`);
    field.update(fieldProps());
  }
  render();
  rendered = ready = true;
  return {
    element,
    update(partial) {
      props = checkProps("SliderControl", SPEC, partial, props);
      render();
    },
    destroy() {
      field.destroy();
    },
  };
}
