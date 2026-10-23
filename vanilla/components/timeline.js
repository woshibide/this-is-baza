// Step timeline: transport, ruler, a step strip proportional to durations, and one playhead.
// Click a step to jump to it and inspect it; double-click it to open its keyframe lanes, which loops it.
// The page owns the clock (createPlayback); this component reads it and reports selection and edits.
// Space plays and pauses, Escape closes an open step, unless a control has focus.
import { checkProps, modelSetter, h, attr, prop, style, text, children, listen, renderer } from "../dom.js";
import { createIcon } from "./icon.js";
import { createKeyframeLane } from "./keyframe-lane.js";
import { clamp } from "../../src/lib/values.js";
import { seconds, stepAt, stepOffsets, ticks } from "../../src/lib/timeline.js";

const SPEC = {
  tracks: { type: Object, required: true },
  onTracksInput: { type: Function },
  // { step, track }: what the inspector shows. track is null for the step itself.
  selection: { type: Object, required: true },
  onSelectionInput: { type: Function },
  // Id of the step whose lanes are open, or null for the overview. The page's playback range loops it.
  expanded: { default: null },
  onExpandedInput: { type: Function },
  steps: { type: Array, required: true },
  durations: { type: Object, required: true },
  playback: { type: Object, required: true },
  disabled: { type: Boolean },
};

