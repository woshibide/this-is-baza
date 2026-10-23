import { createApp, h, reactive, ref } from "vue";
import { fixture, clone, log, handlerName, buildSpec } from "./fixture-common.js";

const components = import.meta.glob("../../src/components/*.vue", { import: "default" });
const component = await components[`../../src/components/${fixture.component}.vue`]();
// As in the gallery's main.js, the shared styles load after the components' scoped styles.
await import("../../src/styles.css");
const state = reactive(clone(fixture.models ?? {}));
// Plain props can be changed by `props` steps, as an owner would re-render with new values.
const extra = reactive({ ...fixture.props });
window.__parity.setProps = (partial) => Object.assign(extra, partial);
window.__parity.models = () => clone(state);
const vueName = (name) => (name === "value" ? "modelValue" : name);
const slots = Object.fromEntries(
  Object.entries(fixture.slots ?? {}).map(([name, specs]) => [
    name,
    () => specs.map((spec) => buildSpec(spec, (tag, attrs, kids) => h(tag, attrs, kids))),
  ]),
);
// Exposed methods (defineExpose) are reachable for `call` steps, as on the vanilla control.
const instance = ref(null);
Object.defineProperty(window.__parity, "control", { get: () => instance.value });
createApp({
  render: () =>
    h(
      component,
      {
        ref: instance,
        ...extra,
        // Models without a listener stay local to the component, as when an owner omits v-model.
        ...Object.fromEntries(Object.entries(fixture.local ?? {}).map(([name, value]) => [vueName(name), clone(value)])),
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
