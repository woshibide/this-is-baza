<!-- Integer count with shared editable bounds. null removes a custom bound; steppers and exact entry use the same limits. -->
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
  <section aria-label="Integer count">
    <h2>Integer count</h2>
    <p>Whole-number increments with exact entry.</p>
    <NumberField
      v-model="model"
      v-model:limits="bounds"
      label="Copies"
      :step="1"
    >
      <template #decrease
        ><button
          :disabled="model <= effective.min"
          aria-label="Decrease copies"
          @click="model--"
        >
          <Icon name="minus" /></button
      ></template>
      <template #increase
        ><button
          :disabled="model >= effective.max"
          aria-label="Increase copies"
          @click="model++"
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
import { effectiveLimits } from "../lib/numeric-limits.js";
const model = defineModel({ type: Number, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ min: 1, max: 24 }),
});
const effective = computed(() => effectiveLimits(bounds.value));
</script>
