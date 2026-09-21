<!-- Dimensions v-model: {width,height,locked}. Either field drives proportional resizing. -->
<style scoped>
.size-preview { display: block; width: 100%; height: 180px; }
.size-box { fill: var(--_plot-area); }
.size-value { fill: var(--_plot-value); font: 12px ui-monospace, monospace; }
.size-preview text { paint-order: stroke fill; stroke: var(--_plot-area); stroke-width: 3px; }
.aspect-lock { margin-top: 12px; }
</style>

<template>
  <section aria-label="Linked dimensions">
    <h2>Linked dimensions</h2>
    <p>Lock the current ratio to resize proportionally.</p>
    <GraphicPanel>
      <svg class="size-preview plot-surface" viewBox="0 0 400 180" role="img" :aria-label="`Dimensions preview: ${+model.width.toFixed(3)} by ${+model.height.toFixed(3)} pixels`">
        <path class="plot-grid" d="M200 16V164M16 80H384" />
        <rect class="size-box plot-shape" :x="200 - previewSize.width / 2" :y="80 - previewSize.height / 2" :width="previewSize.width" :height="previewSize.height" />
        <g :transform="`translate(${200 - previewSize.width / 2} ${80 + previewSize.height / 2 + 22})`">
          <path class="plot-axis" :d="`M0 -4V4M0 0H${previewSize.width}M${previewSize.width} -4V4`" />
          <text class="size-value" :x="previewSize.width / 2" y="-6" text-anchor="middle">{{ +model.width.toFixed(3) }} px</text>
          <text class="plot-label" :x="previewSize.width / 2" y="20" text-anchor="middle">Width</text>
        </g>
        <g :transform="`translate(${200 + previewSize.width / 2 + 16} ${80 - previewSize.height / 2})`">
          <path class="plot-axis" :d="`M-4 0H4M0 0V${previewSize.height}M-4 ${previewSize.height}H4`" />
          <text class="size-value" x="10" :y="previewSize.height / 2 - 4">{{ +model.height.toFixed(3) }} px</text>
          <text class="plot-label" x="10" :y="previewSize.height / 2 + 14">Height</text>
        </g>
      </svg>
      <template #footer>
    <div class="pair">
      <NumberField
        label="Width (px)"
        v-model:limits="bounds.width"
        managed-limits
        :limit-min="1"
        :model-value="+model.width.toFixed(3)"
        :min="effective.width.min"
        :max="effective.width.max"
        @update:model-value="resize('width', $event)"
      />
      <NumberField
        label="Height (px)"
        v-model:limits="bounds.height"
        managed-limits
        :limit-min="1"
        :model-value="+model.height.toFixed(3)"
        :min="effective.height.min"
        :max="effective.height.max"
        @update:model-value="resize('height', $event)"
      />
    </div>
    <label class="inline aspect-lock"
      ><input
        type="checkbox"
        :checked="model.locked"
        @change="model = { ...model, locked: $event.target.checked }"
      />Lock aspect ratio</label
    >
      </template>
    </GraphicPanel>
    <output class="readout"
      >{{ +model.width.toFixed(3) }} × {{ +model.height.toFixed(3) }} px · ratio
      {{ (model.width / model.height).toFixed(3) }}</output
    >
  </section>
</template>

<script setup>
import { computed, watch } from "vue";
import { effectiveLimits, clampToLimits } from "../lib/numeric-limits.js";
import NumberField from "./NumberField.vue";
import GraphicPanel from "./GraphicPanel.vue";
import { clamp } from "../lib/values.js";
const model = defineModel({ type: Object, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({
    width: { min: 1, max: 4096 },
    height: { min: 1, max: 4096 },
  }),
});
const effective = computed(() => ({
  width: effectiveLimits(bounds.value.width, 1),
  height: effectiveLimits(bounds.value.height, 1),
}));
watch(
  effective,
  (limits) => {
    model.value = {
      ...model.value,
      width: clampToLimits(model.value.width, limits.width),
      height: clampToLimits(model.value.height, limits.height),
    };
  },
  { immediate: true },
);
const previewSize = computed(() => {
  const scale = Math.min(192 / model.value.width, 100 / model.value.height);
  return {
    width: model.value.width * scale,
    height: model.value.height * scale,
  };
});
function resize(axis, value) {
  const other = axis === "width" ? "height" : "width",
    ratio = model.value[other] / model.value[axis];
  const next = model.value.locked
    ? clamp(
        value,
        Math.max(effective.value[axis].min, effective.value[other].min / ratio),
        Math.min(effective.value[axis].max, effective.value[other].max / ratio),
      )
    : value;
  model.value = {
    ...model.value,
    [axis]: next,
    ...(model.value.locked ? { [other]: next * ratio } : {}),
  };
}
</script>
