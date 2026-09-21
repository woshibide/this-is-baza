<!-- Deterministic seed and variation v-model: {seed,variation}. Pure PRNG lives in values.js. -->
<style scoped>
.random-preview {
  width: 100%;
  height: 100px;
  display: block;
}
.random-fields {
  grid-template-columns: 1fr;
}
.regenerate {
  margin-top: 14px;
}
</style>

<template>
  <section aria-label="Repeatable randomness">
    <h2>Repeatable randomness</h2>
    <p>The same seed and variation reproduce the same arrangement.</p>
    <GraphicPanel>
    <svg
      class="random-preview plot-surface"
      viewBox="0 0 400 100"
      role="img"
      aria-label="Seeded dot arrangement"
    >
      <circle
        v-for="(point, i) in points"
        :key="i"
        :cx="point.x"
        :cy="point.y"
        :r="point.r"
        fill="var(--_plot-current)"
      />
    </svg>
    <template #footer>
    <div class="pair random-fields">
      <NumberField
        label="Seed"
        v-model:limits="bounds.seed"
        :model-value="model.seed"
        :min="0"
        :max="4294967295"
        :step="1"
        @update:model-value="model = { ...model, seed: $event }"
      /><NumberField
        label="Variation %"
        v-model:limits="bounds.variation"
        :model-value="model.variation"
        :min="0"
        :max="100"
        :step="1"
        @update:model-value="model = { ...model, variation: $event }"
      />
    </div>
    <button class="regenerate" @click="regenerate">
      <Icon name="reset" />Regenerate
    </button>
    </template>
    </GraphicPanel>
    <p class="note">Variation changes spread; Regenerate changes the seed.</p>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { effectiveLimits } from "../lib/numeric-limits.js";
import NumberField from "./NumberField.vue";
import GraphicPanel from "./GraphicPanel.vue";
import Icon from "./Icon.vue";
import { seededPoints } from "../lib/values.js";
const model = defineModel({ type: Object, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({
    seed: { min: 0, max: 4294967295 },
    variation: { min: 0, max: 100 },
  }),
});
const points = computed(() =>
  seededPoints(model.value.seed, model.value.variation),
);
function regenerate() {
  const limits = effectiveLimits(bounds.value.seed, 0, 4294967295);
  const size = limits.max - limits.min + 1;
  const seed =
    size === 1
      ? limits.min
      : limits.min +
        ((model.value.seed -
          limits.min +
          1 +
          Math.floor(Math.random() * (size - 1))) %
          size);
  model.value = { ...model.value, seed };
}
</script>
