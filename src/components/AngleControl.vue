<!-- Rotation in degrees via v-model. Preserve full turns, even when the orientation wraps. -->
<style scoped>
.direction {
  display: block;
  width: 100%;
  height: 180px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.direction.dragging { cursor: grabbing; }
.direction:hover .plot-point,
.direction:focus-visible .plot-point { stroke: var(--_plot-area); stroke-width: 2px; }
</style>

<template>
  <section aria-label="Angle and direction">
    <h2>Angle &amp; direction</h2>
    <p>Click or drag the dial, or enter an exact rotation.</p>
    <GraphicPanel>
      <svg
        ref="dial"
        class="direction plot-surface"
        :class="{ dragging: pointer !== null }"
        viewBox="0 0 320 180"
        role="slider"
        tabindex="0"
        aria-label="Rotation dial"
        :aria-valuemin="effective.min"
        :aria-valuemax="effective.max"
        :aria-valuenow="model"
        :aria-valuetext="`${model} degrees; orientation ${((model % 360) + 360) % 360} degrees`"
        aria-description="Click or drag to rotate. Arrow keys adjust by one degree; Shift uses 15 degrees. Escape restores the starting rotation."
        @pointerdown="start"
        @pointermove="drag"
        @pointerup="finish"
        @pointercancel="finish"
        @lostpointercapture="finish"
        @blur="finish"
        @keydown="nudge"
      >
        <path class="plot-grid" d="M160 26V154M88 90H232" />
        <circle class="plot-axis" cx="160" cy="90" r="52" />
        <path v-for="tick in 24" :key="tick" class="plot-grid" :d="tick % 6 === 1 ? 'M160 32V44' : 'M160 35V39'" :transform="`rotate(${(tick - 1) * 15} 160 90)`" />
        <text class="plot-label" x="160" y="17" text-anchor="middle">0°</text>
        <text class="plot-label" x="242" y="94">90°</text>
        <text class="plot-label" x="160" y="170" text-anchor="middle">180°</text>
        <text class="plot-label" x="77" y="94" text-anchor="end">270°</text>
        <g :transform="`rotate(${model % 360} 160 90)`">
          <path class="plot-shape" d="M160 90V38" />
          <circle class="plot-point" cx="160" cy="38" r="6" />
        </g>
        <circle cx="160" cy="90" r="3" fill="var(--_plot-value)" />
      </svg>
      <template #footer>
    <NumberField
      label="Rotation (degrees)"
      v-model="model"
      v-model:limits="bounds"
      :step="1"
    />
      </template>
    </GraphicPanel>
    <output class="readout"
      >{{ model }}° stored · orientation
      {{ ((model % 360) + 360) % 360 }}°</output
    >
    <p class="note">
      Zero points up; positive turns clockwise. Shift snaps to 15°. Full turns are retained.
    </p>
  </section>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from "vue";
import NumberField from "./NumberField.vue";
import GraphicPanel from "./GraphicPanel.vue";
import { effectiveLimits, clampToLimits } from "../lib/numeric-limits.js";
import { angleAtPoint, rotationAtAngle } from "../lib/angle.js";
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ min: -36000, max: 36000 }),
});
const model = defineModel({ type: Number, required: true });
const effective = computed(() => effectiveLimits(bounds.value));
const dial = ref(null), pointer = ref(null);
let initial = 0;

function start(event) {
  if (event.button !== 0 || event.isPrimary === false || pointer.value !== null) return;
  event.preventDefault();
  initial = model.value;
  pointer.value = event.pointerId;
  dial.value.focus({ preventScroll: true });
  dial.value.setPointerCapture(event.pointerId);
  window.addEventListener("blur", finish);
  drag(event);
}

function drag(event) {
  if (event.pointerId !== pointer.value) return;
  const matrix = dial.value.getScreenCTM();
  if (!matrix) return;
  event.preventDefault();
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  model.value = rotationAtAngle(
    model.value,
    angleAtPoint(point.x - 160, point.y - 90),
    effective.value,
    event.shiftKey ? 15 : 1,
  );
}

function finish(event) {
  if (event?.pointerId !== undefined && event.pointerId !== pointer.value) return;
  const id = pointer.value;
  pointer.value = null;
  window.removeEventListener("blur", finish);
  if (id !== null && dial.value?.hasPointerCapture(id)) dial.value.releasePointerCapture(id);
}

function nudge(event) {
  if (event.key === "Escape" && pointer.value !== null) {
    event.preventDefault();
    model.value = clampToLimits(initial, effective.value);
    finish();
    return;
  }
  const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
  if (!direction && !["Home", "End"].includes(event.key)) return;
  event.preventDefault();
  model.value = clampToLimits(
    event.key === "Home" ? effective.value.min : event.key === "End" ? effective.value.max : model.value + direction * (event.shiftKey ? 15 : 1),
    effective.value,
  );
}
onBeforeUnmount(() => finish());
</script>
