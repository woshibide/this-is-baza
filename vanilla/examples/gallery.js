// Vanilla gallery wiring, mirroring src/App.vue: the page owns saved state and one playback clock,
// and passes values to the controls, which report edits through callbacks.
import { renderer } from "../dom.js";
import { createSavedState, STATUS } from "../saved-state.js";
import { createPlayback } from "../playback.js";
import { createSliderControl } from "../components/slider-control.js";
import { createChoiceControl } from "../components/choice-control.js";
import { createBezierControl } from "../components/bezier-control.js";
import { createTimeline } from "../components/timeline.js";
import { createInspector } from "../components/inspector.js";
import { createPaletteControl } from "../components/palette-control.js";
import { createGradientControl } from "../components/gradient-control.js";
import { createRangeControl } from "../components/range-control.js";
import { createAngleRangeControl } from "../components/angle-range-control.js";
import { createPositionControl } from "../components/position-control.js";
import { createAngleControl } from "../components/angle-control.js";
import { createVectorControl } from "../components/vector-control.js";
import { createDimensionsControl } from "../components/dimensions-control.js";
import { defaults, validators, timelineSteps } from "../../src/lib/demo-state.js";
import { playRange, restoreTracks, sequenceDuration, stepOffsets, trackValue } from "../../src/lib/timeline.js";

const saved = createSavedState("baza:vanilla:ui-controls:v1", defaults, validators);
const appearance = createSavedState("baza:vanilla:ui-appearance:v1", { theme: "light" }, { theme: (value) => value === "light" || value === "dark" });
const contents = [
  { id: "overview", label: "Overview" },
  { id: "values", label: "Values" },
  { id: "slider", label: "Slider", example: true },
  { id: "choices", label: "Choices and toggles", example: true },
  { id: "timing", label: "Timing" },
  { id: "ramp", label: "Bézier ramp", example: true },
  { id: "envelope", label: "Pulse envelope", example: true },
  { id: "playback", label: "Timeline", example: true },
  { id: "colors", label: "Color" },
  { id: "color", label: "Palette", example: true },
  { id: "gradient", label: "Gradient", example: true },
  { id: "ranges", label: "Range" },
  { id: "range", label: "Interval", example: true },
  { id: "angle-range", label: "Angle interval", example: true },
  { id: "geometry", label: "Geometry" },
  { id: "position", label: "XY position", example: true },
  { id: "angle", label: "Angle", example: true },
  { id: "vector", label: "Vector", example: true },
  { id: "dimensions", label: "Linked dimensions", example: true },
];
document.getElementById("contents").append(
  ...contents.map(({ id, label, example }) => {
    const item = document.createElement("li");
    if (example) item.className = "contents-example";
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = label;
    item.append(link);
    return item;
  }),
);

// One clock for the timeline, the inspector, and both Bézier previews.
saved.set("tracks", restoreTracks(timelineSteps, saved.state.tracks, saved.state.durations));
const state = () => saved.state;
const outputRange = () => ({ ...state().range, unit: "px", label: "" });
const steps = timelineSteps.map((step) => ({ ...step, tracks: step.tracks.map((spec) => ({ ...spec, range: outputRange })) }));
let selection = { step: steps[0].id, track: null };
let expanded = null;
const playback = createPlayback({
  total: () => sequenceDuration(steps, state().durations),
  range: () => playRange(steps, state().durations, expanded),
  fps: () => 30,
});
const previewProgress = () => {
  const [rise, pulse] = stepOffsets(steps, state().durations);
  const { tracks } = state();
  return {
    ramp: trackValue(tracks.rise.ramp, playback.time - rise).progress,
    envelope: trackValue(tracks.pulse.envelope, playback.time - pulse).progress,
  };
};

// Every edit goes through here: save it, tell the clock, and pass the new state to every control.
// Controls that correct their value while being created only save it; the first render follows.
let mounted = false;
function set(name, value) {
  saved.set(name, value);
  if (!mounted) return;
  playback.refresh();
  render();
}
const setEase = (step, track) => (ease) =>
  set("tracks", { ...state().tracks, [step]: { ...state().tracks[step], [track]: { ...state().tracks[step][track], ease } } });
const bind = (name) => ({ value: state()[name], onInput: (value) => set(name, value) });
const bounds = (name) => ({ bounds: state()[name], onBoundsInput: (value) => set(name, value) });

