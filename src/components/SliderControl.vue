<!-- Slider: Baza's control for one number. Drag the number, step with the -/+ buttons, or type an
     exact value; all three share the editable bounds (null removes a custom bound). This is what
     "slider" means in Baza: never a native <input type="range"> track. -->
<style scoped>
button {
  width: 32px;
  min-height: 32px;
  padding: 0;
  border-color: transparent;
  background: var(--surface);
}
button:hover:not(:disabled) {
  border-color: var(--muted);
}
button:active:not(:disabled) {
  background: var(--soft);
}
</style>
<template>
  <section :aria-label="heading || label">
    <template v-if="heading">
      <h2>{{ heading }}</h2>
      <p>Drag the number, step with the buttons, or enter an exact value.</p>
    </template>
    <NumberField
      v-model="model"
      v-model:limits="bounds"
      :label="label"
      :min="min"
      :max="max"
      :step="step"
    >
      <template #decrease
        ><button
          :disabled="model <= effective.min"
          :aria-label="`Decrease ${label}`"
          @click="nudge(-1)"
        >
          <Icon name="minus" /></button
      ></template>
      <template #increase
        ><button
          :disabled="model >= effective.max"
          :aria-label="`Increase ${label}`"
          @click="nudge(1)"
        >
          <Icon name="plus" /></button
      ></template>
    </NumberField>
  </section>
</template>
<script setup>
import { computed } from "vue";
import NumberField from "./NumberField.vue";
import Icon from "./Icon.vue";
import { effectiveLimits, clampToLimits, SAFE_MIN, SAFE_MAX } from "../lib/numeric-limits.js";
const model = defineModel({ type: Number, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ min: 1, max: 24 }),
});
const props = defineProps({
  label: { type: String, default: "Copies" },
  heading: { type: String, default: "" }, // gallery heading and hint; omit inside a panel
  min: { type: Number, default: SAFE_MIN }, // intrinsic domain; bounds stay within it
  max: { type: Number, default: SAFE_MAX },
  step: { type: Number, default: 1 }, // the buttons' increment; fractional steps work too
});
const effective = computed(() => effectiveLimits(bounds.value, props.min, props.max));
// Steps snap to the step grid so fractional steps never accumulate float error.
const decimals = computed(() => (String(props.step).split(".")[1] ?? "").length);
function nudge(direction) {
  const snapped = Math.round(model.value / props.step + direction) * props.step;
  model.value = clampToLimits(Number(snapped.toFixed(decimals.value)), effective.value);
}
</script>
