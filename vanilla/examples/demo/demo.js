// Vanilla workspace demo, mirroring src/Demo.vue: controls panel, preview with timeline, and inspector.
// The page owns saved state, the one playback clock, the preview canvas, and export; controls report edits through callbacks.
import { h, attr, prop, toggle, style, text, children, renderer } from "../../dom.js";
import { createSavedState } from "../../saved-state.js";
import { createPlayback } from "../../playback.js";
import { createIcon } from "../../components/icon.js";
import { createSliderControl } from "../../components/slider-control.js";
import { createGradientControl } from "../../components/gradient-control.js";
import { createColorEditor } from "../../components/color-editor.js";
import { createTimeline } from "../../components/timeline.js";
import { createInspector } from "../../components/inspector.js";
import { validLimits } from "../../../src/lib/numeric-limits.js";
import { clone, finite, validColor } from "../../../src/lib/values.js";
import { FORMATS, MAX_EDGE, download, exportCanvas, exportFilename, frameSchedule, outputSize } from "../../../src/lib/export.js";
import { defaultDurations, defaultTracks, playRange, restoreTracks, sequenceDuration, validDurations } from "../../../src/lib/timeline.js";
import { STEPS, LOOK, render as renderArtwork } from "../../../src/demo/hello.js";

const ASPECTS = { "16:9": { width: 1920, height: 1080 }, "1:1": { width: 1080, height: 1080 }, "9:16": { width: 1080, height: 1920 } };
const saved = createSavedState(
  "baza:vanilla:demo:v1",
  {
    aspect: "16:9",
    background: LOOK.background,
    ink: LOOK.ink,
    size: LOOK.size,
    sizeLimits: { min: 5, max: 60 },
    weight: LOOK.weight,
    weightLimits: { min: 100, max: 900 },
    export: { format: "mp4", longEdge: 1920, fps: 30, transparent: false },
    longEdgeLimits: { min: 256, max: MAX_EDGE },
    fpsLimits: { min: 12, max: 60 },
    durations: defaultDurations(STEPS),
    durationLimits: { min: 0.1, max: 10 },
    tracks: defaultTracks(STEPS),
    panelOpen: true,
    inspectorOpen: true,
  },
  {
    aspect: (v) => Object.hasOwn(ASPECTS, v),
    background: (v) =>
      Array.isArray(v) && v.length >= 2 && v.length <= 8 && v.every((stop) => validColor(stop) && finite(stop.position, 0, 100)),
    ink: validColor,
    size: (v) => finite(v, 1, 100),
    sizeLimits: (v) => validLimits(v, { hardMin: 1, hardMax: 100 }),
    weight: (v) => finite(v, 100, 900),
    weightLimits: (v) => validLimits(v, { hardMin: 100, hardMax: 900 }),
    export: (v) =>
      v !== null && typeof v === "object" && Object.hasOwn(FORMATS, v.format) && Number.isInteger(v.longEdge) &&
      finite(v.longEdge, 16, MAX_EDGE) && finite(v.fps, 1, 120) && typeof v.transparent === "boolean",
    durations: (v) => validDurations(STEPS, v),
    durationLimits: (v) => validLimits(v, { hardMin: 0.1 }),
    longEdgeLimits: (v) => validLimits(v, { hardMin: 16, hardMax: MAX_EDGE }),
    fpsLimits: (v) => validLimits(v, { hardMin: 1, hardMax: 120 }),
    // Track contents are merged key by key with restoreTracks below.
    tracks: (v) => v !== null && typeof v === "object",
    panelOpen: (v) => typeof v === "boolean",
    inspectorOpen: (v) => typeof v === "boolean",
  },
);
saved.set("tracks", restoreTracks(STEPS, saved.state.tracks, saved.state.durations));
// Shared with the vanilla UI examples page, so both pages open in the same theme.
const appearance = createSavedState("baza:vanilla:ui-appearance:v1", { theme: "light" }, { theme: (value) => value === "light" || value === "dark" });
const state = () => saved.state;

// Selection and the open step are transient, like time and play state.
let selection = { step: STEPS[0].id, track: null };
let expanded = null;
const playback = createPlayback({
  total: () => sequenceDuration(STEPS, state().durations),
  range: () => playRange(STEPS, state().durations, expanded),
  fps: () => state().export.fps,
});

// Export state; the panel and the timeline stay disabled while it runs.
let exporting = false;
let controller = null;
let progress = null;
let exportStatus = "";

