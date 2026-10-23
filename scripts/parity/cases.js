// Parity cases: one component, its props and models, optional slots, and the interaction steps to replay.
// Models use the vanilla names: "value" is Vue's modelValue. Slots are [tag, attrs, ...children] specs.
// Step kinds are listed in run.mjs perform(); `shot` takes a screenshot after the step.

const ICONS = ["play", "pause", "reset", "plus", "minus", "copy", "check", "sliders", "panel-close", "panel-right-close", "spline", "chevron-left", "download", "x"];

// Shared interactions for any field that commits on Enter and blur.
const typeInto = (selector, text) => [{ click: selector }, { press: "ControlOrMeta+a" }, { type: text }];

export const cases = {
  ...Object.fromEntries(
    ICONS.map((name) => [`Icon.${name}`, { component: "Icon", width: 40, props: { name }, steps: [{ shot: "icon" }] }]),
  ),
  "GraphicPanel.content": {
    component: "GraphicPanel",
    slots: { default: [["svg", { width: "100", height: "40", class: "plot-surface" }]] },
    steps: [{ shot: "content" }],
  },
  "GraphicPanel.flush": {
    component: "GraphicPanel",
    props: { flush: true },
    slots: { default: [["div", { class: "plot-surface", style: "height: 60px" }]] },
    steps: [{ shot: "flush" }],
  },
  "GraphicPanel.all-slots": {
    component: "GraphicPanel",
    slots: {
      default: [["div", { class: "plot-surface", style: "height: 60px" }]],
      footer: [["span", { class: "readout" }, "Readout 42"]],
      fields: [["label", {}, "Exact", ["input", { type: "text", value: "3" }]]],
    },
    steps: [
      { shot: "closed" },
      { click: "summary" },
      { shot: "open" },
      { press: "Tab" },
      { shot: "focused-field" },
      { click: "summary" },
    ],
  },
  "LimitValue.min": {
    component: "LimitValue",
    width: 160,
    pad: 120,
    props: { side: "min", label: "Copies", integer: true },
    models: { value: { min: 1, max: 24 } },
    steps: [
      { shot: "initial" },
      { hover: "input" },
      { shot: "hover" },
      { click: "input" },
      { shot: "focused" },
      { type: "5" },
      { press: "Enter" },
      ...typeInto("input", "30"),
      { press: "Enter" },
      { shot: "error" },
      { press: "Escape" },
      ...typeInto("input", "2.5"),
      { press: "Tab" },
      ...typeInto("input", "-0"),
      { press: "Enter" },
      { shot: "cleared" },
      { drag: "input", by: [40, 0] },
      ...typeInto("input", "3"),
      { press: "Enter" },
      { drag: "input", by: [40, 0] },
      { drag: "input", by: [0, -30] },
      { drag: "input", by: [-30, 0], modifiers: ["Shift"] },
      { drag: "input", by: [60, 0], escape: true },
      { drag: "input", by: [200, 0] },
      { drag: "input", by: [2, 1] },
      { press: "Escape" },
      { press: "Tab" },
    ],
  },
  "LimitValue.max-domain": {
    component: "LimitValue",
    width: 160,
    pad: 120,
    props: { side: "max", label: "Opacity", hardMin: 0, hardMax: 100 },
    models: { value: { min: 0, max: 100 } },
    steps: [
      { click: "input" },
      { shot: "focused-hint" },
      ...typeInto("input", "abc"),
      { press: "Enter" },
      { shot: "invalid" },
      ...typeInto("input", "150"),
      { press: "Enter" },
      { shot: "out-of-domain" },
      ...typeInto("input", "0.25e2"),
      { press: "Enter" },
      { drag: "input", by: [-40, 0], modifiers: ["Alt"] },
      { drag: "input", by: [-400, 0] },
      { drag: "input", by: [30, 0] },
      ...typeInto("input", "−0"),
      { press: "Enter" },
      { shot: "cleared" },
    ],
  },
  "LimitValue.local": {
    component: "LimitValue",
    width: 160,
    props: { side: "min", label: "Local" },
    local: { value: { min: 2, max: 9 } },
    steps: [...typeInto("input", "4"), { press: "Enter" }, { drag: "input", by: [20, 0] }],
  },
};
