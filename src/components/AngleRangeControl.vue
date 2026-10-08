<!-- Clockwise allowed interval via v-model: {start: 0..359, sweep: 0..360}, in whole degrees. -->
<style scoped>
.angle-range { display: block; width: 100%; height: 180px; touch-action: none; user-select: none; }
.sector { fill: var(--_plot-value); fill-opacity: 0.1; }
.arc { fill: none; stroke: var(--_plot-value); stroke-width: 3; }
.band { cursor: grab; outline: none; }
.band:focus-visible .arc { stroke-width: 6; }
.band:focus-visible .focus-ring { opacity: 1; }
.band-hit { fill: none; stroke: transparent; stroke-width: 20; }
.handle { cursor: grab; outline: none; }
.dragging, .dragging .handle, .dragging .band { cursor: grabbing; }
.handle-hit { fill: transparent; }
.handle-mark { fill: var(--_plot-handle-fill); stroke: var(--_plot-handle-stroke); stroke-width: 2; }
.handle-end .handle-mark { fill: var(--_plot-value); }
.focus-ring { fill: none; stroke: var(--_plot-current); stroke-width: 1.5; opacity: 0; }
.handle:hover .focus-ring, .handle:focus-visible .focus-ring { opacity: 1; }
.fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.readout { margin: 12px 0 0; }
</style>

<template>
  <section aria-label="Angle interval">
    <h2>Angle interval</h2>
    <p>Drag either endpoint to set the allowed arc, or drag the arc to rotate it.</p>
    <GraphicPanel>
      <svg ref="dial" class="angle-range plot-surface" :class="{ dragging: pointer !== null }"
        viewBox="0 0 320 180" role="group" aria-label="Allowed angle interval dial"
        @pointermove="drag" @pointerup="finish" @pointercancel="finish"
        @lostpointercapture="finish" @keydown.esc="cancel">
        <path class="plot-grid" d="M160 26V154M88 90H232" />
        <circle class="plot-axis" cx="160" cy="90" r="52" />
        <path v-for="tick in 24" :key="tick" class="plot-grid"
          :d="tick % 6 === 1 ? 'M160 32V44' : 'M160 35V39'"
          :transform="`rotate(${(tick - 1) * 15} 160 90)`" />
        <text class="plot-label" x="160" y="17" text-anchor="middle">0°</text>
        <text class="plot-label" x="242" y="94">90°</text>
        <text class="plot-label" x="160" y="170" text-anchor="middle">180°</text>
        <text class="plot-label" x="77" y="94" text-anchor="end">270°</text>
        <g class="band" role="slider" tabindex="0" aria-label="Rotate angle interval"
          :aria-valuenow="model.start" :aria-valuemin="0" :aria-valuemax="359"
          :aria-valuetext="`${model.start} to ${end} degrees clockwise; ${model.sweep} degrees allowed`"
          aria-description="Drag or use arrow keys to rotate the whole interval. Shift adjusts by 15 degrees."
          @pointerdown="start($event, 'band')" @keydown="nudge($event, 'band')" @blur="finish">
          <path class="sector" :d="`${arc} L160 90 Z`" />
          <path class="arc" :d="arc" />
          <path class="band-hit" :d="arc" />
          <circle class="focus-ring" cx="160" cy="90" r="9" />
        </g>
        <g v-for="part in ['start', 'end']" :key="part" class="handle" :class="`handle-${part}`"
          role="slider" tabindex="0" :aria-label="`${part === 'start' ? 'Start' : 'End'} angle handle`"
          :aria-valuemin="part === 'start' ? model.start + model.sweep - 360 : model.start"
          :aria-valuemax="part === 'start' ? model.start + model.sweep : model.start + 360"
          :aria-valuenow="part === 'start' ? model.start : model.start + model.sweep"
          :aria-valuetext="`${part === 'start' ? model.start : end} degrees; ${model.sweep} degrees allowed clockwise`"
          aria-description="Arrow keys adjust one degree; Shift adjusts 15. Home closes the interval; End allows a full turn. Escape cancels a drag."
          @pointerdown="start($event, part)" @keydown="nudge($event, part)" @blur="finish">
          <path class="plot-shape" :d="`M160 90 L${handles[part].x} ${handles[part].y}`" />
          <circle class="handle-hit" :cx="handles[part].x" :cy="handles[part].y" r="14" />
          <circle class="focus-ring" :cx="handles[part].x" :cy="handles[part].y" r="10" />
          <circle class="handle-mark" :cx="handles[part].x" :cy="handles[part].y" r="6" />
        </g>
        <circle cx="160" cy="90" r="3" fill="var(--_plot-value)" pointer-events="none" />
      </svg>
      <template #fields>
        <div class="fields">
          <NumberField label="Start (°)" :model-value="model.start" :min="0" :max="359" :step="1" @update:model-value="setEndpoint('start', $event)" />
          <NumberField label="End (°)" :model-value="end" :min="0" :max="359" :step="1" @update:model-value="setEndpoint('end', $event)" />
          <NumberField label="Allowed (°)" :model-value="model.sweep" :min="0" :max="360" :step="1" @update:model-value="model = { ...model, sweep: $event }" />
        </div>
      </template>
    </GraphicPanel>
    <output class="readout">{{ model.start }}° → {{ end }}° clockwise · {{ model.sweep }}° allowed</output>
    <p class="note">Zero points up; angles run clockwise and can cross 0°. Hollow handle: start. Solid handle: end. Shift adjusts by 15°.</p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import GraphicPanel from "./GraphicPanel.vue";
