// Inspector: the controls of whatever is selected in the timeline, in the workspace's right panel.
// A step shows its duration and keyframed elements; an element shows its keyframes, ease, and params.
// It reads the page's playback engine for the ease preview instead of running its own clock.
// Where the Vue component writes into the selected track in place, the port emits new tracks through onTracksInput.
import { checkProps, modelSetter, h, attr, prop, text, children, renderer } from "../dom.js";
import { createNumberField } from "./number-field.js";
import { createSliderControl } from "./slider-control.js";
import { createBezierControl } from "./bezier-control.js";
import { createPositionControl } from "./position-control.js";
import { createIcon } from "./icon.js";
import { clamp } from "../../src/lib/values.js";
import { CURVES, ramp, scaleTracks, seconds, stepAt, stepOffsets, trackValue } from "../../src/lib/timeline.js";

const SPEC = {
  selection: { type: Object, required: true },
  onSelectionInput: { type: Function },
  durations: { type: Object, required: true },
  onDurationsInput: { type: Function },
  tracks: { type: Object, required: true },
  onTracksInput: { type: Function },
  limits: { type: Object, required: true },
  onLimitsInput: { type: Function },
  steps: { type: Array, required: true },
  playback: { type: Object, required: true },
  closable: { type: Boolean },
  disabled: { type: Boolean },
  onClose: { type: Function },
};

