<!-- Workspace demo: illustrates the standard layout with live controls.
     Left: global settings. Center: preview, with the timeline under it. Right: inspector for the selection. -->
<template>
  <div
    class="baza-theme workspace"
    :data-ui-theme="appearance.theme"
    :class="{ 'panel-open': state.panelOpen, 'inspector-open': state.inspectorOpen }"
  >
    <div class="main">
      <main ref="stage" class="stage" aria-label="Composition preview">
        <div
          class="frame"
          :class="{ checker: state.background.some((stop) => stop.alpha < 1) }"
          :style="{ width: `${frame.width}px`, height: `${frame.height}px` }"
        >
          <canvas ref="canvas" aria-label="Animated lowercase hello" />
        </div>
      </main>
      <Timeline
        v-model:tracks="state.tracks"
        v-model:selection="selection"
        v-model:expanded="expanded"
        class="floating"
        :steps="STEPS"
        :durations="state.durations"
        :playback="playback"
        :disabled="exporting"
      />
    </div>

    <button
      v-if="!state.panelOpen"
      class="panel-toggle floating"
      aria-label="Show controls"
      title="Show controls"
      @click="state.panelOpen = true"
    >
      <Icon name="sliders" />
    </button>
    <aside v-else class="sidebar floating" aria-label="Controls">
      <header class="sidebar-header">
        <h1><a href="../">Baza</a> / Demo</h1>
        <button class="icon-button" aria-label="Hide controls" title="Hide controls" @click="state.panelOpen = false">
          <Icon name="panel-close" />
        </button>
      </header>
      <div class="sidebar-body">
        <fieldset :disabled="exporting">
          <details class="group" open>
            <summary>Composition</summary>
            <fieldset>
              <legend>Aspect ratio</legend>
              <div class="segmented">
                <label v-for="(ratio, id) in ASPECTS" :key="id"
                  ><input v-model="state.aspect" type="radio" name="aspect" :value="id" /><span
                    ><Icon name="check" class="selection-check" />{{ id }}</span
                  ></label
                >
              </div>
            </fieldset>
          </details>
          <details class="group" open>
            <summary>Artwork</summary>
            <GradientControl v-model="state.background" heading="Background (top to bottom)" />
            <div class="color-row">
              <span class="color-label">Letters</span>
              <ColorEditor v-model="state.ink" />
            </div>
            <div class="stack">
              <SliderControl
                v-model="state.size"
                v-model:bounds="state.sizeLimits"
                label="Letter size (% of height)"
                :step="0.5"
              />
              <SliderControl
                v-model="state.weight"
                v-model:bounds="state.weightLimits"
                label="Letter weight"
                :step="100"
              />
            </div>
          </details>
          <details class="group" open>
            <summary>Interface</summary>
            <fieldset>
              <legend>Theme</legend>
              <div class="segmented">
                <label v-for="theme in ['light', 'dark']" :key="theme"
                  ><input v-model="appearance.theme" type="radio" name="theme" :value="theme" /><span
                    ><Icon name="check" class="selection-check" />{{ theme[0].toUpperCase() + theme.slice(1) }}</span
                  ></label
                >
              </div>
            </fieldset>
            <p class="note">{{ status }}</p>
          </details>
          <details class="group" open>
            <summary>Export</summary>
            <fieldset>
              <legend>Format</legend>
              <div class="segmented">
                <label v-for="(label, format) in FORMATS" :key="format"
                  ><input v-model="state.export.format" type="radio" name="export-format" :value="format" /><span
                    ><Icon name="check" class="selection-check" />{{ label }}</span
                  ></label
                >
              </div>
            </fieldset>
            <div class="stack">
              <SliderControl
                v-model="state.export.longEdge"
                v-model:bounds="state.longEdgeLimits"
                label="Long edge (px)"
                :step="2"
              />
              <SliderControl
                v-if="state.export.format !== 'png'"
                v-model="state.export.fps"
                v-model:bounds="state.fpsLimits"
                label="Frame rate (fps)"
                :step="1"
              />
              <label v-else class="inline"
                ><input v-model="state.export.transparent" type="checkbox" name="transparent" />Transparent background</label
              >
            </div>
            <output class="readout">
              {{ output.width }} × {{ output.height }} px<template v-if="state.export.format !== 'png'">
                · {{ playback.total.toFixed(2) }} s · {{ frameCount(playback.total, state.export.fps) }} frames</template
              >
            </output>
            <p class="note">
              {{ state.export.format === "png"
                ? "PNG renders the frame at the playhead."
                : "Video renders the whole timeline; background opacity is flattened." }}
            </p>
          </details>
        </fieldset>
        <div class="export-actions">
          <button class="primary" :disabled="exporting" @click="runExport">
            <Icon name="download" />Export {{ FORMATS[state.export.format] }}
          </button>
          <button v-if="exporting" @click="controller?.abort()"><Icon name="x" />Cancel</button>
        </div>
        <progress v-if="progress" :value="progress.done" :max="progress.total" aria-label="Export progress" />
        <p class="status" role="status">{{ exportStatus }}</p>
      </div>
    </aside>

    <button
      v-if="!state.inspectorOpen"
      class="inspector-toggle floating"
      aria-label="Show inspector"
      title="Show inspector"
      @click="state.inspectorOpen = true"
    >
      <Icon name="spline" />
    </button>
    <Inspector
      v-else
      v-model:selection="selection"
      v-model:durations="state.durations"
      v-model:tracks="state.tracks"
      v-model:limits="state.durationLimits"
      class="inspector floating"
      :steps="STEPS"
      :playback="playback"
      :disabled="exporting"
      closable
      @close="state.inspectorOpen = false"
    />

    <p class="desktop-only">This app is meant for desktop. Open it on a larger screen.</p>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import Icon from "./components/Icon.vue";
