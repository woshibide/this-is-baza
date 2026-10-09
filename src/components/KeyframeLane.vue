<!-- One keyframed element: drag the clip to move it, or its start and end keyframes to retime it.
     The clip draws the element's ease. Arrows nudge 0.01 s, Shift 0.1 s; Escape or pointer cancellation restores.
     Click the empty lane to scrub. -->
<template>
  <div class="lane-row" :class="{ selected }">
    <button
      class="lane-label"
      :aria-pressed="selected"
      :aria-label="`Select ${label}`"
      :disabled="disabled"
      @click="$emit('select')"
    >
      <span class="lane-number">{{ String(number).padStart(2, "0") }}</span>
      <strong>{{ label }}</strong>
    </button>
    <div ref="lane" class="lane" @pointerdown.self="scrub">
      <button
        class="clip"
        :style="{ left: percent(model.start), width: percent(model.end - model.start) }"
        :aria-label="`Move ${label}`"
        :title="`${label}: ${seconds(model.start)}–${seconds(model.end)} s`"
        :disabled="disabled"
        @click="$emit('select')"
        @pointerdown="start($event, 'move')"
        @pointermove="drag"
        @pointerup="finish()"
        @pointercancel="finish(true)"
        @lostpointercapture="finish()"
        @keydown="key($event, 'move')"
      >
        <svg class="ease" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path :d="easePath" /></svg>
        <small>{{ seconds(model.start) }}–{{ seconds(model.end) }} s</small>
      </button>
      <button
        v-for="edge in ['start', 'end']"
        :key="edge"
        class="keyframe"
        role="slider"
        :style="{ left: percent(model[edge]) }"
        :aria-label="`${label} ${edge}`"
        :aria-valuemin="edge === 'start' ? 0 : model.start"
        :aria-valuemax="edge === 'start' ? model.end : duration"
        :aria-valuenow="model[edge]"
        :aria-valuetext="`${seconds(model[edge])} seconds`"
        :title="`${label} ${edge} · ${seconds(model[edge])} s`"
        :disabled="disabled"
        @pointerdown="start($event, edge)"
        @pointermove="drag"
        @pointerup="finish()"
        @pointercancel="finish(true)"
        @lostpointercapture="finish()"
        @keydown="key($event, edge)"
      />
      <span v-if="time >= 0 && time <= duration" class="marker" :style="{ left: percent(time) }" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { clamp } from "../lib/values.js";
import { moveTrack, seconds } from "../lib/timeline.js";

const model = defineModel({ type: Object, required: true });
const props = defineProps({
  label: { type: String, required: true },
  number: { type: Number, required: true },
  duration: { type: Number, required: true },
  time: { type: Number, required: true }, // step-local; outside 0..duration hides the marker
  selected: Boolean,
  disabled: Boolean,
});
const emit = defineEmits(["select", "scrub"]);
const lane = ref(null);
const percent = (value) => `${(value / props.duration) * 100}%`;

// The ease drawn inside the clip, ramp or envelope; y is flipped so the curve rises upward.
const easePath = computed(() => {
  const points = model.value.ease;
  const at = (p) => `${p.x} ${1 - p.y}`;
  return points
    .slice(1)
    .reduce((path, point, i) => `${path}C${at(points[i].out)} ${at(point.in)} ${at(point)}`, `M${at(points[0])}`);
});

let pointer = null;
function start(event, handle) {
  if (event.button !== 0) return;
  event.preventDefault();
  emit("select");
  event.currentTarget.focus({ preventScroll: true });
  pointer = {
    id: event.pointerId,
    target: event.currentTarget,
    x: event.clientX,
    width: lane.value.getBoundingClientRect().width,
    handle,
    track: { ...model.value },
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function drag(event) {
  if (!pointer || event.pointerId !== pointer.id) return;
  const delta = Math.round(((event.clientX - pointer.x) / pointer.width) * props.duration * 100) / 100;
  model.value = moveTrack(pointer.track, pointer.handle, delta, props.duration);
}
function finish(cancel = false) {
  if (!pointer) return;
  const saved = pointer;
  pointer = null;
  if (cancel) model.value = saved.track;
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
  emit("select");
  model.value = moveTrack(model.value, handle, (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 0.1 : 0.01), props.duration);
}
function scrub(event) {
  const box = lane.value.getBoundingClientRect();
  emit("scrub", clamp((event.clientX - box.left) / box.width, 0, 1) * props.duration);
}
onBeforeUnmount(() => finish());
</script>

<style scoped>
.lane-row {
  display: grid;
  grid-template-columns: var(--lane-label) minmax(0, 1fr);
  align-items: center;
}
.lane-label {
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  min-height: 28px;
  margin-right: 10px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  text-align: left;
}
.lane-label strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.lane-number {
  flex: none;
  font: 10px ui-monospace, monospace;
  color: var(--muted);
}
.lane-label[aria-pressed="true"] {
  color: var(--_selection-fg);
  background: var(--_selection-bg);
  border-color: var(--_selection-border);
}
.lane-label[aria-pressed="true"] .lane-number { color: inherit; }
.lane {
  position: relative;
  height: 34px;
  border-bottom: 1px solid var(--_plot-frame);
  background: var(--_plot-area);
}
.clip {
  position: absolute;
  top: 6px;
  height: 22px;
  min-width: 2px;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--_plot-axis);
  border-radius: 3px;
  background: var(--_plot-area);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.clip:active { cursor: grabbing; }
.clip:hover:not(:disabled) { border-color: var(--_plot-value); background: var(--_plot-area); }
.selected .clip {
  border-color: var(--_selection-border);
  box-shadow: 0 0 0 1px var(--_selection-border);
}
.ease {
  position: absolute;
  inset: 3px 4px;
  width: calc(100% - 8px);
  height: calc(100% - 6px);
  overflow: visible;
  pointer-events: none;
}
.ease path {
  fill: none;
  stroke: var(--_plot-axis);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.selected .ease path { stroke: var(--_plot-value); }
.clip small {
  position: relative;
  padding: 0 6px;
  font: 10px ui-monospace, monospace;
  color: var(--_plot-label);
  white-space: nowrap;
  background: color-mix(in srgb, var(--_plot-area) 80%, transparent);
}
/* Keyframes: diamonds on the clip edges, widened hit area. */
.keyframe {
  position: absolute;
  top: 5px;
  width: 16px;
  height: 24px;
  min-height: 0;
  padding: 0;
  transform: translateX(-50%);
  border: 0;
  background: transparent;
  cursor: ew-resize;
  touch-action: none;
  z-index: 2;
}
.keyframe::after {
  content: "";
  width: 8px;
  height: 8px;
  transform: rotate(45deg);
  background: var(--_plot-area);
  border: 1px solid var(--_plot-axis);
}
.selected .keyframe::after,
.keyframe:hover::after,
.keyframe:focus-visible::after {
  background: var(--_selection-border);
  border-color: var(--_selection-border);
}
.keyframe:focus-visible { outline: 2px solid var(--focus, var(--accent)); outline-offset: 0; border-radius: 3px; }
.marker {
  position: absolute;
  top: 0;
  bottom: -1px;
  width: 1px;
  margin-left: -0.5px;
  background: var(--_plot-playhead);
  pointer-events: none;
  z-index: 3;
}
</style>
