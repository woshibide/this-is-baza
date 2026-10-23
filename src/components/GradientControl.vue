<!-- Spatial sRGB gradient v-model: [{hex, alpha, position}]. Stop identities stay stable while dragging. -->
<style scoped>
.gradient-track {
  position: relative;
  height: 62px;
  margin: 0 14px 14px;
  border: 1px solid var(--_plot-frame);
  border-radius: var(--plot-radius);
  touch-action: none;
}
.gradient-paint {
  height: 100%;
  border-radius: 4px;
}
.nominal {
  position: absolute;
  top: -1px;
  bottom: -1px;
  border-left: 1px solid var(--_plot-boundary);
  pointer-events: none;
}
.stop {
  position: absolute;
  top: 42px;
  transform: translateX(-50%);
  min-height: 30px;
  width: 30px;
  padding: 0;
  font:
    12px ui-monospace,
    monospace;
  touch-action: none;
}
.position {
  margin-top: 12px;
}
.stop .selection-check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 18px;
  height: 18px;
  padding: 1px;
  border: 2px solid var(--_plot-area);
  border-radius: 50%;
  background: var(--_selection-bg);
  color: var(--_selection-fg);
}
</style>

<template>
  <section :aria-label="heading">
    <h2>{{ heading }}</h2>
    <p>Drag a numbered stop or enter its exact position.</p>
    <GraphicPanel>
    <div
      ref="track"
      class="gradient-track checker"
      @pointermove="drag"
      @pointerup="finish"
      @pointercancel="finish"
      @lostpointercapture="finish"
    >
      <div class="gradient-paint" :style="{ background: gradient }"></div>
      <template v-if="view.min < 0 || view.max > 100">
        <div class="nominal" :style="{ left: place(0) + '%' }" aria-hidden="true"></div>
        <div class="nominal" :style="{ left: place(100) + '%' }" aria-hidden="true"></div>
      </template>
      <button
        v-for="(stop, i) in model"
        :key="i"
        class="stop"
        :style="{ left: place(stop.position) + '%' }"
        :aria-pressed="selected === i"
        :aria-label="`Stop ${i + 1}, position ${stop.position.toFixed(1)}%`"
        @click="selected = i"
        @pointerdown="start($event, i)"
        @keydown="nudge($event, i)"
      >
        {{ i + 1 }}
        <Icon name="check" class="selection-check" />
      </button>
    </div>
    <template #footer>
    <div class="row">
      <button :disabled="model.length >= 8" @click="add">
        <Icon name="plus" />Add stop</button
      ><button :disabled="model.length <= 2" @click="remove">
        Remove stop
      </button>
    </div>
    <ColorEditor :model-value="model[selected]" @update:model-value="update" />
    </template>
    <template #fields>
    <NumberField
      class="position"
      v-model:limits="bounds"
      label="Selected stop position %"
      :model-value="+model[selected].position.toFixed(2)"
      @update:model-value="setPosition"
    />
    </template>
    </GraphicPanel>
    <p class="note">
      Two to eight stops. Arrow keys move 1%; Shift moves 5%. Stops retain their
      identities when crossing. Limits outside 0–100% widen the track; lines mark 0% and 100%.
    </p>
  </section>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { effectiveLimits, clampToLimits, overshootView } from "../lib/numeric-limits.js";
import NumberField from "./NumberField.vue";
import GraphicPanel from "./GraphicPanel.vue";
import ColorEditor from "./ColorEditor.vue";
import Icon from "./Icon.vue";
import { rgba, arrowDelta } from "../lib/values.js";
defineProps({ heading: { type: String, default: "Gradient stops" } });
const model = defineModel({ type: Array, required: true }),
  selected = ref(0),
  track = ref(null);
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ min: 0, max: 100 }),
});
const effective = computed(() => effectiveLimits(bounds.value));
// The track shows 0–100% and widens to set limits and stops outside it; a drag keeps its starting view.
const frozen = ref(null);
const view = computed(
  () => frozen.value ?? overshootView(bounds.value, model.value.map((stop) => stop.position)),
);
const place = (position) =>
  ((position - view.value.min) / (view.value.max - view.value.min)) * 100;
watch(
  effective,
  (limits) => {
    model.value = model.value.map((stop) => ({
      ...stop,
      position: clampToLimits(stop.position, limits),
    }));
  },
  { immediate: true },
);
let pointer = null;
watch(
  () => model.value.length,
  (length) =>
    (selected.value = Math.max(0, Math.min(selected.value, length - 1))),
);
const gradient = computed(
  () =>
    `linear-gradient(90deg in srgb, ${[...model.value]
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${rgba(stop)} ${place(stop.position)}%`)
      .join(",")})`,
);
function update(value) {
  model.value = model.value.map((stop, i) =>
    i === selected.value ? { ...stop, ...value } : stop,
  );
}
function setPosition(value) {
  update({ position: clampToLimits(value, effective.value) });
}
function start(event, index) {
  if (event.button !== 0) return;
  event.preventDefault();
  selected.value = index;
  event.currentTarget.focus();
  pointer = event.pointerId;
  frozen.value = view.value;
  track.value.setPointerCapture(pointer);
  drag(event);
}
function drag(event) {
  if (event.pointerId !== pointer) return;
  const rect = track.value.getBoundingClientRect();
  const { min, max } = view.value;
  setPosition(min + ((event.clientX - rect.left) / rect.width) * (max - min));
}
function finish() {
  pointer = null;
  frozen.value = null;
}
function nudge(event, index) {
  const delta = arrowDelta(event);
  if (!delta) return;
  selected.value = index;
  setPosition(model.value[index].position + delta.x - delta.y);
}
function add() {
  if (model.value.length >= 8) return;
  const next = [
    ...model.value,
    {
      ...model.value[selected.value],
      position: clampToLimits(50, effective.value),
    },
  ];
  model.value = next;
  selected.value = next.length - 1;
}
function remove() {
  if (model.value.length <= 2) return;
  const next = model.value.filter((_, i) => i !== selected.value);
  model.value = next;
  selected.value = Math.min(selected.value, next.length - 1);
}
</script>
