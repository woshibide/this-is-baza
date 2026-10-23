// One keyframed element: drag the clip to move it, or its start and end keyframes to retime it.
// The clip draws the element's ease. Arrows nudge 0.01 s, Shift 0.1 s; Escape or pointer cancellation restores.
// Click the empty lane to scrub.
import { checkProps, modelSetter, h, svg, attr, prop, toggle, style, text, children, renderer } from "../dom.js";
import { clamp } from "../../src/lib/values.js";
import { moveTrack, seconds } from "../../src/lib/timeline.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  label: { type: String, required: true },
  number: { type: Number, required: true },
  duration: { type: Number, required: true },
  time: { type: Number, required: true }, // step-local; outside 0..duration hides the marker
  selected: { type: Boolean },
  disabled: { type: Boolean },
  onSelect: { type: Function },
  onScrub: { type: Function },
};
const EDGES = ["start", "end"];

export function createKeyframeLane(given) {
  let props = checkProps("KeyframeLane", SPEC, given);
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }));
  const percent = (value) => `${(value / props.duration) * 100}%`;
  // The ease drawn inside the clip, ramp or envelope; y is flipped so the curve rises upward.
  const easePath = () => {
    const points = props.value.ease;
    const at = (p) => `${p.x} ${1 - p.y}`;
    return points.slice(1).reduce((path, point, i) => `${path}C${at(points[i].out)} ${at(point.in)} ${at(point)}`, `M${at(points[0])}`);
  };
  let pointer = null;

  function start(event, handle) {
    if (event.button !== 0) return;
    event.preventDefault();
    props.onSelect?.();
    event.currentTarget.focus({ preventScroll: true });
    pointer = {
      id: event.pointerId,
      target: event.currentTarget,
      x: event.clientX,
      width: lane.getBoundingClientRect().width,
      handle,
      track: { ...props.value },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function drag(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const delta = Math.round(((event.clientX - pointer.x) / pointer.width) * props.duration * 100) / 100;
    setModel(moveTrack(pointer.track, pointer.handle, delta, props.duration));
  }
  function finish(cancel = false) {
    if (!pointer) return;
    const saved = pointer;
    pointer = null;
    if (cancel) setModel(saved.track);
    if (saved.target.hasPointerCapture(saved.id)) saved.target.releasePointerCapture(saved.id);
  }
  function key(event, handle) {
    if (event.key === "Escape" && pointer) {
      event.stopPropagation();
      finish(true);
      return;
    }
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    props.onSelect?.();
    setModel(moveTrack(props.value, handle, (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 0.1 : 0.01), props.duration));
  }
  function scrub(event) {
    if (event.target !== lane) return;
    const box = lane.getBoundingClientRect();
    props.onScrub?.(clamp((event.clientX - box.left) / box.width, 0, 1) * props.duration);
  }
  const gesture = (handle) => ({
    pointerdown: (event) => start(event, handle),
    pointermove: drag,
    pointerup: () => finish(),
    pointercancel: () => finish(true),
    lostpointercapture: () => finish(),
    keydown: (event) => key(event, handle),
  });

  const number = h("span", { class: "lane-number" });
  const name = h("strong");
  const label = h("button", { class: "lane-label", on: { click: () => props.onSelect?.() } }, number, name);
  const ease = svg("path");
  const range = h("small");
  const clip = h(
    "button",
    { class: "clip", on: { click: () => props.onSelect?.(), ...gesture("move") } },
    svg("svg", { class: "ease", viewBox: "0 0 1 1", preserveAspectRatio: "none", "aria-hidden": "true" }, ease),
    range,
  );
  const keyframes = EDGES.map((edge) => h("button", { class: "keyframe", role: "slider", on: gesture(edge) }));
  const marker = h("span", { class: "marker", "aria-hidden": "true" });
  const lane = h("div", { class: "lane", on: { pointerdown: scrub } });
  const element = h("div", { class: "lane-row" }, label, lane);

  const render = renderer(draw);
  function draw() {
    const { value: track, duration, time } = props;
    toggle(element, "selected", props.selected);
    attr(label, "aria-pressed", String(props.selected));
    attr(label, "aria-label", `Select ${props.label}`);
    prop(label, "disabled", props.disabled);
    text(number, String(props.number).padStart(2, "0"));
    text(name, props.label);
    style(clip, "left", percent(track.start));
    style(clip, "width", percent(track.end - track.start));
    attr(clip, "aria-label", `Move ${props.label}`);
    attr(clip, "title", `${props.label}: ${seconds(track.start)}–${seconds(track.end)} s`);
    prop(clip, "disabled", props.disabled);
    attr(ease, "d", easePath());
    text(range, `${seconds(track.start)}–${seconds(track.end)} s`);
    EDGES.forEach((edge, i) => {
      const keyframe = keyframes[i];
      style(keyframe, "left", percent(track[edge]));
      attr(keyframe, "aria-label", `${props.label} ${edge}`);
      attr(keyframe, "aria-valuemin", edge === "start" ? 0 : track.start);
      attr(keyframe, "aria-valuemax", edge === "start" ? track.end : duration);
      attr(keyframe, "aria-valuenow", track[edge]);
      attr(keyframe, "aria-valuetext", `${seconds(track[edge])} seconds`);
      attr(keyframe, "title", `${props.label} ${edge} · ${seconds(track[edge])} s`);
      prop(keyframe, "disabled", props.disabled);
    });
    const visible = time >= 0 && time <= duration;
    if (visible) style(marker, "left", percent(time));
    children(lane, [clip, keyframes, visible && marker]);
  }
  function apply(partial) {
    props = { ...props, ...partial };
    render();
  }

  render();
  return {
    element,
    update(partial) {
      apply(checkProps("KeyframeLane", SPEC, partial, props));
    },
    destroy() {
      finish();
    },
  };
}
