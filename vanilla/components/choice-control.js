// Discrete values as one object: {align,shape,fill}. Radio names are unique per component instance.
import { checkProps, modelSetter, uid, h, prop, renderer } from "../dom.js";
import { createIcon } from "./icon.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
};
const ALIGNMENTS = ["left", "center", "right"];

export function createChoiceControl(given) {
  let props = checkProps("ChoiceControl", SPEC, given);
  const group = uid();
  const setModel = modelSetter(given, () => props, "value", (value) => {
    props = { ...props, value };
    render();
  });
  const check = () => {
    const icon = createIcon({ name: "check" }).element;
    icon.classList.add("selection-check");
    return icon;
  };
  const radios = ALIGNMENTS.map((alignment) =>
    h("input", {
      type: "radio",
      name: group,
      value: alignment,
      on: { change: () => setModel({ ...props.value, align: alignment }) },
    }),
  );
  const shape = h(
    "select",
    { on: { change: (event) => setModel({ ...props.value, shape: event.target.value }) } },
    h("option", { value: "circle" }, "Circle"),
    h("option", { value: "square" }, "Square"),
  );
  const fill = h("input", {
    type: "checkbox",
    on: { change: (event) => setModel({ ...props.value, fill: event.target.checked }) },
  });
  const element = h(
    "section",
    { "aria-label": "Choices and toggles" },
    h("h2", null, "Choices & toggles"),
    h("p", null, "One choice, a mode, and an independent boolean."),
    h(
      "fieldset",
      null,
      h("legend", null, "Alignment"),
      h(
        "div",
        { class: "segmented" },
        ALIGNMENTS.map((alignment, i) =>
          h("label", null, radios[i], h("span", null, check(), alignment[0].toUpperCase() + alignment.slice(1))),
        ),
      ),
    ),
    h("div", { class: "pair" }, h("label", null, "Shape", shape), h("label", { class: "inline" }, fill, "Fill shape")),
  );

  const render = renderer(draw);
  function draw() {
    radios.forEach((radio, i) => prop(radio, "checked", props.value.align === ALIGNMENTS[i]));
    prop(shape, "value", props.value.shape);
    prop(fill, "checked", props.value.fill);
  }
  render();
  return {
    element,
    update(partial) {
      props = checkProps("ChoiceControl", SPEC, partial, props);
      render();
    },
    destroy() {},
  };
}
