<!-- Normalized XY v-model: {x,y} in percent. Coordinates are independent of display size. -->
<style scoped>
.xy-instrument {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px;
  grid-template-rows: 180px auto;
  gap: 12px 16px;
  margin: 0;
}
.xy-pad {
  position: relative;
  height: 100%;
  touch-action: none;
  user-select: none;
  overflow: visible;
  margin: 0;
}
.xy-excluded {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
}
.xy-allowed {
  position: absolute;
  border: 1px solid var(--_plot-boundary);
  pointer-events: none;
}
.xy-crosshair {
  position: absolute;
  pointer-events: none;
  border-color: var(--_plot-axis);
  border-style: dashed;
  border-width: 0;
}
.xy-crosshair.horizontal { left: 0; right: 0; border-top-width: 1px; }
.xy-crosshair.vertical { top: 0; bottom: 0; border-left-width: 1px; }
.xy-handle {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  width: 28px;
  min-height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  touch-action: none;
  cursor: grab;
}
.xy-handle::after {
  content: "";
  width: 14px;
  height: 14px;
  border: 2px solid var(--_plot-marker-outline);
  border-radius: 50%;
  background: var(--_plot-current);
  box-shadow: 0 0 0 1px var(--_plot-current);
}
.xy-handle:hover::after { box-shadow: 0 0 0 2px var(--_plot-current); }
.xy-handle:active { cursor: grabbing; }
@media (max-width: 767px) {
  .xy-instrument {
    grid-template-columns: minmax(0, 1fr) 55px;
    gap: 12px;
  }
}
</style>

<template>
  <section aria-label="XY position">
    <h2>XY position</h2>
    <p>Drag, use arrow keys, or enter exact coordinates.</p>
    <GraphicPanel>
    <div class="xy-instrument">
      <div
        ref="pad"
        class="xy-pad plot-surface plot-grid-surface"
        @pointerdown="start"
        @pointermove="drag"
        @pointerup="finish"
        @pointercancel="finish"
        @lostpointercapture="finish"
      >
        <svg class="xy-excluded" aria-hidden="true">
          <defs>
            <pattern :id="hatchId" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M-2 2L2-2 M0 8L8 0 M6 10L10 6" stroke="var(--_plot-hatch)" stroke-opacity="var(--plot-hatch-opacity, 0.7)" />
            </pattern>
            <mask :id="maskId">
              <rect width="100%" height="100%" fill="white" />
              <rect :x="xLimits.min + '%'" :y="yLimits.min + '%'" :width="(xLimits.max - xLimits.min) + '%'" :height="(yLimits.max - yLimits.min) + '%'" fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" :fill="`url(#${hatchId})`" :mask="`url(#${maskId})`" />
        </svg>
        <div v-if="restricted" class="xy-allowed" aria-hidden="true" :style="{ left: xLimits.min + '%', top: yLimits.min + '%', width: (xLimits.max - xLimits.min) + '%', height: (yLimits.max - yLimits.min) + '%' }"></div>
        <div class="xy-crosshair horizontal" :style="{ top: model.y + '%' }" aria-hidden="true"></div>
        <div class="xy-crosshair vertical" :style="{ left: model.x + '%' }" aria-hidden="true"></div>
        <button
          ref="handle"
          class="xy-handle"
          :style="{
            left: model.x + '%',
            top: model.y + '%',
          }"
          aria-label="Position point; use arrow keys to move"
          :aria-description="`X ${model.x.toFixed(1)}%, Y ${model.y.toFixed(1)}%. Allowed X ${xLimits.min}–${xLimits.max}%, Y ${yLimits.min}–${yLimits.max}%.`"
          @keydown="nudge"
        ></button>
      </div>
      <LimitsEditor
        v-model="bounds.y"
        label="Y %"
        layout="axis-y"
        axis="Y %"
        :hard-min="0"
        :hard-max="100"
      />
      <LimitsEditor
        v-model="bounds.x"
        label="X %"
        layout="axis-x"
        axis="X %"
        :hard-min="0"
        :hard-max="100"
      />
    </div>
    <template #footer>
    <div class="pair">
      <NumberField
        label="X %"
        :model-value="+model.x.toFixed(2)"
        :min="xLimits.min"
        :max="xLimits.max"
        @update:model-value="move($event, model.y)"
      /><NumberField
        label="Y %"
        :model-value="+model.y.toFixed(2)"
        :min="yLimits.min"
        :max="yLimits.max"
        @update:model-value="move(model.x, $event)"
      />
    </div>
    </template>
    </GraphicPanel>
    <p class="note">
      Fixed 0–100% canvas. Hatched areas are outside the limits. Shift nudges by 5%.
    </p>
  </section>
</template>

<script setup>
import { ref, computed, watch, useId } from "vue";
import { effectiveLimits } from "../lib/numeric-limits.js";
import LimitsEditor from "./LimitsEditor.vue";
import NumberField from "./NumberField.vue";
import GraphicPanel from "./GraphicPanel.vue";
import { clamp, arrowDelta } from "../lib/values.js";
const model = defineModel({ type: Object, required: true }),
  pad = ref(null),
  handle = ref(null);
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ x: { min: 0, max: 100 }, y: { min: 0, max: 100 } }),
});
const xLimits = computed(() => effectiveLimits(bounds.value.x, 0, 100));
const yLimits = computed(() => effectiveLimits(bounds.value.y, 0, 100));
watch([xLimits, yLimits], () => move(model.value.x, model.value.y), {
  immediate: true,
});
const hatchId = useId();
const maskId = useId();
const restricted = computed(() => xLimits.value.min > 0 || xLimits.value.max < 100 || yLimits.value.min > 0 || yLimits.value.max < 100);
let pointer = null;
function move(x, y) {
  model.value = {
    x: clamp(x, xLimits.value.min, xLimits.value.max),
    y: clamp(y, yLimits.value.min, yLimits.value.max),
  };
}
function start(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  handle.value.focus();
  pointer = event.pointerId;
  pad.value.setPointerCapture(pointer);
  drag(event);
}
function drag(event) {
  if (event.pointerId !== pointer) return;
  const rect = pad.value.getBoundingClientRect();
  move(
    ((event.clientX - rect.left) / rect.width) * 100,
    ((event.clientY - rect.top) / rect.height) * 100,
  );
}
function finish() {
  pointer = null;
}
function nudge(event) {
  const delta = arrowDelta(event);
  if (delta) move(model.value.x + delta.x, model.value.y + delta.y);
}
</script>
