import "../../src/styles.css";
import { createApp, h, reactive } from "vue";
import { fixture, clone, log, handlerName, buildSpec } from "./fixture-common.js";

const components = import.meta.glob("../../src/components/*.vue", { import: "default" });
const component = await components[`../../src/components/${fixture.component}.vue`]();
const state = reactive(clone(fixture.models ?? {}));
window.__parity.models = () => clone(state);
const vueName = (name) => (name === "value" ? "modelValue" : name);
const slots = Object.fromEntries(
  Object.entries(fixture.slots ?? {}).map(([name, specs]) => [
    name,
    () => specs.map((spec) => buildSpec(spec, (tag, attrs, kids) => h(tag, attrs, kids))),
  ]),
);
createApp({
  render: () =>
    h(
      component,
      {
        ...fixture.props,
        ...Object.fromEntries(
          Object.keys(fixture.models ?? {}).flatMap((name) => [
            [vueName(name), state[name]],
            [`onUpdate:${vueName(name)}`, (value) => {
              log.push({ type: "model", name, value: clone(value) });
              state[name] = value;
            }],
          ]),
        ),
        ...Object.fromEntries(
          (fixture.events ?? []).map((event) => [
            handlerName(event),
            (...args) => log.push({ type: "event", name: event, args: clone(args) }),
          ]),
        ),
      },
      slots,
    ),
}).mount("#root");
document.documentElement.dataset.ready = "true";