import SliderControl from "./components/SliderControl.vue";
import GradientControl from "./components/GradientControl.vue";
import ColorEditor from "./components/ColorEditor.vue";
import Timeline from "./components/Timeline.vue";
import Inspector from "./components/Inspector.vue";
import { useSavedState } from "./composables/useSavedState.js";
import { usePlayback } from "./composables/usePlayback.js";
import { validLimits } from "./lib/numeric-limits.js";
import { clone, validColor } from "./lib/values.js";
import { FORMATS, MAX_EDGE, download, exportCanvas, exportFilename, frameCount, outputSize } from "./lib/export.js";
import {
  defaultDurations, defaultTracks, playRange, restoreTracks, sequenceDuration, validDurations,
} from "./lib/timeline.js";
import { STEPS, LOOK, render } from "./demo/hello.js";

const ASPECTS = { "16:9": { width: 1920, height: 1080 }, "1:1": { width: 1080, height: 1080 }, "9:16": { width: 1080, height: 1920 } };
const { state, status } = useSavedState(
  "baza:demo:v1",
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
      Array.isArray(v) && v.length >= 2 && v.length <= 8 && v.every((stop) => validColor(stop) && Number.isFinite(stop.position)),
    ink: validColor,
    // Values and limits accept any number: the limits are the user's range, never a hardcoded one.
    // Export reports sizes and frame rates it cannot encode.
    size: Number.isFinite,
    sizeLimits: (v) => validLimits(v),
    weight: Number.isFinite,
    weightLimits: (v) => validLimits(v),
    export: (v) =>
      v !== null && typeof v === "object" && Object.hasOwn(FORMATS, v.format) && Number.isFinite(v.longEdge) &&
      Number.isFinite(v.fps) && typeof v.transparent === "boolean",
    durations: (v) => validDurations(STEPS, v),
    durationLimits: (v) => validLimits(v),
    longEdgeLimits: (v) => validLimits(v),
    fpsLimits: (v) => validLimits(v),
    // Track contents are merged key by key with restoreTracks below.
    tracks: (v) => v !== null && typeof v === "object",
    panelOpen: (v) => typeof v === "boolean",
    inspectorOpen: (v) => typeof v === "boolean",
  },
);
state.value.tracks = restoreTracks(STEPS, state.value.tracks, state.value.durations);
// Shared with the UI examples page, so both pages open in the same theme.
const { state: appearance } = useSavedState(
  "baza:ui-appearance:v1",
  { theme: "light" },
  { theme: (value) => value === "light" || value === "dark" },
);

