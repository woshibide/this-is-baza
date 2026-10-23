// Shared by both fixture pages: reads ?case=&theme=, logs model updates and events for the parity runner.
import { cases } from "./cases.js";
import { playRange, sequenceDuration } from "../../src/lib/timeline.js";

export const params = new URLSearchParams(location.search);
export const fixture = cases[params.get("case")];
if (!fixture) throw new Error(`Unknown parity case "${params.get("case")}".`);
const theme = document.getElementById("theme");
theme.dataset.uiTheme = params.get("theme") ?? "light";
const stage = document.getElementById("stage");
if (fixture.width) stage.style.setProperty("--stage-width", `${fixture.width}px`);
// Room below the control for popovers, which the stage screenshot would otherwise crop.
if (fixture.pad) stage.style.paddingBottom = `${fixture.pad}px`;

// A manual animation clock, so playback advances only on `frames` steps and recordings stay deterministic.
if (fixture.playback) {
  let queue = [];
  let id = 0;
  let now = 1000;
  // The runner still waits for real frames between steps.
  window.__realAnimationFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    queue.push({ id: ++id, callback });
    return id;
  };
  window.cancelAnimationFrame = (handle) => {
    queue = queue.filter((entry) => entry.id !== handle);
  };
  window.__frames = (durations) => {
    for (const ms of durations) {
      now += ms;
      const due = queue;
      queue = [];
      for (const { callback } of due) callback(now);
    }
  };
}
// The playback functions a page would pass, read from the case's steps and current models.
export function playbackOptions(models) {
  const steps = fixture.props.steps;
  const durations = () => models().durations ?? fixture.props.durations;
  return {
    total: () => sequenceDuration(steps, durations()),
    range: () => playRange(steps, durations(), models().expanded ?? null),
    fps: () => 30,
  };
}

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
