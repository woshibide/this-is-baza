// An ordered array of alpha-aware colors. Selection is local; values flow through value and onInput.
import { checkProps, modelSetter, h, attr, prop, style, text, children, renderer } from "../dom.js";
import { createColorEditor } from "./color-editor.js";
import { createIcon } from "./icon.js";
import { rgba, hexAlpha } from "../../src/lib/values.js";

const SPEC = {
  value: { type: Array, required: true },
  onInput: { type: Function },
};

export function createPaletteControl(given) {
  let props = checkProps("PaletteControl", SPEC, given);
  let selected = 0;
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }));

  function edit(index) {
    selected = index;
    render();
    editor.open();
  }
  function update(color) {
    setModel(props.value.map((entry, i) => (i === selected ? color : entry)));
  }
  function add() {
    if (props.value.length >= 8) return;
    const next = [...props.value, { ...props.value[selected] }];
    setModel(next);
    selected = next.length - 1;
    render();
  }
  function remove() {
    if (props.value.length <= 1) return;
    const next = props.value.filter((_, i) => i !== selected);
    setModel(next);
    selected = Math.min(selected, next.length - 1);
    render();
  }

  const count = h("span", { class: "palette-count" });
  const swatches = h("div", { class: "swatches", role: "group", "aria-label": "Palette colors" });
  const swatchList = [];
  function swatch(i) {
    const color = h("span");
    const code = h("code");
    const opacity = h("small");
    const check = createIcon({ name: "check" }).element;
    check.classList.add("selection-check");
    const element = h(
      "button",
      { class: "swatch", on: { click: () => edit(i) } },
      h("span", { class: "swatch-color checker" }, color),
      h("span", { class: "swatch-label" }, h("span", { class: "swatch-heading" }, code, check), opacity),
    );
    return { element, color, code, opacity };
  }
  const addButton = h("button", { on: { click: add } }, createIcon({ name: "plus" }).element, "Add color");
  const removeButton = h("button", { on: { click: remove } }, " Remove selected ");
  const editor = createColorEditor({ hideTrigger: true, value: props.value[selected], onInput: update });
  const element = h(
    "section",
    { class: "baza-palette-control", "aria-label": "Color and palette" },
    h("div", { class: "palette-heading" }, h("h2", null, "Color & palette"), count),
    swatches,
    h("div", { class: "palette-actions" }, addButton, removeButton),
    editor.element,
  );

  const render = renderer(draw);
  function draw() {
    const colors = props.value;
    text(count, `${colors.length} / 8 colors`);
    while (swatchList.length < colors.length) swatchList.push(swatch(swatchList.length));
    swatchList.length = colors.length;
    colors.forEach((color, i) => {
      const s = swatchList[i];
      attr(s.element, "aria-pressed", String(i === selected));
      attr(s.element, "aria-label", `Color ${i + 1}: ${hexAlpha(color)}`);
      style(s.color, "background", rgba(color));
      text(s.code, color.hex.toUpperCase());
      text(s.opacity, `${Math.round(color.alpha * 100)}% opacity`);
    });
    children(swatches, swatchList.map((s) => s.element));
    prop(addButton, "disabled", colors.length >= 8);
    prop(removeButton, "disabled", colors.length <= 1);
    editor.update({ value: colors[selected] });
  }
  // Like Vue's watch on the length: the selection stays within the palette.
  function apply(partial) {
    props = { ...props, ...partial };
    selected = Math.max(0, Math.min(selected, props.value.length - 1));
    render();
  }

  render();
  return {
    element,
    update(partial) {
      apply(checkProps("PaletteControl", SPEC, partial, props));
    },
    destroy() {
      editor.destroy();
    },
  };
}
