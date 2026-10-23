// Parity cases: one component, its props and models, optional slots, and the interaction steps to replay.
// Models use the vanilla names: "value" is Vue's modelValue. Slots are [tag, attrs, ...children] specs.
// Step kinds are listed in run.mjs perform(); `shot` takes a screenshot after the step.

const ICONS = ["play", "pause", "reset", "plus", "minus", "copy", "check", "sliders", "panel-close", "panel-right-close", "spline", "chevron-left", "download", "x"];

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
};