// Every edit goes through here: save it, tell the clock, and redraw the page.
let mounted = false;
function set(name, value) {
  saved.set(name, value);
  if (!mounted) return;
  playback.refresh();
  update();
}
const setExport = (changes) => set("export", { ...state().export, ...changes });

const icon = (name, className) => {
  const element = createIcon({ name }).element;
  if (className) element.classList.add(className);
  return element;
};
// A segmented radio group; like v-model it sets only the checked property.
function segmented(name, options, onChange) {
  const inputs = options.map(([value, label]) => {
    const input = h("input", { type: "radio", name, on: { change: () => onChange(value) } });
    prop(input, "value", value);
    return { value, input, element: h("label", null, input, h("span", null, icon("check", "selection-check"), label)) };
  });
  return {
    element: h("div", { class: "segmented" }, inputs.map((option) => option.element)),
    check(current) {
      for (const option of inputs) option.input.checked = option.value === current;
    },
  };
}

// Preview frame: the composition's aspect ratio, uniformly fitted to the free space.
const canvas = h("canvas", { "aria-label": "Animated lowercase hello" });
const frameBox = h("div", { class: "frame" }, canvas);
const stage = h("main", { class: "stage", "aria-label": "Composition preview" }, frameBox);
const frame = { width: 0, height: 0 };
function fitFrame() {
  const box = stage.getBoundingClientRect();
  const size = ASPECTS[state().aspect];
  const ratio = size.width / size.height;
  const width = Math.max(1, Math.min(box.width, box.height * ratio));
  const next = { width: Math.floor(width), height: Math.floor(width / ratio) };
  if (next.width === frame.width && next.height === frame.height) return;
  Object.assign(frame, next);
  style(frameBox, "width", `${frame.width}px`);
  style(frameBox, "height", `${frame.height}px`);
  schedule();
}