export function createInspector(given) {
  let props = checkProps("Inspector", SPEC, given);
  let ready = false;
  const setSelection = modelSetter(given, () => props, "selection", (selection) => apply({ selection }), () => ready);
  const setDurations = modelSetter(given, () => props, "durations", (durations) => apply({ durations }), () => ready);
  const setTracks = modelSetter(given, () => props, "tracks", (tracks) => apply({ tracks }), () => ready);
  const setLimits = modelSetter(given, () => props, "limits", (limits) => apply({ limits }), () => ready);

  const index = () => Math.max(0, props.steps.findIndex((s) => s.id === props.selection.step));
  const step = () => props.steps[index()];
  const offset = () => stepOffsets(props.steps, props.durations)[index()];
  const specs = () => step().tracks;
  const spec = () => specs().find((s) => s.id === props.selection.track) ?? null;
  const track = () => (spec() ? props.tracks[step().id][spec().id] : null);
  const params = () => Object.entries(spec()?.params ?? {});
  const progress = () => trackValue(track(), props.playback.time - offset()).progress;
  const outputRange = () => spec().range?.(track()) ?? { min: 0, max: 1, unit: "", label: "" };
  const duration = () => props.durations[step().id];

  // A new duration rescales this step's keyframes and keeps the playhead at the same progress.
  // The user's limits may allow zero or less, but a step needs positive time to play, so such a value is not applied.
  function setDuration(value) {
    const id = step().id;
    const previous = props.durations[id];
    if (value === previous || !(value > 0)) return;
    const now = stepAt(props.steps, props.durations, props.playback.time);
    const next = { ...props.durations, [id]: value };
    const at = index();
    if (props.tracks[id]) setTracks({ ...props.tracks, [id]: scaleTracks(props.tracks[id], value / previous) });
    setDurations(next);
    if (now.index === at) props.playback.time = stepOffsets(props.steps, next)[now.index] + now.progress * value;
  }
  function setTrack(changes) {
    const id = step().id;
    setTracks({ ...props.tracks, [id]: { ...props.tracks[id], [spec().id]: { ...track(), ...changes } } });
  }
  // Typed keyframes push their partner so start never passes end.
  function setStart(value) {
    const start = clamp(value, 0, duration());
    setTrack({ start, end: Math.max(track().end, start) });
  }
  function setEnd(value) {
    const end = clamp(value, 0, duration());
    setTrack({ end, start: Math.min(track().start, end) });
  }
  const matches = ({ bezier: [x1, y1, x2, y2] }) => {
    const [a, b] = track().ease;
    return [a.out.x - x1, a.out.y - y1, b.in.x - x2, b.in.y - y2].every((d) => Math.abs(d) < 1e-6);
  };

  const crumb = h("button", { class: "crumb", on: { click: () => setSelection({ step: step().id, track: null }) } });
  const slash = h("span", { "aria-hidden": "true" }, "/");
  const trackName = h("strong");
  const crumbs = h("nav", { class: "crumbs", "aria-label": "Selection" }, crumb);
  const close = h(
    "button",
    { class: "icon-button", "aria-label": "Hide inspector", title: "Hide inspector", on: { click: () => props.onClose?.() } },
    createIcon({ name: "panel-right-close" }).element,
  );
  const header = h("header", { class: "inspector-header" }, crumbs);
  const body = h("fieldset", { class: "inspector-body" });
  const element = h("aside", { class: "inspector", "aria-label": "Inspector" }, header, body);

  // Step view. Like the Vue v-if branches, each view's controls exist only while it shows.
  let stepView = null;
  function createStepView() {
    const slider = createSliderControl({
      value: duration(),
      onInput: setDuration,
      bounds: props.limits,
      onBoundsInput: (limits) => setLimits(limits),
      label: "Duration (s)",
      step: 0.1,
    });
    const startsAt = h("p", { class: "note" });
    const list = h("ul", { class: "elements" });
    const note = h("p", { class: "note" });
    const items = new Map();
    const nodes = [
      h("div", { class: "group", role: "group", "aria-label": "Step" }, h("h2", null, "Step"), slider.element, startsAt),
      h("div", { class: "group", role: "group", "aria-label": "Elements" }, h("h2", null, "Elements"), list, note),
    ];
    function draw() {
      const current = step();
      slider.update({ value: duration(), bounds: props.limits });
      text(startsAt, `Starts at ${seconds(offset())} s. Changing the duration keeps keyframes at the same relative times.`);
      for (const key of [...items.keys()]) if (!specs().some((item) => `${current.id}/${item.id}` === key)) items.delete(key);
      const rows = specs().map((item) => {
        const key = `${current.id}/${item.id}`;
        if (!items.has(key)) {
          const times = h("small");
          const li = h("li", null, h("button", { on: { click: () => setSelection({ step: current.id, track: item.id }) } }, h("strong", null, item.name), times));
          items.set(key, { li, times });
        }
        const { li, times } = items.get(key);
        const t = props.tracks[current.id][item.id];
        text(times, `${seconds(t.start)}–${seconds(t.end)} s`);
        return li;
      });
      children(list, rows);
      children(nodes[1], [nodes[1].firstChild, specs().length && list, note]);
      text(note, specs().length ? "Double-click the step in the timeline to drag its keyframes." : "This step has no keyframed elements.");
    }
    return { nodes, draw, destroy: () => slider.destroy() };
  }

  // Element view: keyframes, ease, and parameters of the selected track.
  let trackView = null;
  function createTrackView() {
    const startField = createNumberField({ value: track().start, onInput: setStart, label: "Start (s)", min: 0, max: duration(), step: 0.01 });
    const endField = createNumberField({ value: track().end, onInput: setEnd, label: "End (s)", min: 0, max: duration(), step: 0.01 });
    const length = h("output", { class: "readout" });
    const presetButtons = CURVES.map((preset) => ({
      preset,
      button: h("button", { on: { click: () => setTrack({ ease: ramp(preset.bezier) }) } }, preset.label),
    }));
    const presets = h("div", { class: "presets", role: "group", "aria-label": "Ease presets" }, presetButtons.map((p) => p.button));
    const range = outputRange();
    const bezier = createBezierControl({
      value: track().ease,
      onInput: (ease) => setTrack({ ease }),
      heading: "Ease",
      envelope: spec().envelope,
      resetCurve: spec().ease,
      progress: progress(),
      playing: props.playback.playing,
      outputRange: range,
      unit: range.unit,
      propertyLabel: range.label,
      onTogglePreview: () => props.playback.toggle(),
    });
    const ease = h("div", { class: "group ease", role: "group", "aria-label": "Ease" });
    const stack = h("div", { class: "stack" });
    const paramsGroup = h("div", { class: "group", role: "group", "aria-label": "Parameters" }, h("h2", null, "Parameters"), stack);
    const keyframes = h(
      "div",
      { class: "group", role: "group", "aria-label": "Keyframes" },
      h("h2", null, "Keyframes"),
      h("div", { class: "pair" }, startField.element, endField.element),
      length,
    );
    // Parameter controls are keyed by parameter name, like the Vue v-for, and rebuilt when their kind changes.
    const controls = new Map();
    function paramControl(key, param) {
      const kind = param.position ? "position" : param.options ? "options" : "number";
      let control = controls.get(key);
      if (control && control.kind !== kind) {
        control.destroy();
        control = null;
      }
      if (!control) {
        if (kind === "position") {
          const position = createPositionControl({ value: track()[key], onInput: (value) => setTrack({ [key]: value }), heading: param.label });
          control = { kind, element: position.element, update: () => position.update({ value: track()[key], heading: param.label }), destroy: () => position.destroy() };
        } else if (kind === "options") {
          const legend = h("legend");
          const segmented = h("div", { class: "segmented" });
          const radios = new Map();
          control = {
            kind,
            element: h("fieldset", null, legend, segmented),
            update(current) {
              text(legend, current.label);
              const labels = current.options.map(([id, label]) => {
                if (!radios.has(id)) {
                  const input = h("input", { type: "radio", on: { change: () => setTrack({ [key]: id }) } });
                  prop(input, "value", id);
                  const check = createIcon({ name: "check" }).element;
                  check.classList.add("selection-check");
                  const name = document.createTextNode("");
                  radios.set(id, { input, name, element: h("label", null, input, h("span", null, check, name)) });
                }
                const radio = radios.get(id);
                attr(radio.input, "name", `${spec().id}-${key}`);
                // v-model sets only the checked property, never the attribute.
                radio.input.checked = track()[key] === id;
                text(radio.name, label);
                return radio.element;
              });
              children(segmented, labels);
            },
            destroy() {},
          };
        } else {
          const field = createNumberField({ value: track()[key], onInput: (value) => setTrack({ [key]: value }), label: param.label, min: param.min, max: param.max, step: param.step });
          control = {
            kind,
            element: field.element,
            update: (current) => field.update({ value: track()[key], label: current.label, min: current.min, max: current.max, step: current.step }),
            destroy: () => field.destroy(),
          };
        }
        controls.set(key, control);
      }
      control.update(param);
      return control.element;
    }
    function draw() {
      const current = track();
      const currentSpec = spec();
      const outRange = outputRange();
      startField.update({ value: current.start, max: duration() });
      endField.update({ value: current.end, max: duration() });
      text(length, `Length ${seconds(current.end - current.start)} s · step ${seconds(duration())} s`);
      for (const { preset, button } of presetButtons) if (!currentSpec.envelope) attr(button, "aria-pressed", String(matches(preset)));
      bezier.update({
        value: current.ease,
        envelope: currentSpec.envelope,
        resetCurve: currentSpec.ease,
        progress: progress(),
        playing: props.playback.playing,
        outputRange: outRange,
        unit: outRange.unit,
        propertyLabel: outRange.label,
      });
      children(ease, [!currentSpec.envelope && presets, bezier.element]);
      const list = params();
      for (const [key, control] of controls)
        if (!list.some(([name]) => name === key)) {
          control.destroy();
          controls.delete(key);
        }
      children(stack, list.map(([key, param]) => paramControl(key, param)));
    }
    return {
      nodes: () => [keyframes, ease, params().length && paramsGroup],
      draw,
      destroy() {
        startField.destroy();
        endField.destroy();
        bezier.destroy();
        for (const control of controls.values()) control.destroy();
      },
    };
  }

  const stopPlayback = props.playback.subscribe(() => render());
  const render = renderer(draw);
  function draw() {
    const current = step();
    const selected = track();
    attr(crumb, "aria-current", selected ? null : "location");
    prop(crumb, "disabled", !selected);
    text(crumb, current.name);
    if (selected) text(trackName, spec().name);
    children(crumbs, [crumb, selected && slash, selected && trackName]);
    children(header, [crumbs, props.closable && close]);
    prop(body, "disabled", props.disabled);
    if (!selected) {
      trackView?.destroy();
      trackView = null;
      stepView ??= createStepView();
      stepView.draw();
      children(body, stepView.nodes);
    } else {
      stepView?.destroy();
      stepView = null;
      trackView ??= createTrackView();
      trackView.draw();
      children(body, trackView.nodes());
    }
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
      apply(checkProps("Inspector", SPEC, partial, props));
    },
    destroy() {
      stopPlayback();
      stepView?.destroy();
      trackView?.destroy();
    },
  };
}
