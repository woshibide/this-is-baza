<!-- Shared graphical control frame. Geometry stays in the default slot; related controls share its footer. Uses plot tokens from styles.css. -->
<template>
  <div class="graphic-panel">
    <div class="graphic-content" :class="{ flush }"><slot /></div>
    <div v-if="$slots.footer" class="graphic-footer"><slot name="footer" /></div>
  </div>
</template>

<script setup>
defineProps({ flush: Boolean });
</script>

<style scoped>
.graphic-panel {
  margin: 18px 0;
  border: 1px solid var(--_plot-frame);
  border-radius: var(--plot-radius);
  background: var(--_plot-surround);
}
.graphic-content {
  min-width: 0;
  padding: 16px;
}
.graphic-content.flush {
  padding: 0;
}
.graphic-footer {
  min-width: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--_plot-frame);
  background: var(--_plot-footer);
  border-radius: 0 0 var(--plot-radius) var(--plot-radius);
}
</style>
