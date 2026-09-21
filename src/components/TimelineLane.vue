<!-- One element lane. Drag a clip or its four boundaries; arrows nudge 0.01 s, Shift 0.1 s. Escape/pointer cancellation restores the initial track. -->
<style scoped>
.lane-row {
  display: grid;
  grid-template-columns: var(--track-label) minmax(0, 1fr);
  align-items: center;
}
.lane-label {
  padding: 8px;
  margin-right: 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  justify-content: flex-start;
  text-align: left;
  gap: 8px;
  min-width: 0;
}
.lane-label[aria-pressed="true"] {
  color: var(--_selection-fg);
  background: var(--_selection-bg);
  border-color: var(--_selection-border);
}
.lane-number { width: 16px; flex: none; }
.lane-label strong { overflow-wrap: anywhere; }
.lane-number {
  font:
    10px ui-monospace,
    monospace;
  color: var(--muted);
}
.lane-label strong {
  display: block;
  font-size: 12px;
  font-weight: 550;
}
.lane-label small {
  display: block;
  color: var(--muted);
  font-size: 10px;
  margin-top: 2px;
}
.lane-label[aria-pressed="true"] small {
  color: inherit;
}
.lane {
  position: relative;
  height: 84px;
  border-bottom: 1px solid var(--_plot-frame);
  background: var(--_plot-area) repeating-linear-gradient(
    to right,
    var(--_plot-grid) 0 1px,
    transparent 1px 12.5%
  );
}
.clip {
  position: absolute;
  display: flex;
  min-width: 0;
  top: 27px;
  height: 44px;
  min-height: 0;
  padding: 0;
  gap: 0;
  border: 1px solid var(--_plot-axis);
  border-radius: 3px;
  background: var(--_plot-area);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.clip:active {
  cursor: grabbing;
}
.selected .clip {
  border-color: var(--_selection-border);
  box-shadow: 0 0 0 1px var(--_selection-border);
}
.clip:hover { background: var(--_plot-area); border-color: var(--_plot-value); }
.phase {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  container-type: inline-size;
  border-right: 1px solid var(--_plot-axis);
}
.phase:last-child {
  border-right: 0;
}
.phase > span {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 11px;
}
.phase b {
  font-weight: 500;
}
.phase small {
  color: var(--_plot-label);
  font:
    10px ui-monospace,
    monospace;
}
.phase { background: var(--_plot-area); }
@container (max-width: 85px) {
  .phase small {
    display: none;
  }
}
@container (max-width: 38px) {
  .phase > span {
    visibility: hidden;
  }
}
.boundary {
  position: absolute;
  top: 23px;
  width: 16px;
  height: 52px;
  min-height: 0;
  padding: 0;
  transform: translateX(-50%);
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: ew-resize;
  touch-action: none;
}
.boundary::after {
  content: "";
  width: 3px;
  height: 16px;
  background: var(--_selection-border);
  border: 1px solid var(--_plot-area);
  border-radius: 2px;
  opacity: 0;
}
.selected .boundary::after,
.boundary:hover::after,
.boundary:focus-visible::after {
  opacity: 1;
}
.boundary:hover,
.boundary:focus-visible {
  background: color-mix(in srgb, var(--ink) 9%, transparent);
  z-index: 6 !important;
}
.marker {
  position: absolute;
  top: 0;
  bottom: -1px;
  width: 1px;
  background: var(--_plot-playhead);
  pointer-events: none;
  z-index: 8;
}
.now-marker {
  position: absolute;
  top: 3px;
  padding: 0 4px;
  border: 1px solid var(--_plot-playhead);
  border-radius: 2px;
  background: var(--_plot-area);
  color: var(--_plot-playhead);
  font: 10px/16px ui-monospace, monospace;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9;
}
</style>

<template>
  <div class="lane-row" :class="{ selected }">
    <button
      class="lane-label"
      :aria-pressed="selected"
      :aria-label="`Select ${label}`"
      @click="$emit('select')"
    >
      <Icon v-if="selected" name="check" />
      <span v-else class="lane-number">{{ String(number).padStart(2, "0") }}</span>
      <span
        ><strong>{{ label }}</strong
        ><small>{{ statusLabel }}</small></span
      >
    </button>
    <div ref="lane" class="lane" @pointerdown.self="scrub">
      <button
        class="clip"
        :style="{
          left: percent(model.start),
          width: percent(end - model.start),
        }"
        :aria-label="`Move ${label}`"
        :title="`${label}: ${seconds(model.start)}–${seconds(end)} s`"
        @click="$emit('select')"
        @pointerdown="start($event, 'move')"
        @pointermove="drag"
        @pointerup="finish()"
        @pointercancel="finish(true)"
        @lostpointercapture="finish()"
        @keydown="key($event, 'move')"
      >
        <span
          v-for="phase in PHASES"
          v-show="model[phase] > 0"
          :key="phase"
          class="phase"
          :class="[phase, { current: state.phase === phase }]"
          :aria-current="state.phase === phase ? 'time' : undefined"
          :style="{ flex: `${model[phase]} 1 0%` }"
          :title="`${phase}: ${seconds(model[phase])} s`"
        >
          <span
            ><b>{{ phase[0].toUpperCase() + phase.slice(1) }}</b
            ><small>{{ seconds(model[phase]) }}s</small></span
          >
        </span>
      </button>
      <button
        v-for="(value, index) in edges"
        :key="index"
        class="boundary"
        role="slider"
        :style="{ left: percent(value), zIndex: index + 2 }"
        :aria-label="`${label} ${edgeNames[index]}`"
        :aria-valuemin="index ? edges[index - 1] : 0"
        :aria-valuemax="index < 3 ? edges[index + 1] : duration"
        :aria-valuenow="value"
        :aria-valuetext="`${seconds(value)} seconds`"
        :title="`${edgeNames[index]} · ${seconds(value)} s`"
        @pointerdown="start($event, index)"
        @pointermove="drag"
        @pointerup="finish()"
        @pointercancel="finish(true)"
        @lostpointercapture="finish()"
        @keydown="key($event, index)"
      />
      <span
        class="marker"
        :style="{ left: percent(time) }"
        aria-hidden="true"
      />
      <span
        class="now-marker"
        :style="{ left: percent(time), transform: time > duration / 2 ? 'translateX(-100%)' : 'none' }"
        aria-hidden="true"
      >Now</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from "vue";
