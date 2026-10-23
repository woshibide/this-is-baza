// Shared by both fixture pages: reads ?case=&theme=, logs model updates and events for the parity runner.
import { cases } from "./cases.js";

export const params = new URLSearchParams(location.search);
export const fixture = cases[params.get("case")];
if (!fixture) throw new Error(`Unknown parity case "${params.get("case")}".`);
const theme = document.getElementById("theme");
theme.dataset.uiTheme = params.get("theme") ?? "light";
if (fixture.width) document.getElementById("stage").style.setProperty("--stage-width", `${fixture.width}px`);

export const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
export const log = [];
window.__parity = {
  log,
  take: () => log.splice(0),
  models: () => null,
};
export const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
export const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export const handlerName = (event) => `on${camel(event)[0].toUpperCase()}${camel(event).slice(1)}`;
// Slot specs are [tag, attrs, ...children] or text, built by each page with its own renderer.
export function buildSpec(spec, element) {
  if (typeof spec === "string") return spec;
  const [tag, attrs = {}, ...kids] = spec;
  return element(tag, attrs, kids.map((kid) => buildSpec(kid, element)));
}
