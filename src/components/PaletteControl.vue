<!-- An ordered array of alpha-aware colors. Selection is local; values flow through v-model. -->
<style scoped>
.palette-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.palette-count {
  color: var(--muted);
  font:
    12px ui-monospace,
    monospace;
}
.swatches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 12px;
  margin: 22px 0 16px;
}
.swatch {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
  text-align: left;
  min-width: 0;
}
.swatch-color {
  display: block;
  height: 112px;
}
.swatch-color > span {
  display: block;
  width: 100%;
  height: 100%;
}
.swatch-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: var(--paper);
  color: var(--ink);
}
.swatch-heading { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.swatch-label code {
  font-size: 11px;
}
.swatch-label small {
  font-size: 11px;
  color: var(--muted);
}
.swatch[aria-pressed="true"] {
  border-color: var(--_selection-border);
  box-shadow: 0 0 0 1px var(--_selection-border);
}
.swatch[aria-pressed="true"] .swatch-label {
  background: var(--_selection-bg);
  color: var(--_selection-fg);
}
.swatch[aria-pressed="true"] small { color: inherit; }
.swatch:hover {
  border-color: var(--ink);
}
.palette-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.palette-actions button {
  font-size: 13px;
}
</style>

<template>
  <section aria-label="Color and palette">
    <div class="palette-heading">
      <h2>Color &amp; palette</h2>
      <span class="palette-count">{{ model.length }} / 8 colors</span>
    </div>
    <div class="swatches" role="group" aria-label="Palette colors">
      <button
        v-for="(color, i) in model"
        :key="i"
        class="swatch"
        :aria-pressed="i === selected"
        :aria-label="`Color ${i + 1}: ${hexAlpha(color)}`"
        @click="edit(i)"
      >
        <span class="swatch-color checker"
          ><span :style="{ background: rgba(color) }"></span
        ></span>
        <span class="swatch-label"
          ><span class="swatch-heading"><code>{{ color.hex.toUpperCase() }}</code><Icon name="check" class="selection-check" /></span
          ><small>{{ Math.round(color.alpha * 100) }}% opacity</small></span
        >
      </button>
    </div>
    <div class="palette-actions">
      <button :disabled="model.length >= 8" @click="add">
        <Icon name="plus" />Add color</button
      ><button :disabled="model.length <= 1" @click="remove">
        Remove selected
      </button>
    </div>
    <ColorEditor
      ref="editor"
      :hide-trigger="true"
      :model-value="model[selected]"
      @update:model-value="update"
    />
  </section>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import ColorEditor from "./ColorEditor.vue";
import Icon from "./Icon.vue";
import { rgba, hexAlpha } from "../lib/values.js";
const editor = ref(null);
async function edit(index) {
  selected.value = index;
  await nextTick();
  editor.value.open();
}
const model = defineModel({ type: Array, required: true }),
  selected = ref(0);
watch(
  () => model.value.length,
  (length) =>
    (selected.value = Math.max(0, Math.min(selected.value, length - 1))),
);
function update(color) {
  model.value = model.value.map((entry, i) =>
    i === selected.value ? color : entry,
  );
}
function add() {
  if (model.value.length >= 8) return;
  const next = [...model.value, { ...model.value[selected.value] }];
  model.value = next;
  selected.value = next.length - 1;
}
function remove() {
  if (model.value.length <= 1) return;
  const next = model.value.filter((_, i) => i !== selected.value);
  model.value = next;
  selected.value = Math.min(selected.value, next.length - 1);
}
</script>
