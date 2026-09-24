<!-- Ramp or envelope v-model with a compact, adaptive value scale. -->
<style scoped>
.curve-graph {
  display: block;
  width: 100%;
  touch-action: none;
  user-select: none;
  overflow: visible;
}
.curve-graph text { font-size: 8px; }
.graph-grid.minor { stroke-opacity: 0.5; }
.graph-zones { pointer-events: none; }
.graph-overflow { fill: var(--_plot-extended); }
.graph-main { fill: var(--_plot-area); }
.graph-frame { fill: none; stroke: var(--_plot-frame); vector-effect: non-scaling-stroke; }
.handle-line { stroke: var(--_plot-axis); stroke-width: 1; vector-effect: non-scaling-stroke; }
.point { cursor: grab; outline: none; }
.point:active { cursor: grabbing; }
.point .hit { fill: transparent; }
.point .mark {
  fill: var(--_plot-handle-fill);
  stroke: var(--_plot-handle-stroke);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.point.anchor .mark { fill: var(--_plot-value); }
.point:hover .mark { stroke-width: 3; }
.point .selection-ring { fill: none; stroke: transparent; pointer-events: none; }
.point[aria-pressed="true"] .mark {
  fill: var(--_selection-bg);
  stroke: var(--_selection-border);
}
.point[aria-pressed="true"] .selection-ring {
  stroke: var(--_selection-border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.point:focus-visible .hit {
  stroke: var(--focus, var(--accent));
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.playhead {
  stroke: var(--_plot-playhead);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.curve-dot { pointer-events: none; }
.preview-disclosure > summary {
  padding-block: 4px;
  font-size: 13px;
  cursor: pointer;
  touch-action: manipulation;
}
.preview-disclosure > summary:hover { color: var(--accent); }
.preview-disclosure > summary:focus-visible {
  outline: 2px solid var(--focus, var(--accent));
  outline-offset: 3px;
}
.preview-disclosure[open] > summary { margin-bottom: 10px; }
.preview-heading { justify-content: flex-end; margin-bottom: 10px; }
.curve-sample {
  height: 88px;
  position: relative;
  background: var(--_plot-extended);
}
.travel-domain {
  position: absolute;
  inset: 0 12px;
}
.travel-domain::before {
  content: "";
  position: absolute;
  left: var(--preview-start);
  width: calc(var(--preview-end) - var(--preview-start));
  height: 100%;
  background: var(--_plot-area);
  border-inline: 1px solid var(--_plot-boundary);
}
.travel-track {
  position: absolute;
  inset: 42px 0 auto;
  border-top: 1px solid var(--_plot-axis);
}
.curve-sample small {
  position: absolute;
  top: 62px;
  transform: translateX(-50%);
  color: var(--_plot-label);
  font: 10px ui-monospace, monospace;
  background: var(--_plot-area);
  padding-inline: 3px;
}
.travel-start { left: var(--preview-start); }
.travel-end { left: var(--preview-end); }
.curve-sample .travel-value {
  top: 12px;
  color: var(--_plot-value);
  font-size: 12px;
  white-space: nowrap;
}
.curve-sample .travel-overshoot {
  top: 64px;
  left: 85%;
  font: 9px system-ui, sans-serif;
}
.travel-point {
  position: absolute;
  width: 14px;
  height: 14px;
  top: 43px;
  transform: translate(-50%, -50%);
  background: var(--_plot-current);
  border: 2px solid var(--_plot-marker-outline);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--_plot-current);
}
.curve-value { margin-top: 10px; }
@media (max-width: 767px) {
  .curve-graph text { font-size: 11px; }
}
</style>

<template>
  <section :aria-label="title">
    <div class="row between">
      <h2>{{ title }}</h2>
      <button :aria-label="`Reset ${title}`" @click="reset">
        <Icon name="reset" />Reset
      </button>
    </div>
    <GraphicPanel flush>
    <svg
      ref="graph"
      class="curve-graph"
      :viewBox="`-16 -12 328 ${graphHeight + 44}`"
      role="group"
      :aria-label="title + ' graph'"
      @pointermove="drag"
      @pointerup="finish"
      @pointercancel="finish"
      @lostpointercapture="finish"
    >
      <!-- Grid density adapts to the value scale; heavier rules mark 0–100%. -->
      <g class="graph-zones" aria-hidden="true">
        <!-- All values remain editable; labeled boundaries distinguish the nominal domain. -->
        <rect class="graph-overflow" x="24" y="0" width="252" :height="graphHeight" />
        <rect class="graph-main" x="24" :y="py(1)" width="252" :height="viewport.height" />
        <rect class="graph-frame" x="24" y="0" width="252" :height="graphHeight" />
        <path
          v-for="step in 9"
          :key="`x-${step}`"
          :class="['graph-grid', 'plot-grid', { minor: step % 2 === 0 }]"
          :d="`M${px((step - 1) / 8)} 0V${graphHeight}`"
        />
        <template v-for="value in gridValues" :key="`y-${value}`">
          <path
            :class="[
              'graph-grid',
              value === 0 || value === 1 ? 'plot-boundary' : 'plot-grid',
            ]"
            :d="`M24 ${py(value)}H276`"
          />
          <text class="plot-label"
            v-if="value === 0 || value === 1"
            x="17"
            :y="py(value)"
            text-anchor="end"
            dominant-baseline="middle"
          >
            {{ Math.round(value * 100) }}%
          </text>
        </template>
        <text class="plot-label" x="276" y="-4" text-anchor="end">Overshoot</text>
        <text class="plot-label"
          v-for="x in [0, 1]"
          :key="`label-${x}`"
          :x="px(x)"
          :y="graphHeight + 14"
          text-anchor="middle"
        >
          {{ x * 100 }}%
        </text>
      </g>
      <path class="curve-path plot-shape" :d="path" />
      <template v-for="point in targets" :key="point.key">
        <line
          v-if="point.kind !== 'anchor'"
          class="handle-line"
          :x1="px(model[point.index].x)"
          :y1="py(model[point.index].y)"
          :x2="px(point.value.x)"
          :y2="py(point.value.y)"
        />
      </template>
      <line
        class="playhead"
        :x1="px(phase)"
        :x2="px(phase)"
        :y1="py(1)"
        :y2="py(0)"
      />
      <circle class="curve-dot plot-point" :cx="px(phase)" :cy="py(evaluated)" r="3" />
      <g
        v-for="point in targets"
        :key="point.key"
        :class="['point', point.kind]"
        :transform="`translate(${px(point.value.x)} ${py(point.value.y)})`"
        tabindex="0"
        role="button"
        :aria-label="point.name"
        :aria-pressed="
          selected.index === point.index && selected.kind === point.kind
        "
        :aria-description="`Time ${(point.value.x * 100).toFixed(1)}%, value ${(point.value.y * 100).toFixed(1)}%. Arrow keys adjust; Shift moves faster.`"
        @focus="select(point)"
        @click="select(point)"
        @pointerdown="start($event, point)"
        @keydown="nudge($event, point)"
      >
        <circle class="hit" r="12" />
        <circle class="selection-ring" r="7.5" />
        <circle class="mark" :r="point.kind === 'anchor' ? 5 : 4" />
      </g>
    </svg>
    <template #footer>
    <details class="preview-disclosure">
    <summary>Motion preview</summary>
    <div class="preview-heading row">
      <button
        @click="$emit('toggle-preview')"
        :aria-label="playing ? 'Pause motion preview' : 'Play motion preview'"
      >
        <Icon :name="playing ? 'pause' : 'play'" />{{
          playing ? "Pause" : "Play"
        }}
      </button>
    </div>
    <!-- Position uses the evaluated curve, not linear time; spare room keeps overshoot visible. -->
    <div class="curve-sample plot-surface" role="img" :style="previewStyle"
      :aria-label="`Output mapping: 0% is ${formatValue(outputRange.min)}; 100% is ${formatValue(outputRange.max)}.`">
      <div class="travel-domain">
        <div class="travel-track"></div>
        <span class="travel-point" :style="{ left: samplePosition * 100 + '%' }"></span>
        <small class="travel-start travel-value">{{ formatValue(outputRange.min) }}</small>
        <small class="travel-end travel-value">{{ formatValue(outputRange.max) }}</small>
        <small class="travel-start">0%</small>
        <small class="travel-end">100%</small>
        <small class="travel-overshoot">Overshoot</small>
      </div>
    </div>
    <output class="curve-value readout"
      >{{ propertyLabel || (envelope ? "Spread" : "Distance") }}
      {{ formatValue(mappedValue) }} ({{ (evaluated * 100).toFixed(1) }}%) at time
      {{ (phase * 100).toFixed(1) }}%</output
    >
    </details>
    </template>
    </GraphicPanel>
  </section>
</template>

<script setup>
import { ref, computed } from "vue";
import Icon from "./Icon.vue";
import GraphicPanel from "./GraphicPanel.vue";
import { clamp, clone, arrowDelta, remapValue } from "../lib/values.js";
import {
  rampDefault,
  envelopeDefault,
  evaluateCurve,
  moveCurvePoint,
} from "../lib/bezier.js";
import { graphHeight, curveViewport, curveGridValues, moveCurvePointInPlot } from "../lib/bezier-plot.js";
const model = defineModel({ type: Array, required: true });
const props = defineProps({
  envelope: Boolean,
  playing: Boolean,
  progress: { type: Number, default: 0 },
  outputRange: { type: Object, required: true },
  unit: { type: String, default: "" },
  propertyLabel: { type: String, default: "" },
});
defineEmits(["toggle-preview"]);
const graph = ref(null),
  selected = ref({ index: 0, kind: "out" });
let pointer = null;
const title = computed(() =>
  props.envelope ? "Bézier pulse envelope" : "Bézier timing ramp",
);
const phase = computed(() => clamp(props.progress, 0, 1));
const evaluated = computed(() => evaluateCurve(model.value, phase.value));
const mappedValue = computed(() => remapValue(evaluated.value, props.outputRange));
const valueFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const formatValue = (value) => `${valueFormatter.format(value)}${props.unit ? ` ${props.unit}` : ""}`;
const previewDomain = computed(() => ({
  min: Math.min(-0.75, viewport.value.min - 0.1),
  max: Math.max(1.75, viewport.value.max + 0.1),
}));
const previewPosition = (value) =>
  (value - previewDomain.value.min) / (previewDomain.value.max - previewDomain.value.min);
const samplePosition = computed(() => previewPosition(evaluated.value));
const previewStyle = computed(() => ({
  '--preview-start': `${previewPosition(0) * 100}%`,
  '--preview-end': `${previewPosition(1) * 100}%`,
}));
const current = computed(() =>
  selected.value.kind === "anchor"
    ? model.value[selected.value.index]
    : model.value[selected.value.index][selected.value.kind],
);
const viewport = computed(() => curveViewport(model.value));
const gridValues = computed(() => curveGridValues(model.value));
const px = (x) => 24 + x * 252,
  py = (y) => viewport.value.py(y);
const name = (i, kind) =>
  (i === 0 ? "Start" : i === model.value.length - 1 ? "Finish" : "Peak") +
  " " +
  (kind === "anchor"
    ? "anchor"
    : kind === "in"
      ? "incoming handle"
      : "outgoing handle");
const targets = computed(() =>
  model.value.flatMap((anchor, index) =>
    ["anchor", "in", "out"]
      .filter((kind) => kind === "anchor" || anchor[kind])
      .map((kind) => ({
        index,
        kind,
        key: `${index}-${kind}`,
        name: name(index, kind),
        value: kind === "anchor" ? anchor : anchor[kind],
      })),
  ),
);
const path = computed(() => {
  let d = `M ${px(model.value[0].x)} ${py(model.value[0].y)}`;
  model.value.slice(1).forEach((b, i) => {
    const a = model.value[i];
    d += ` C ${px(a.out.x)} ${py(a.out.y)} ${px(b.in.x)} ${py(b.in.y)} ${px(b.x)} ${py(b.y)}`;
  });
  return d;
});
function select(point) {
  selected.value = { index: point.index, kind: point.kind };
}
function move(x, y) {
  model.value = moveCurvePoint(model.value, selected.value, x, y);
}
function reset() {
  model.value = clone(props.envelope ? envelopeDefault : rampDefault);
  selected.value = { index: 0, kind: "out" };
}
function start(event, point) {
  if (event.button !== 0 || pointer) return;
  event.preventDefault();
  select(point);
  event.currentTarget.focus();
  const cursor = cursorPosition(event);
  if (!cursor) return;
  pointer = {
    id: event.pointerId,
    points: clone(model.value),
    offsetX: cursor.x - px(point.value.x),
    offsetY: cursor.y - py(point.value.y),
  };
  graph.value.setPointerCapture(pointer.id);
}
function cursorPosition(event) {
  const matrix = graph.value.getScreenCTM();
  if (!matrix) return;
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
}
function drag(event) {
  if (event.pointerId !== pointer?.id) return;
  const cursor = cursorPosition(event);
  if (!cursor) return;
  model.value = moveCurvePointInPlot(
    pointer.points, selected.value,
    (cursor.x - pointer.offsetX - 24) / 252,
    cursor.y - pointer.offsetY,
  );
}
function finish() {
  pointer = null;
}
function nudge(event, point) {
  select(point);
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    return;
  }
  const delta = arrowDelta(event);
  if (delta)
    move(current.value.x + delta.x / 100, current.value.y - delta.y / 100);
}
</script>
