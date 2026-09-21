<!-- Ordered numeric bounds via v-model: {min,max}; drag the band to translate both bounds, or either end to resize; crossing clamps. -->
<style scoped>
.range-track {
  position: relative;
  height: 96px;
  touch-action: none;
  user-select: none;
  background-color: var(--_plot-area);
  border-block: 1px solid var(--_plot-frame);
  background-image: linear-gradient(90deg, var(--_plot-grid) 1px, transparent 1px);
  background-size: 25% 100%;
}
.range-track::before {
  content: "";
  position: absolute;
  inset: 47px 0 auto;
  border-top: 1px solid var(--_plot-axis);
}
.range-band {
  position: absolute;
  top: 25px;
  height: 44px;
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 2px;
  cursor: grab;
  touch-action: none;
}
.range-band::before {
  content: "";
  position: absolute;
  inset: 19px 0;
  background: var(--_plot-value);
  border-radius: 2px;
}
.range-band:hover,
.range-band:active { background: transparent; }
.range-band:hover::before,
.range-band:active::before { inset-block: 18px; }
.range-handle {
  position: absolute;
  top: 25px;
  width: 28px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  transform: translateX(-50%);
  cursor: ew-resize;
  touch-action: none;
}
.range-handle::after {
  content: "";
  width: 12px;
  height: 12px;
  border: 2px solid var(--_plot-handle-stroke);
  border-radius: 50%;
  background: var(--_plot-handle-fill);
}
.range-handle:hover { background: transparent; }
.range-handle:hover::after,
.range-handle:focus-visible::after { border-color: var(--_plot-current); }
.range-handle:focus-visible { z-index: 1; }
.range-band:active { cursor: grabbing; }
.range-readout { margin: 0; }
.range-value {
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  padding-inline: 3px;
  background: var(--_plot-area);
  color: var(--_plot-value);
  font: 12px ui-monospace, monospace;
  white-space: nowrap;
  pointer-events: none;
}
</style>

<template>
  <section aria-label="Range and interval">
    <h2>Range &amp; interval</h2>
    <p>Maps 0–100% to pixel values in both motion previews.</p>
    <GraphicPanel>
    <LimitsEditor v-model="bounds" label="Interval" layout="rail" integer>
      <div ref="track" class="range-track">
        <span v-if="percent(model.max) - percent(model.min) < 40"
          class="range-value" aria-hidden="true"
          :style="{ left: `clamp(48px, ${(percent(model.min) + percent(model.max)) / 2}%, calc(100% - 48px))` }"
        >{{ model.min === model.max ? model.min : `${model.min}–${model.max}` }} px</span>
        <template v-else>
          <span v-for="end in ['min', 'max']" :key="`value-${end}`"
            class="range-value" aria-hidden="true"
            :style="{ left: `clamp(24px, ${percent(model[end])}%, calc(100% - 24px))` }"
          >{{ model[end] }} px</span>
        </template>
        <button
          class="range-band"
          aria-label="Move entire interval"
          :style="{
            left: percent(model.min) + '%',
            width: percent(model.max) - percent(model.min) + '%',
          }"
          @pointerdown="startDrag($event, 'band')"
          @pointermove="drag"
          @pointerup="stopDrag"
          @pointercancel="stopDrag"
          @lostpointercapture="stopDrag"
          @keydown="nudge($event, 'band')"
        ></button>
        <button
          v-for="end in ['min', 'max']"
          :key="end"
          class="range-handle"
          role="slider"
          :aria-label="end === 'min' ? 'Minimum bound' : 'Maximum bound'"
          :aria-valuemin="end === 'min' ? effective.min : model.min"
          :aria-valuemax="end === 'min' ? model.max : effective.max"
          :aria-valuenow="model[end]"
          :aria-valuetext="model[end] + ' pixels'"
          :style="{ left: percent(model[end]) + '%' }"
          @pointerdown="startDrag($event, end)"
          @pointermove="drag"
          @pointerup="stopDrag"
          @pointercancel="stopDrag"
          @lostpointercapture="stopDrag"
          @keydown="nudge($event, end)"
        ></button>
      </div>
    </LimitsEditor>
    <template #footer>
      <output class="readout range-readout">{{ model.min }}–{{ model.max }} px</output>
    </template>
    </GraphicPanel>
  </section>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import LimitsEditor from "./LimitsEditor.vue";
import GraphicPanel from "./GraphicPanel.vue";
import {
  effectiveLimits,
  displayLimits,
  clampToLimits,
  moveInterval,
} from "../lib/numeric-limits.js";
const model = defineModel({ type: Object, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ min: 0, max: 100 }),
});
const effective = computed(() => effectiveLimits(bounds.value));
const scale = computed(() =>
  displayLimits(bounds.value, [model.value.min, model.value.max]),
);
function percent(value) {
  return (
    ((value - scale.value.min) / (scale.value.max - scale.value.min)) * 100
  );
}
watch(
  effective,
  (limits) => {
    model.value = {
      min: clampToLimits(model.value.min, limits),
      max: clampToLimits(model.value.max, limits),
    };
  },
  { immediate: true },
);
const track = ref(null);
let activeDrag = null;

function move(part, delta, initial = model.value) {
  model.value = moveInterval(initial, part, delta, effective.value);
}
function startDrag(event, part) {
  if (event.button !== 0 || activeDrag) return;
  event.preventDefault();
  event.currentTarget.focus();
  activeDrag = {
    part,
    pointerId: event.pointerId,
    x: event.clientX,
    width: track.value.getBoundingClientRect().width,
    initial: { ...model.value },
    span: scale.value.max - scale.value.min,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function drag(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  const { part, x, width, initial, span } = activeDrag;
  move(part, Math.round(((event.clientX - x) / width) * span), initial);
}
function stopDrag(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  activeDrag = null;
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);
}
function nudge(event, part) {
  const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[
    event.key
  ];
  if (!direction && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  const delta =
    event.key === "Home"
      ? scale.value.min - model.value[part === "band" ? "min" : part]
      : event.key === "End"
        ? scale.value.max - model.value[part === "band" ? "max" : part]
        : direction * (event.shiftKey ? 5 : 1);
  move(part, delta);
}
</script>