export function createTimeline(given) {
  let props = checkProps("Timeline", SPEC, given);
  let ready = false;
  const setTracks = modelSetter(given, () => props, "tracks", (tracks) => apply({ tracks }), () => ready);
  const setSelection = modelSetter(given, () => props, "selection", (selection) => apply({ selection }), () => ready);
  const setExpanded = modelSetter(given, () => props, "expanded", (expanded) => apply({ expanded }), () => ready);

  const offsets = () => stepOffsets(props.steps, props.durations);
  const scene = () => {
    const index = props.steps.findIndex((step) => step.id === props.expanded);
    if (index < 0) return null;
    const step = props.steps[index];
    return { ...step, offset: offsets()[index], duration: props.durations[step.id] };
  };
  function openStep(index, expand) {
    const step = props.steps[index];
    setSelection({ step: step.id, track: null });
    if (expand) setExpanded(step.id);
    props.playback.scrub(offsets()[index]);
  }
  function shortcut(event) {
    if (props.disabled || event.target.closest?.("input, select, textarea, button, summary, [role=slider]")) return;
    if (event.code === "Space") {
      event.preventDefault();
      props.playback.toggle();
    } else if (event.key === "Escape" && props.expanded) setExpanded(null);
  }

  const playIcon = createIcon({ name: "play" });
  const playText = document.createTextNode("");
  const play = h("button", { class: "play", on: { click: () => props.playback.toggle() } }, playIcon.element, playText);
  const restart = h("button", { "aria-label": "Restart", title: "Restart", on: { click: () => props.playback.scrub(props.playback.range.start) } }, createIcon({ name: "reset" }).element);
  const previous = h("button", { "aria-label": "Previous frame", on: { click: () => props.playback.stepFrame(-1) } }, "−1f");
  const next = h("button", { "aria-label": "Next frame", on: { click: () => props.playback.stepFrame(1) } }, "+1f");
  const clockTime = document.createTextNode("");
  const clockRest = h("span");
  const sceneNote = h("p", { class: "scene-note" });
  const buttons = h("div", { class: "transport-buttons" }, play, restart, previous, next);
  const clock = h("output", { class: "clock" }, clockTime, clockRest);
  const transport = h("div", { class: "transport" }, buttons, clock);

  // Ruler ticks are keyed by value, like the Vue v-for.
  const tickNodes = new Map();
  const tickNode = (tick) => {
    if (!tickNodes.has(tick)) tickNodes.set(tick, h("span", { class: "tick", "aria-hidden": "true" }, h("span", null, String(tick))));
    return tickNodes.get(tick);
  };
  const placeTicks = (values, span) =>
    values.map((tick) => {
      const node = tickNode(tick);
      style(node, "left", `${(tick / span) * 100}%`);
      return node;
    });

  const overviewInput = h("input", {
    type: "range",
    "aria-label": "Playhead",
    min: "0",
    on: { input: (event) => props.playback.scrub(event.target.valueAsNumber) },
  });
  const overviewRuler = h("div", { class: "ruler" });
  const stepButtons = new Map();
  const stepButton = (step, index) => {
    if (!stepButtons.has(step.id)) {
      const keyed = document.createTextNode("");
      const time = document.createTextNode("");
      const element = h(
        "button",
        { class: "step", on: { click: () => openStep(index, false), dblclick: () => openStep(index, true) } },
        h("span", { class: "ordinal" }, String(index + 1).padStart(2, "0")),
        h("strong", null, step.name),
        h("small", null, time, keyed),
      );
      stepButtons.set(step.id, { element, time, keyed });
    }
    return stepButtons.get(step.id);
  };
  const playhead = h("span", { class: "playhead", "aria-hidden": "true" });
  const stepsStrip = h("div", { class: "steps", role: "group", "aria-label": "Steps. Double-click a step to edit its keyframes." });
  const overview = h("div", { class: "track" }, overviewRuler, stepsStrip);

  const back = h("button", { class: "back", on: { click: () => setExpanded(null) } }, createIcon({ name: "chevron-left" }).element, "All steps");
  const sceneInput = h("input", {
    type: "range",
    min: "0",
    on: { input: (event) => props.playback.scrub(scene().offset + event.target.valueAsNumber) },
  });
  const sceneRuler = h("div", { class: "ruler" });
  const sceneHead = h("div", { class: "scene-head" }, back, sceneRuler);
  const sceneTrack = h("div", { class: "track scene" }, sceneHead);
  const empty = h("p", { class: "empty" });
  // Lanes are keyed by step and track id; the Vue component writes lane edits into its tracks object, the port emits new tracks.
  const lanes = new Map();
  const laneFor = (current, spec) => {
    const key = `${current.id}/${spec.id}`;
    if (!lanes.has(key))
      lanes.set(
        key,
        createKeyframeLane({
          value: props.tracks[current.id][spec.id],
          onInput: (track) => setTracks({ ...props.tracks, [current.id]: { ...props.tracks[current.id], [spec.id]: track } }),
          label: spec.name,
          number: 1,
          duration: current.duration,
          time: 0,
          onSelect: () => setSelection({ step: current.id, track: spec.id }),
          onScrub: (time) => props.playback.scrub(scene().offset + time),
        }),
      );
    return lanes.get(key);
  };

  const element = h("section", { class: "timeline", "aria-label": "Timeline" }, transport);
  const stopShortcut = listen(window, "keydown", shortcut);
  const stopPlayback = props.playback.subscribe(() => render());

  const render = renderer(draw);
  function draw() {
    const { playback, steps, durations, disabled } = props;
    const time = playback.time;
    const total = playback.total;
    const range = playback.range;
    const fps = playback.fps;
    const open = scene();
    attr(play, "aria-label", playback.playing ? "Pause" : "Play");
    prop(play, "disabled", disabled);
    playIcon.update({ name: playback.playing ? "pause" : "play" });
    text(playText, playback.playing ? "Pause" : "Play");
    prop(restart, "disabled", disabled);
    prop(previous, "disabled", disabled || time <= range.start);
    prop(next, "disabled", disabled || time >= range.end);
    text(clockTime, `${time.toFixed(2)} `);
    text(clockRest, `/ ${total.toFixed(2)} s · frame ${Math.round(time * fps)}`);
    if (open) text(sceneNote, `Playback loops ${open.name}`);
    children(transport, [buttons, clock, open && sceneNote]);

    if (!open) {
      const current = stepAt(steps, durations, time);
      attr(overviewInput, "aria-valuetext", `${time.toFixed(2)} seconds, ${steps[current.index].name}`);
      attr(overviewInput, "max", total);
      attr(overviewInput, "step", 1 / fps);
      prop(overviewInput, "value", time);
      prop(overviewInput, "disabled", disabled);
      children(overviewRuler, [placeTicks(ticks(total, [1, 2, 5, 10, 30, 60]), total), overviewInput]);
      const stepNodes = steps.map((step, index) => {
        const button = stepButton(step, index);
        style(button.element, "flex-grow", durations[step.id]);
        attr(button.element, "aria-pressed", String(props.selection.step === step.id && !props.selection.track));
        attr(button.element, "aria-current", current.index === index ? "step" : null);
        attr(button.element, "aria-label", step.tracks.length ? `${step.name}. Double-click to edit keyframes.` : step.name);
        attr(button.element, "title", step.tracks.length ? `${step.name} · double-click to edit keyframes` : step.name);
        prop(button.element, "disabled", disabled);
        text(button.time, `${seconds(durations[step.id])} s`);
        text(button.keyed, step.tracks.length ? ` · ${step.tracks.length} keyed` : "");
        return button.element;
      });
      style(playhead, "left", `${(time / total) * 100}%`);
      children(stepsStrip, [stepNodes, playhead]);
    } else {
      const local = time - open.offset;
      prop(back, "disabled", disabled);
      attr(sceneInput, "aria-label", `${open.name} playhead`);
      attr(sceneInput, "aria-valuetext", `${local.toFixed(2)} seconds into ${open.name}`);
      attr(sceneInput, "max", open.duration);
      attr(sceneInput, "step", 1 / fps);
      prop(sceneInput, "value", clamp(local, 0, open.duration));
      prop(sceneInput, "disabled", disabled);
      children(sceneRuler, [placeTicks(ticks(open.duration, [0.25, 0.5, 1, 2, 5, 10]), open.duration), sceneInput]);
      const shown = open.tracks.map((spec, index) => {
        const lane = laneFor(open, spec);
        lane.update({
          value: props.tracks[open.id][spec.id],
          label: spec.name,
          number: index + 1,
          duration: open.duration,
          time: local,
          selected: props.selection.track === spec.id,
          disabled,
        });
        return lane.element;
      });
      for (const [key, lane] of lanes)
        if (!key.startsWith(`${open.id}/`)) {
          lane.destroy();
          lanes.delete(key);
        }
      if (!open.tracks.length) text(empty, `${open.name} has no keyframed elements.`);
      children(sceneTrack, [sceneHead, shown, !open.tracks.length && empty]);
    }
    if (!open)
      for (const [key, lane] of lanes) {
        lane.destroy();
        lanes.delete(key);
      }
    children(element, [transport, open ? sceneTrack : overview]);
  }
  function apply(partial) {
    props = { ...props, ...partial };
    render();
  }

  render();
  ready = true;
  return {
    element,
    update(partial) {
      apply(checkProps("Timeline", SPEC, partial, props));
    },
    destroy() {
      stopShortcut();
      stopPlayback();
      for (const lane of lanes.values()) lane.destroy();
    },
  };
}
