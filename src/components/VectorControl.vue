<!-- Direction and length via v-model: {angle: degrees with full turns, length: % of the dial radius, unbounded above}. -->
<style scoped>
.vector { display: block; width: 100%; height: 320px; cursor: grab; touch-action: none; user-select: none; }
.vector.dragging, .vector.dragging .length { cursor: grabbing; }
.direction, .length { outline: none; }
.length { cursor: grab; }
.length-hit { fill: transparent; }
.rail-hit { stroke: transparent; stroke-width: 20; }
.tip { fill: var(--_plot-handle-fill); stroke: var(--_plot-handle-stroke); stroke-width: 2; }
.focus-ring { fill: none; stroke: var(--_plot-current); stroke-width: 1.5; opacity: 0; }
.direction:focus-visible .focus-ring, .length:hover .focus-ring, .length:focus-visible .focus-ring { opacity: 1; }
.length:hover .plot-point, .length:focus-visible .plot-point { stroke: var(--_plot-area); stroke-width: 2px; }
</style>

<template>
  <section aria-label="Vector">
    <h2>Vector</h2>
    <p>Drag the dial to set direction; drag the point along the line to set length. Past the rim, the dial shrinks to show the length.</p>
    <GraphicPanel>
      <svg ref="dial" class="vector plot-surface" :class="{ dragging: pointer !== null }"
        role="group" aria-label="Vector dial"
        @pointerdown="start($event, 'angle')" @pointermove="drag" @pointerup="finish"
        @pointercancel="finish" @lostpointercapture="finish" @keydown.esc="cancel">
        <!-- Pixel units with the dial centered horizontally at (160, 160), whatever the panel width. -->
        <svg x="50%" overflow="visible"><g ref="frame" transform="translate(-160 0)">
        <path v-for="level in grid" :key="level.key" class="plot-grid" :d="level.d" :opacity="level.opacity" pointer-events="none" />
        <g :transform="`translate(160 160) scale(${scale}) translate(-160 -160)`" pointer-events="none">
          <circle class="plot-axis" cx="160" cy="160" r="128" />
          <path v-for="tick in 24" :key="tick" class="plot-grid" :d="tick % 6 === 1 ? 'M160 26V38' : 'M160 30V34'" :transform="`rotate(${(tick - 1) * 15} 160 160)`" />
        </g>
        <text v-for="label in labels" :key="label.degrees" class="plot-label" :x="label.x" :y="label.y" text-anchor="middle" :opacity="label.covered ? 0.2 : 1" pointer-events="none">{{ label.degrees }}°</text>
        <g :transform="`rotate(${model.angle % 360} 160 160)`">
          <g ref="direction" class="direction" role="slider" tabindex="0" aria-label="Vector direction"
            :aria-valuemin="angleLimits.min" :aria-valuemax="angleLimits.max" :aria-valuenow="model.angle"
            :aria-valuetext="`${model.angle} degrees; orientation ${orientation} degrees`"
            aria-description="Click or drag the dial to rotate. Arrow keys adjust by one degree; Shift uses 15 degrees. Escape cancels a drag."
            @keydown="nudge($event, 'angle')" @blur="finish">
            <path class="plot-guide" :d="`M160 160V${rail}`" />
            <path class="rail-hit" :d="`M160 160V${rail}`" />
            <circle class="tip" cx="160" :cy="rim" r="4" />
            <circle class="focus-ring" cx="160" :cy="rim" r="9" />
          </g>
          <path class="plot-shape" :d="`M160 160V${point}`" pointer-events="none" />
          <g class="length" role="slider" tabindex="0" aria-label="Vector length"
            :aria-valuemin="lengthLimits.min" :aria-valuemax="lengthLimits.max" :aria-valuenow="model.length"
            :aria-valuetext="`${model.length} percent of the dial radius`"
            aria-description="Drag along the line to change length. Arrow keys adjust by one percent; Shift uses 10. Escape cancels a drag."
            @pointerdown.stop="start($event, 'length')" @keydown="nudge($event, 'length')" @blur="finish">
            <circle class="length-hit" cx="160" :cy="point" r="14" />
            <circle class="focus-ring" cx="160" :cy="point" r="10" />
            <circle class="plot-point" cx="160" :cy="point" r="6" />
          </g>
        </g>
        <circle cx="160" cy="160" r="3" fill="var(--_plot-value)" pointer-events="none" />
        </g></svg>
      </svg>
      <template #fields>
        <div class="pair">
          <NumberField label="Rotation (degrees)" :model-value="model.angle" v-model:limits="bounds.angle" :step="1" @update:model-value="model = { ...model, angle: $event }" />
          <NumberField label="Length (%)" :model-value="model.length" v-model:limits="bounds.length" :min="0" :step="1" @update:model-value="model = { ...model, length: $event }" />
        </div>
      </template>
    </GraphicPanel>
    <output class="readout">{{ model.angle }}° stored · orientation {{ orientation }}° · length {{ model.length }}%</output>
    <p class="note">Zero points up; positive turns clockwise. Length is a percentage of the dial radius; past 100% the point stays on the outer ring while the dial and grid shrink to 100/length. The dashed line ends at the upper limit. Shift snaps to 15° or 10%. Full turns are retained.</p>
  </section>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from "vue";
