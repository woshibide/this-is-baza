import { fixture, clone, log, kebab, handlerName, buildSpec, playbackOptions } from "./fixture-common.js";
import { createPlayback } from "../../vanilla/playback.js";
import { modelCallback } from "../../vanilla/dom.js";

const module = await import(`../../vanilla/components/${kebab(fixture.component)}.js`);
const create = module[`create${fixture.component}`];
const state = clone(fixture.models ?? {});
window.__parity.models = () => clone(state);
const element = (tag, attrs, kids) => {
  const svgTags = ["svg", "path", "circle", "line", "rect", "g", "polyline"];
  const node = svgTags.includes(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...kids);
  return node;
};
const slots = Object.fromEntries(
  Object.entries(fixture.slots ?? {}).map(([name, specs]) => [
    name === "default" ? "content" : name,
    specs.map((spec) => buildSpec(spec, element)),
  ]),
);
const playback = fixture.playback ? createPlayback(playbackOptions(() => state)) : null;
window.__parity.playback = playback;
let control = null;
control = create({
  ...fixture.props,
  ...(playback && { playback }),
  ...clone(fixture.local ?? {}),
  ...slots,
  ...Object.fromEntries(
    Object.keys(fixture.models ?? {}).flatMap((name) => [
      [name, clone(fixture.models[name])],
      [modelCallback(name), (value) => {
        log.push({ type: "model", name, value: clone(value) });
        state[name] = value;
        control?.update({ [name]: value });
        // Vue's watch on total and the reactive range; the page tells its playback what changed.
        playback?.refresh();
      }],
    ]),
  ),
  ...Object.fromEntries(
    (fixture.events ?? []).map((event) => [
      handlerName(event),
      (...args) => log.push({ type: "event", name: event, args: clone(args) }),
    ]),
  ),
});
document.getElementById("root").append(control.element);
window.__parity.control = control;
window.__parity.setProps = (partial) => control.update(partial);
document.documentElement.dataset.ready = "true";