import Icon from "./Icon.vue";
import {
  PHASES,
  trackBounds,
  trackPhase,
  moveTrack,
  seconds,
} from "../lib/timeline.js";
import { clamp } from "../lib/values.js";
const model = defineModel({ type: Object, required: true });
const props = defineProps({
  label: String,
  number: Number,
  duration: Number,
  time: Number,
  selected: Boolean,
});
const emit = defineEmits(["select", "scrub", "edit"]);
const lane = ref(null);
const edges = computed(() => trackBounds(model.value));
const end = computed(() => edges.value[3]);
const state = computed(() => trackPhase(model.value, props.time));
const statusLabel = computed(() => {
  const phase = state.value.phase;
  if (phase === "waiting")
    return `Starts in ${seconds(model.value.start - props.time)} s`;
  if (phase === "finished") return "Track complete";
  return `Now: ${phase[0].toUpperCase() + phase.slice(1)}`;
});
const edgeNames = ["start", "intro end", "hold end", "end"];
const percent = (value) => `${(value / props.duration) * 100}%`;
let pointer = null;
function start(event, handle) {
  if (event.button !== 0) return;
  event.preventDefault();
  emit("select");
  emit("edit");
  event.currentTarget.focus({ preventScroll: true });
  pointer = {
    id: event.pointerId,
    target: event.currentTarget,
    x: event.clientX,
    width: lane.value.getBoundingClientRect().width,
    duration: props.duration,
    handle,
    track: { ...model.value },
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function drag(event) {
  if (!pointer || event.pointerId !== pointer.id) return;
  const delta =
    Math.round(
      ((event.clientX - pointer.x) / pointer.width) * pointer.duration * 100,
    ) / 100;
  model.value = moveTrack(
    pointer.track,
    pointer.handle,
    delta,
    pointer.duration,
  );
}
function finish(cancel = false) {
  if (!pointer) return;
  const saved = pointer;
  pointer = null;
  if (cancel) model.value = saved.track;
  if (saved.target.hasPointerCapture(saved.id))
    saved.target.releasePointerCapture(saved.id);
}
function key(event, handle) {
  if (event.key === "Escape") {
    finish(true);
    return;
  }
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  emit("select");
  emit("edit");
  model.value = moveTrack(
    model.value,
    handle,
    (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 0.1 : 0.01),
    props.duration,
  );
}
function scrub(event) {
  const box = lane.value.getBoundingClientRect();
  emit(
    "scrub",
    clamp((event.clientX - box.left) / box.width, 0, 1) * props.duration,
  );
}
onBeforeUnmount(() => finish());
</script>