import NumberField from "./NumberField.vue";
import { angleAtPoint, rotationAtAngle } from "../lib/angle.js";
import { anglePoint, angleRangeArc, moveAngleRange, wrapDegrees } from "../lib/angle-range.js";

const model = defineModel({ type: Object, required: true });
const end = computed(() => wrapDegrees(model.value.start + model.value.sweep));
const arc = computed(() => angleRangeArc(model.value.start, model.value.sweep));
const handles = computed(() => {
  const near = Math.min(model.value.sweep, 360 - model.value.sweep) < 30;
  return { start: anglePoint(model.value.start, near ? 24 : 52), end: anglePoint(end.value) };
});
const dial = ref(null), pointer = ref(null);
let gesture = null;

function setEndpoint(part, value) {
  const start = part === "start" ? value : model.value.start;
  const finish = part === "end" ? value : end.value;
  const sweep = wrapDegrees(finish - start);
  model.value = { start, sweep: sweep === 0 && model.value.sweep === 360 ? 360 : sweep };
}

function pointerAngle(event) {
  const matrix = dial.value.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return angleAtPoint(point.x - 160, point.y - 90);
}

function start(event, part) {
  if (event.button !== 0 || event.isPrimary === false || pointer.value !== null) return;
  const angle = pointerAngle(event);
  if (angle === null) return;
  event.preventDefault();
  event.currentTarget.focus({ preventScroll: true });
  gesture = { part, initial: { ...model.value }, angle, rotation: angle };
  pointer.value = event.pointerId;
  dial.value.setPointerCapture(event.pointerId);
  window.addEventListener("blur", finish);
}

function drag(event) {
  if (event.pointerId !== pointer.value || !gesture) return;
  event.preventDefault();
  gesture.rotation = rotationAtAngle(gesture.rotation, pointerAngle(event), { min: -Infinity, max: Infinity }, 0.001);
  const step = event.shiftKey ? 15 : 1;
  const delta = Math.round((gesture.rotation - gesture.angle) / step) * step;
  model.value = moveAngleRange(gesture.initial, gesture.part, delta);
}

function finish(event) {
  if (event?.pointerId !== undefined && event.pointerId !== pointer.value) return;
  const id = pointer.value;
  pointer.value = null;
  gesture = null;
  window.removeEventListener("blur", finish);
  if (id !== null && dial.value?.hasPointerCapture(id)) dial.value.releasePointerCapture(id);
}

function cancel(event) {
  if (!gesture) return;
  event.preventDefault();
  model.value = gesture.initial;
  finish();
}

function nudge(event, part) {
  const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
  if (!direction && !["Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (direction) model.value = moveAngleRange(model.value, part, direction * (event.shiftKey ? 15 : 1));
  else if (part === "band") model.value = { ...model.value, start: event.key === "Home" ? 0 : 359 };
  else {
    const sweep = event.key === "Home" ? 0 : 360;
    model.value = moveAngleRange(model.value, part, (sweep - model.value.sweep) * (part === "start" ? -1 : 1));
  }
}
onBeforeUnmount(finish);
</script>
