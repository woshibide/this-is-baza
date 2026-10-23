// Numeric value with optional editable limits. min/max are hard domain limits; editable limits are independent. Invalid drafts stay local; Enter/blur restores a valid value.
// decrease and increase take stepper nodes placed on either side of the input.
import { checkProps, modelSetter, uid, h, attr, prop, toggle, style, text, children } from "../dom.js";
import { createLimitsEditor } from "./limits-editor.js";
import { createNumberScrubber, NUMBER_SCRUB_HINT } from "../../src/lib/number-scrub.js";
import { effectiveLimits, clampToLimits, SAFE_MIN, SAFE_MAX } from "../../src/lib/numeric-limits.js";

const SPEC = {
  value: { type: Number, required: true },
  onInput: { type: Function },
  limits: { type: Object },
  onLimitsInput: { type: Function },
  label: { type: String, required: true },
  min: { type: Number, default: SAFE_MIN },
  max: { type: Number, default: SAFE_MAX },
  step: { type: [Number, String], default: "any" },
  disabled: { type: Boolean },
  managedLimits: { type: Boolean },
  limitMin: { type: Number },
  limitMax: { type: Number },
  decrease: { type: [Node, Array] },
  increase: { type: [Node, Array] },
};

export function createNumberField(given) {
  let props = checkProps("NumberField", SPEC, given);
  const id = uid();
  let draft = props.value;
  let invalid = false;
  let editing = false;
  const effective = () => effectiveLimits(props.limits ?? { min: null, max: null }, props.min, props.max);
  const setValue = modelSetter(given, () => props, "value", (value) => apply({ value }));
  const setLimits = modelSetter(given, () => props, "limits", (limits) => apply({ limits }));

  const scrubber = createNumberScrubber({
    read: () => ({ value: props.value, ...effective(), step: props.step, disabled: props.disabled }),
    write: (value) => {
      editing = false;
      invalid = false;
      draft = value;
      setValue(value);
      render();
      // Composite controls can further constrain the accepted value (e.g. aspect lock).
      queueMicrotask(() => {
        draft = props.value;
        render();
      });
    },
    onEnd: (dragged) => {
      if (dragged) queueMicrotask(commit);
    },
  });

  function input(event) {
    editing = true;
    draft = event.target.value;
    invalid = !event.target.validity.valid || !Number.isFinite(event.target.valueAsNumber);
    if (!invalid) setValue(event.target.valueAsNumber);
    render();
  }
  function commit() {
    editing = false;
    draft = props.value;
    invalid = false;
    render();
  }

  const label = h("label", { for: id, class: "field-label" });
  const field = h("input", {
    id,
    name: id,
    autocomplete: "off",
    type: "number",
    class: "number-scrub",
    title: NUMBER_SCRUB_HINT,
    "aria-description": NUMBER_SCRUB_HINT,
    required: true,
  });
  for (const [type, listener] of Object.entries(scrubber.events)) field.addEventListener(type, listener);
  field.addEventListener("focus", () => (editing = true));
  field.addEventListener("input", input);
  field.addEventListener("blur", commit);
  field.addEventListener("change", commit);
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === "Escape") commit();
  });
  const valueControl = h("div", { class: "value-control" });
  const plain = h("div");
  let editor = null;
  const editorProps = () => ({
    value: props.limits,
    label: props.label,
    integer: Number(props.step) === 1,
    hardMin: props.managedLimits ? (props.limitMin ?? SAFE_MIN) : props.min,
    hardMax: props.managedLimits ? (props.limitMax ?? SAFE_MAX) : props.max,
  });
  const element = h("div", { class: "number-field" }, label);

  function render() {
    const bounds = effective();
    text(label, props.label);
    toggle(valueControl, "with-steppers", props.decrease || props.increase);
    children(valueControl, [props.decrease, field, props.increase]);
    toggle(field, "bounded-value", props.limits);
    style(field, "font-size", props.limits && String(props.value).length > 7 ? "12px" : null);
    prop(field, "value", draft);
    attr(field, "min", bounds.min);
    attr(field, "max", bounds.max);
    attr(field, "step", props.step);
    prop(field, "disabled", props.disabled);
    attr(field, "aria-invalid", String(invalid));
    if (props.limits) {
      if (editor) editor.update(editorProps());
      else editor = createLimitsEditor({ ...editorProps(), content: valueControl, onInput: (limits) => setLimits(limits) });
      children(element, [label, editor.element]);
    } else {
      editor?.destroy();
      editor = null;
      children(plain, [valueControl]);
      children(element, [label, plain]);
    }
  }

  // Editable limits clamp the value, except when a parent manages them.
  // On create the owner cannot call update() yet, so the clamped value is also applied here.
  function clampToEffective(creating = false) {
    if (!props.limits || props.managedLimits) return;
    const value = clampToLimits(props.value, effective());
    if (value === props.value) return;
    setValue(value);
    if (creating) apply({ value });
  }
  // Mirrors the Vue component's watchers on the value and on the effective limits.
  function apply(partial) {
    const before = props;
    props = { ...props, ...partial };
    if (!Object.is(before.value, props.value) && !editing) draft = props.value;
    render();
    if (before.limits !== props.limits || before.min !== props.min || before.max !== props.max) clampToEffective();
  }

  render();
  clampToEffective(true);
  return {
    element,
    update(partial) {
      apply(checkProps("NumberField", SPEC, partial, props));
    },
    destroy() {
      scrubber.dispose();
      editor?.destroy();
    },
  };
}