// Selection and the open step are transient, like time and play state.
const selection = ref({ step: STEPS[0].id, track: null });
const expanded = ref(null);
const playback = usePlayback({
  total: () => sequenceDuration(STEPS, state.value.durations),
  range: () => playRange(STEPS, state.value.durations, expanded.value),
  fps: () => state.value.export.fps,
});

// Preview frame: the composition's aspect ratio, uniformly fitted to the free space.
const size = computed(() => ASPECTS[state.value.aspect]);
const stage = ref(null);
const canvas = ref(null);
const frame = reactive({ width: 0, height: 0 });
function fitFrame() {
  if (!stage.value) return;
  const box = stage.value.getBoundingClientRect();
  const ratio = size.value.width / size.value.height;
  const width = Math.max(1, Math.min(box.width, box.height * ratio));
  frame.width = Math.floor(width);
  frame.height = Math.floor(width / ratio);
}

// Draw at most once per animation frame, whenever time, settings, or the frame change.
let request = 0;
function draw() {
  request = 0;
  const element = canvas.value;
  if (!element || !frame.width) return;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(frame.width * dpr);
  const height = Math.round(frame.height * dpr);
  if (element.width !== width) element.width = width;
  if (element.height !== height) element.height = height;
  render(element.getContext("2d"), { width, height }, state.value, state.value, playback.time);
}
const schedule = () => {
  if (!request) request = requestAnimationFrame(draw);
};
watch(() => playback.time, schedule);
watch(state, schedule, { deep: true });
watch(frame, schedule);
watch(size, fitFrame);
watch(() => [state.value.panelOpen, state.value.inspectorOpen, expanded.value], () => nextTick(fitFrame));

// Export renders a frozen snapshot offline; the preview and controls stay paused until it ends.
const output = computed(() => outputSize(size.value, state.value.export.longEdge));
const exporting = ref(false);
const controller = ref(null);
const progress = ref(null);
const exportStatus = ref("");
async function runExport() {
  if (exporting.value) return;
  const settings = { ...state.value.export, ...output.value, duration: playback.total, time: playback.time };
  const snapshot = clone(state.value);
  const video = settings.format !== "png";
  // Video is opaque; PNG may drop the background entirely.
  const look = video ? { ...snapshot, background: snapshot.background.map((stop) => ({ ...stop, alpha: 1 })) } : snapshot;
  const transparent = !video && settings.transparent;
  const wasPlaying = playback.playing;
  playback.playing = false;
  exporting.value = true;
  controller.value = new AbortController();
  exportStatus.value = video ? "Preparing encoder…" : "Rendering PNG…";
  try {
    const blob = await exportCanvas({
      settings,
      draw: (ctx, frame, time) => render(ctx, frame, look, snapshot, time, { transparent }),
      signal: controller.value.signal,
      onProgress: (step) => {
        progress.value = step;
        exportStatus.value = step.stage === "finalizing" ? "Finalizing…" : `Rendering frame ${step.done} of ${step.total}`;
      },
    });
    if (controller.value.signal.aborted) throw new DOMException("Export canceled.", "AbortError");
    download(blob, exportFilename("baza-demo-hello", settings));
    exportStatus.value = `Saved ${FORMATS[settings.format]} · ${settings.width} × ${settings.height} px · ${Math.ceil(blob.size / 1024)} KB`;
  } catch (error) {
    exportStatus.value = error.name === "AbortError" ? "Export canceled." : `Export failed: ${error.message}`;
    if (error.name !== "AbortError") console.error(error);
  } finally {
    exporting.value = false;
    controller.value = null;
    progress.value = null;
    if (wasPlaying) playback.playing = true;
  }
}

