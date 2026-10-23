// Limits belong to the control they bound: scalar end caps, rail terminals, XY axes. Layout changes never change the stored limits.
// content takes the bounded control (a node or an array of nodes); without it an axis label shows when `axis` is set.
import { checkProps, modelSetter, h, attr, toggle, text, children, renderer } from "../dom.js";
import { SAFE_MIN, SAFE_MAX } from "../../src/lib/numeric-limits.js";
import { createLimitValue } from "./limit-value.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  label: { type: String, required: true },
  layout: { type: String, default: "scalar" },
  axis: { type: String },
  integer: { type: Boolean },
  hardMin: { type: Number, default: SAFE_MIN },
  hardMax: { type: Number, default: SAFE_MAX },
  content: { type: [Node, Array] },
};

export function createLimitsEditor(given) {
  let props = checkProps("LimitsEditor", SPEC, given);
  const setModel = modelSetter(given, () => props, "value", (value) => {
    props = { ...props, value };
    render();
  });
  const limitProps = () => ({
    value: props.value,
    label: props.label,
    integer: props.integer,
    hardMin: props.hardMin,
    hardMax: props.hardMax,
  });
  const min = createLimitValue({ ...limitProps(), side: "min", onInput: (value) => setModel(value) });
  const max = createLimitValue({ ...limitProps(), side: "max", onInput: (value) => setModel(value) });
  const axisLabel = h("span", { class: "axis-label" });
  const control = h("div", { class: "control" });
  const element = h(
    "div",
    { class: "limits-editor", role: "group" },
    h("div", { class: "end" }, min.element),
    control,
    h("div", { class: "end" }, max.element),
  );
  let layout = null;

  const render = renderer(draw);
  function draw() {
    if (layout !== props.layout) {
      if (layout) element.classList.remove(layout);
      element.classList.add(props.layout);
      layout = props.layout;
    }
    attr(element, "aria-label", `${props.label} limits`);
    min.update(limitProps());
    max.update(limitProps());
    if (props.content) children(control, [props.content]);
    else {
      if (props.axis) text(axisLabel, props.axis);
      children(control, [props.axis ? axisLabel : null]);
    }
  }
  render();
  return {
    element,
    update(partial) {
      props = checkProps("LimitsEditor", SPEC, partial, props);
      render();
    },
    destroy() {
      min.destroy();
      max.destroy();
    },
  };
}