import NumberField from "./NumberField.vue";
import GraphicPanel from "./GraphicPanel.vue";
import { effectiveLimits, clampToLimits } from "../lib/numeric-limits.js";
import { angleAtPoint, rotationAtAngle } from "../lib/angle.js";
import { alongDirection, dialScale, lengthAfterDrag, pointDistance } from "../lib/vector.js";

// Rest radius in pixels: the dial spans 80% of the 320px height.
const RADIUS = 128;
// Grid lines and the rail extend this far; wider than any panel, so the outer svg clips them.
const SPAN = 1600;
const model = defineModel({ type: Object, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ angle: { min: -36000, max: 36000 }, length: { min: 0, max: 200 } }),
});
const angleLimits = computed(() => effectiveLimits(bounds.value.angle));
const lengthLimits = computed(() => effectiveLimits(bounds.value.length, 0));
const orientation = computed(() => ((model.value.angle % 360) + 360) % 360);
const scale = computed(() => dialScale(model.value.length));
const rim = computed(() => 160 - RADIUS * scale.value);
const point = computed(() => 160 - RADIUS * pointDistance(model.value.length));
// The dashed rail runs to the upper limit at the current zoom; the outer svg clips it.
const rail = computed(() => Math.max(-SPAN, Math.min(rim.value, 160 - RADIUS * scale.value * lengthLimits.value.max / 100)));

// A vector reaching past the rim fades the cardinal label it crosses.
// Labels follow the shrinking rim but keep their type size.
const labels = computed(() => {
  const r = RADIUS * scale.value;
  return [[0, 160, 146 - r], [90, 175 + r, 155], [180, 160, 183 + r], [270, 145 - r, 155]].map(([degrees, x, y]) => ({
  degrees, x, y,
  covered: model.value.length > 100 && Math.abs(((orientation.value - degrees + 540) % 360) - 180) < 20,
}));
});

// Two grid levels centered on the dial; halving spacing cycles seamlessly, so zooming out never ends.
const grid = computed(() => {
  const zoom = -Math.log2(scale.value);
  const fraction = zoom - Math.floor(zoom);
  const spacing = 64 * 2 ** -fraction;
  return [[0, 1], [spacing / 2, 1 - fraction]].map(([offset, opacity]) => {
    let d = "";
    for (let at = offset; at <= SPAN; at += spacing)
      for (const side of at === 0 ? [0] : [at, -at])
        d += `M${160 + side} 0V320` + (160 + side >= 0 && 160 + side <= 320 ? `M${160 - SPAN} ${160 + side}H${160 + SPAN}` : "");
    return { key: offset ? "fine" : "coarse", d, opacity };
  });
});

const dial = ref(null), frame = ref(null), direction = ref(null), pointer = ref(null);
let gesture = null;

function start(event, part) {
  if (event.button !== 0 || event.isPrimary === false || pointer.value !== null) return;
  event.preventDefault();
  (part === "angle" ? direction.value : event.currentTarget).focus({ preventScroll: true });
  gesture = { part, initial: { ...model.value } };
  pointer.value = event.pointerId;
  dial.value.setPointerCapture(event.pointerId);
  window.addEventListener("blur", finish);
  drag(event);
}

function drag(event) {
  if (event.pointerId !== pointer.value || !gesture) return;
  const matrix = frame.value.getScreenCTM();
  if (!matrix) return;
  event.preventDefault();
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  model.value = gesture.part === "angle"
    ? { ...model.value, angle: rotationAtAngle(model.value.angle, angleAtPoint(x - 160, y - 160), angleLimits.value, event.shiftKey ? 15 : 1) }
    : { ...model.value, length: dragLength(alongDirection((x - 160) / RADIUS, (y - 160) / RADIUS, model.value.angle), event.shiftKey ? 10 : 1) };
}

// Relative to where the drag began, so grabbing the point never jumps the value.
function dragLength(along, step) {
  gesture.along ??= along;
  return lengthAfterDrag(gesture.initial.length, along - gesture.along, lengthLimits.value, step);
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
  const step = event.shiftKey ? (part === "angle" ? 15 : 10) : 1;
  const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
  if (!delta && !["Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const limits = part === "angle" ? angleLimits.value : lengthLimits.value;
  const value = event.key === "Home" ? limits.min : event.key === "End" ? limits.max : model.value[part] + delta * step;
  model.value = { ...model.value, [part]: clampToLimits(value, limits) };
}
onBeforeUnmount(() => finish());
</script>