let observer = null;
onMounted(() => {
  observer = new ResizeObserver(fitFrame);
  observer.observe(stage.value);
  fitFrame();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(request);
});
</script>

<style scoped>
.workspace {
  --panel-width: 340px;
  --inspector-width: 320px;
  --gutter: 16px;
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: var(--ink);
  background: var(--surface);
}
.floating { box-shadow: 0 12px 40px rgb(0 0 0 / 0.18); }
/* Preview and timeline sit between the panels or their collapsed toggles; panels never cover them. */
.main {
  position: absolute;
  inset: 0 calc(40px + var(--gutter) * 2) 0 calc(40px + var(--gutter) * 2);
  display: flex;
  flex-direction: column;
  gap: var(--gutter);
  padding: var(--gutter) 0;
}
.panel-open .main { left: calc(var(--panel-width) + var(--gutter) * 2); }
.inspector-open .main { right: calc(var(--inspector-width) + var(--gutter) * 2); }
.stage {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  max-width: none;
  margin: 0;
  padding: 0;
}
.main > .timeline { flex: none; }
.frame {
  outline: 1px solid var(--line);
  --checker-light: #ffffff;
  --checker-dark: #d6d6d6;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.panel-toggle,
.inspector-toggle {
  position: absolute;
  top: var(--gutter);
  left: var(--gutter);
  width: 40px;
  height: 40px;
  min-height: 0;
  padding: 0;
  background: var(--paper);
}
.inspector-toggle {
  left: auto;
  right: var(--gutter);
}
.sidebar,
.inspector {
  position: absolute;
  top: var(--gutter);
  bottom: var(--gutter);
}
.inspector {
  right: var(--gutter);
  width: var(--inspector-width);
}
.sidebar {
  left: var(--gutter);
  width: var(--panel-width);
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 10px 10px 10px 16px;
  border-bottom: 1px solid var(--line);
}
.sidebar-header h1 {
  margin: 0;
  font: 500 14px/1.3 ui-monospace, SFMono-Regular, Consolas, monospace;
  letter-spacing: 0;
}
.sidebar-header a { color: inherit; }
.icon-button {
  width: 32px;
  min-height: 32px;
  padding: 0;
  border-color: transparent;
  background: transparent;
}
.sidebar-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 16px 16px;
}
.group {
  padding: 4px 0 14px;
  border-bottom: 1px solid var(--line);
}
.group:last-child { border-bottom: 0; }
.group > summary {
  cursor: pointer;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 600;
}
.group[open] > summary { margin-bottom: 4px; }
.readout { display: block; margin-top: 10px; font-size: 12px; color: var(--muted); }
.stack {
  display: grid;
  gap: 12px;
}
.color-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  margin: 14px 0 12px;
}
.color-label { font-size: 13px; color: var(--muted); }
.color-row :deep(.color-editor) { margin-top: 0; }
/* Graphic controls are standalone sections elsewhere; here they sit flush in the panel. */
.group :deep(section) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
}
.group :deep(section h2) { margin: 0; font-size: 13px; font-weight: 500; color: var(--muted); }
.group :deep(section > p) { margin: 4px 0 0; font-size: 12px; }
.group :deep(.graphic-panel) { margin: 10px 0 0; }
.export-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.export-actions .primary {
  flex: 1;
  color: var(--paper);
  background: var(--accent);
  border-color: var(--accent);
}
.export-actions .primary:hover:not(:disabled) { background: var(--muted); }
.export-actions .primary:disabled { color: var(--_disabled-fg); background: var(--soft); }
progress { width: 100%; margin-top: 10px; accent-color: var(--accent); }
.status { min-height: 18px; margin: 8px 0 4px; font-size: 12px; }
.note { font-size: 12px; margin: 10px 0 0; }

.desktop-only { display: none; }
@media (max-width: 720px), (max-height: 480px) {
  .main, .sidebar, .panel-toggle, .inspector, .inspector-toggle { display: none; }
  .desktop-only {
    display: grid;
    place-items: center;
    height: 100%;
    margin: 0;
    padding: 16px;
    text-align: center;
  }
}
</style>