const slider = createSliderControl({ heading: "Slider", ...bind("slider"), ...bounds("sliderBounds") });
const choices = createChoiceControl(bind("choices"));
const ramp = createBezierControl({
  value: state().tracks.rise.ramp.ease,
  onInput: setEase("rise", "ramp"),
  progress: previewProgress().ramp,
  outputRange: state().range,
  unit: "px",
  playing: playback.playing,
  onTogglePreview: () => playback.toggle(),
});
const envelope = createBezierControl({
  value: state().tracks.pulse.envelope.ease,
  onInput: setEase("pulse", "envelope"),
  envelope: true,
  progress: previewProgress().envelope,
  outputRange: state().range,
  unit: "px",
  playing: playback.playing,
  onTogglePreview: () => playback.toggle(),
});
const timeline = createTimeline({
  tracks: state().tracks,
  onTracksInput: (value) => set("tracks", value),
  selection,
  onSelectionInput: (value) => {
    selection = value;
    if (mounted) render();
  },
  expanded,
  onExpandedInput: (value) => {
    expanded = value;
    playback.refresh();
    render();
  },
  steps,
  durations: state().durations,
  playback,
});
const inspector = createInspector({
  selection,
  onSelectionInput: (value) => {
    selection = value;
    if (mounted) render();
  },
  durations: state().durations,
  onDurationsInput: (value) => set("durations", value),
  tracks: state().tracks,
  onTracksInput: (value) => set("tracks", value),
  limits: state().durationLimits,
  onLimitsInput: (value) => set("durationLimits", value),
  steps,
  playback,
});
const palette = createPaletteControl(bind("palette"));
const gradient = createGradientControl({ ...bind("gradient"), ...bounds("gradientBounds") });
const range = createRangeControl({ ...bind("range"), ...bounds("rangeBounds") });
const angleRange = createAngleRangeControl(bind("angleRange"));
const position = createPositionControl({ ...bind("position"), ...bounds("positionBounds") });
const angle = createAngleControl({ ...bind("rotation"), ...bounds("rotationBounds") });
const vector = createVectorControl({ ...bind("vector"), ...bounds("vectorBounds") });
const dimensions = createDimensionsControl({ ...bind("dimensions"), ...bounds("dimensionsBounds") });

const mount = (name, ...elements) => document.querySelector(`[data-control="${name}"]`).replaceWith(...elements);
mount("slider", slider.element);
mount("choices", choices.element);
mount("ramp", ramp.element);
mount("envelope", envelope.element);
const pair = document.querySelector('[data-control="timeline"]');
pair.removeAttribute("data-control");
pair.append(timeline.element, inspector.element);
mount("palette", palette.element);
mount("gradient", gradient.element);
mount("range", range.element);
mount("angle-range", angleRange.element);
mount("position", position.element);
mount("angle", angle.element);
mount("vector", vector.element);
mount("dimensions", dimensions.element);

function previews() {
  const progress = previewProgress();
  ramp.update({ value: state().tracks.rise.ramp.ease, progress: progress.ramp, outputRange: state().range, playing: playback.playing });
  envelope.update({ value: state().tracks.pulse.envelope.ease, progress: progress.envelope, outputRange: state().range, playing: playback.playing });
}
const status = document.getElementById("status");
const statusLine = document.getElementById("gallery-status");
const appearanceStatus = document.createElement("span");
appearanceStatus.setAttribute("role", "status");
// A redraw requested while redrawing runs after this pass.
const render = renderer(redraw);
function redraw() {
  const s = state();
  slider.update({ value: s.slider, bounds: s.sliderBounds });
  choices.update({ value: s.choices });
  previews();
  timeline.update({ tracks: s.tracks, selection, expanded, durations: s.durations });
  inspector.update({ selection, durations: s.durations, tracks: s.tracks, limits: s.durationLimits });
  palette.update({ value: s.palette });
  gradient.update({ value: s.gradient, bounds: s.gradientBounds });
  range.update({ value: s.range, bounds: s.rangeBounds });
  angleRange.update({ value: s.angleRange });
  position.update({ value: s.position, bounds: s.positionBounds });
  angle.update({ value: s.rotation, bounds: s.rotationBounds });
  vector.update({ value: s.vector, bounds: s.vectorBounds });
  dimensions.update({ value: s.dimensions, bounds: s.dimensionsBounds });
  status.textContent = saved.status;
  appearanceStatus.textContent = appearance.status;
  if (appearance.status !== STATUS.saving) statusLine.append(appearanceStatus);
  else appearanceStatus.remove();
}
playback.subscribe(previews);

const theme = document.getElementById("theme");
const examples = document.getElementById("examples-theme");
const applyTheme = () => {
  theme.value = appearance.state.theme;
  examples.dataset.uiTheme = appearance.state.theme;
};
theme.addEventListener("change", () => {
  appearance.set("theme", theme.value);
  applyTheme();
  render();
});
applyTheme();
mounted = true;
render();
// The examples exist only now, after the browser's initial fragment lookup.
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
