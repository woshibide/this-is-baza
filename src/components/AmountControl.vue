<!-- Continuous numeric v-model. Slider and exact entry update the same scalar. -->
<style scoped>
.strength-preview {
  height: 80px;
  display: flex;
  align-items: center;
  padding: 20px;
}
.strength-line {
  width: 100%;
  background: var(--_plot-current);
}
</style>

<template>
  <section aria-label="Continuous amount">
    <h2>Continuous amount</h2>
    <p>A slider for exploration and a field for precision.</p>
    <div class="strength-preview preview">
      <div class="strength-line" :style="{ height: model + 'px' }"></div>
    </div>
    <label
      >Stroke thickness (px)<input
        type="range"
        min="1"
        max="24"
        step="0.1"
        v-model.number="model" /></label
    ><NumberField
      label="Exact thickness (px)"
      v-model="model"
      :min="1"
      :max="24"
      :step="0.1"
    />
  </section>
</template>

<script setup>
import NumberField from "./NumberField.vue";
const model = defineModel({ type: Number, required: true });
</script>