// Draw at most once per animation frame, whenever time, settings, or the frame change.
let request = 0;
function draw() {
  request = 0;
  if (!frame.width) return;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(frame.width * dpr);
  const height = Math.round(frame.height * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  renderArtwork(canvas.getContext("2d"), { width, height }, state(), state(), playback.time);
}
const schedule = () => {
  if (!request) request = requestAnimationFrame(draw);
};

const timeline = createTimeline({
  tracks: state().tracks,
  onTracksInput: (value) => set("tracks", value),
  selection,
  onSelectionInput: (value) => {
    selection = value;
    update();
  },
  expanded,
  onExpandedInput: (value) => {
    expanded = value;
    playback.refresh();
    update();
  },
  steps: STEPS,
  durations: state().durations,
  playback,
});
timeline.element.classList.add("floating");
const main = h("div", { class: "main" }, stage, timeline.element);

const panelToggle = h(
  "button",
  { class: "panel-toggle floating", "aria-label": "Show controls", title: "Show controls", on: { click: () => set("panelOpen", true) } },
  icon("sliders"),
);
const aspect = segmented("aspect", Object.keys(ASPECTS).map((id) => [id, id]), (value) => set("aspect", value));
const background = createGradientControl({ value: state().background, onInput: (value) => set("background", value), heading: "Background (top to bottom)" });
const ink = createColorEditor({ value: state().ink, onInput: (value) => set("ink", value) });
const size = createSliderControl({
  value: state().size,
  onInput: (value) => set("size", value),
  bounds: state().sizeLimits,
  onBoundsInput: (value) => set("sizeLimits", value),
  label: "Letter size (% of height)",
  min: 1,
  max: 100,
  step: 0.5,
});
const weight = createSliderControl({
  value: state().weight,
  onInput: (value) => set("weight", value),
  bounds: state().weightLimits,
  onBoundsInput: (value) => set("weightLimits", value),
  label: "Letter weight",
  min: 100,
  max: 900,
  step: 100,
});
const theme = segmented("theme", ["light", "dark"].map((id) => [id, id[0].toUpperCase() + id.slice(1)]), (value) => {
  appearance.set("theme", value);
  update();
});
const status = h("p", { class: "note" });
const format = segmented("export-format", Object.entries(FORMATS), (value) => setExport({ format: value }));
const longEdge = createSliderControl({
  value: state().export.longEdge,
  onInput: (value) => setExport({ longEdge: value }),
  bounds: state().longEdgeLimits,
  onBoundsInput: (value) => set("longEdgeLimits", value),
  label: "Long edge (px)",
  min: 16,
  max: MAX_EDGE,
  step: 2,
});
// Like the Vue v-if, the frame rate slider exists only while a video format is selected.
let fps = null;
const createFps = () =>
  createSliderControl({
    value: state().export.fps,
    onInput: (value) => setExport({ fps: value }),
    bounds: state().fpsLimits,
    onBoundsInput: (value) => set("fpsLimits", value),
    label: "Frame rate (fps)",
    min: 1,
    max: 120,
    step: 1,
  });
const transparent = h("input", { type: "checkbox", name: "transparent", on: { change: (event) => setExport({ transparent: event.target.checked }) } });
const transparentLabel = h("label", { class: "inline" }, transparent, "Transparent background");
const exportStack = h("div", { class: "stack" });
const outputSizeText = document.createTextNode("");
const outputVideoText = document.createTextNode("");
const readout = h("output", { class: "readout" }, outputSizeText);
const exportNote = h("p", { class: "note" });
const formFields = h(
  "fieldset",
  null,
  h("details", { class: "group", open: true }, h("summary", null, "Composition"), h("fieldset", null, h("legend", null, "Aspect ratio"), aspect.element)),
  h(
    "details",
    { class: "group", open: true },
    h("summary", null, "Artwork"),
    background.element,
    h("div", { class: "color-row" }, h("span", { class: "color-label" }, "Letters"), ink.element),
    h("div", { class: "stack" }, size.element, weight.element),
  ),
  h("details", { class: "group", open: true }, h("summary", null, "Interface"), h("fieldset", null, h("legend", null, "Theme"), theme.element), status),
  h(
    "details",
    { class: "group", open: true },
    h("summary", null, "Export"),
    h("fieldset", null, h("legend", null, "Format"), format.element),
    exportStack,
    readout,
    exportNote,
  ),
);
const exportLabel = document.createTextNode("");
const exportButton = h("button", { class: "primary", on: { click: runExport } }, icon("download"), exportLabel);
const cancelButton = h("button", { on: { click: () => controller?.abort() } }, icon("x"), "Cancel");
const actions = h("div", { class: "export-actions" }, exportButton);
const progressBar = h("progress", { "aria-label": "Export progress" });
const exportMessage = h("p", { class: "status", role: "status" });
const sidebarBody = h("div", { class: "sidebar-body" }, formFields, actions, exportMessage);
const sidebar = h(
  "aside",
  { class: "sidebar floating", "aria-label": "Controls" },
  h(
    "header",
    { class: "sidebar-header" },
    h("h1", null, h("a", { href: "../" }, "Baza"), " / Demo"),
    h("button", { class: "icon-button", "aria-label": "Hide controls", title: "Hide controls", on: { click: () => set("panelOpen", false) } }, icon("panel-close")),
  ),
  sidebarBody,
);
const inspectorToggle = h(
  "button",
  { class: "inspector-toggle floating", "aria-label": "Show inspector", title: "Show inspector", on: { click: () => set("inspectorOpen", true) } },
  icon("spline"),
);
// Like the Vue v-else, the inspector exists only while it is open.
let inspector = null;
const createOpenInspector = () => {
  const panel = createInspector({
    selection,
    onSelectionInput: (value) => {
      selection = value;
      update();
    },
    durations: state().durations,
    onDurationsInput: (value) => set("durations", value),
    tracks: state().tracks,
    onTracksInput: (value) => set("tracks", value),
    limits: state().durationLimits,
    onLimitsInput: (value) => set("durationLimits", value),
    steps: STEPS,
    playback,
    closable: true,
    onClose: () => set("inspectorOpen", false),
  });
  panel.element.classList.add("floating");
  return panel;
};
const workspace = h("div", { class: "baza-theme workspace" });
const desktopOnly = h("p", { class: "desktop-only" }, "This app is meant for desktop. Open it on a larger screen.");

// Export renders a frozen snapshot offline; the preview and controls stay paused until it ends.
async function runExport() {
  if (exporting) return;
  const output = outputSize(ASPECTS[state().aspect], state().export.longEdge);
  const settings = { ...state().export, ...output, duration: playback.total, time: playback.time };
  const snapshot = clone(state());
  const video = settings.format !== "png";
  // Video is opaque; PNG may drop the background entirely.
  const look = video ? { ...snapshot, background: snapshot.background.map((stop) => ({ ...stop, alpha: 1 })) } : snapshot;
  const transparentBackground = !video && settings.transparent;
  const wasPlaying = playback.playing;
  playback.playing = false;
  exporting = true;
  controller = new AbortController();
  exportStatus = video ? "Preparing encoder…" : "Rendering PNG…";
  update();
  try {
    const blob = await exportCanvas({
      settings,
      draw: (ctx, size, time) => renderArtwork(ctx, size, look, snapshot, time, { transparent: transparentBackground }),
      signal: controller.signal,
      onProgress: (step) => {
        progress = step;
        exportStatus = step.stage === "finalizing" ? "Finalizing…" : `Rendering frame ${step.done} of ${step.total}`;
        update();
      },
    });
    if (controller.signal.aborted) throw new DOMException("Export canceled.", "AbortError");
    download(blob, exportFilename("baza-demo-hello", settings));
    exportStatus = `Saved ${FORMATS[settings.format]} · ${settings.width} × ${settings.height} px · ${Math.ceil(blob.size / 1024)} KB`;
  } catch (error) {
    exportStatus = error.name === "AbortError" ? "Export canceled." : `Export failed: ${error.message}`;
    if (error.name !== "AbortError") console.error(error);
  } finally {
    exporting = false;
    controller = null;
    progress = null;
    if (wasPlaying) playback.playing = true;
    update();
  }
}

// A redraw requested while redrawing, such as a control reporting a corrected value while it is created, runs after this pass.
const update = renderer(redraw);
function redraw() {
  const s = state();
  const png = s.export.format === "png";
  attr(workspace, "data-ui-theme", appearance.state.theme);
  toggle(workspace, "panel-open", s.panelOpen);
  toggle(workspace, "inspector-open", s.inspectorOpen);
  toggle(frameBox, "checker", s.background.some((stop) => stop.alpha < 1));
  timeline.update({ tracks: s.tracks, selection, expanded, durations: s.durations, disabled: exporting });

  prop(formFields, "disabled", exporting);
  aspect.check(s.aspect);
  background.update({ value: s.background });
  ink.update({ value: s.ink });
  size.update({ value: s.size, bounds: s.sizeLimits });
  weight.update({ value: s.weight, bounds: s.weightLimits });
  theme.check(appearance.state.theme);
  text(status, saved.status);
  format.check(s.export.format);
  longEdge.update({ value: s.export.longEdge, bounds: s.longEdgeLimits });
  if (png) {
    fps?.destroy();
    fps = null;
    // Like v-model, only the checked property.
    transparent.checked = s.export.transparent;
  } else {
    fps ??= createFps();
    fps.update({ value: s.export.fps, bounds: s.fpsLimits });
  }
  children(exportStack, [longEdge.element, png ? transparentLabel : fps.element]);
  const output = outputSize(ASPECTS[s.aspect], s.export.longEdge);
  text(outputSizeText, `${output.width} × ${output.height} px`);
  if (!png) text(outputVideoText, ` · ${playback.total.toFixed(2)} s · ${frameSchedule(playback.total, s.export.fps).length} frames`);
  children(readout, [outputSizeText, !png && outputVideoText]);
  text(exportNote, png ? "PNG renders the frame at the playhead." : "Video renders the whole timeline; background opacity is flattened.");
  prop(exportButton, "disabled", exporting);
  text(exportLabel, `Export ${FORMATS[s.export.format]}`);
  children(actions, [exportButton, exporting && cancelButton]);
  if (progress) {
    prop(progressBar, "value", progress.done);
    prop(progressBar, "max", progress.total);
  }
  text(exportMessage, exportStatus);
  children(sidebarBody, [formFields, actions, progress && progressBar, exportMessage]);

  if (s.inspectorOpen) {
    inspector ??= createOpenInspector();
    inspector.update({ selection, durations: s.durations, tracks: s.tracks, limits: s.durationLimits, disabled: exporting });
  } else {
    inspector?.destroy();
    inspector = null;
  }
  children(workspace, [main, s.panelOpen ? sidebar : panelToggle, s.inspectorOpen ? inspector.element : inspectorToggle, desktopOnly]);
  // Panels and the open step change the free space; the observer refits after layout, this covers the first pass.
  fitFrame();
  schedule();
}

// The timeline and inspector follow the clock themselves; the page only redraws the artwork.
playback.subscribe(schedule);
document.getElementById("app").append(workspace);
mounted = true;
update();
new ResizeObserver(fitFrame).observe(stage);
