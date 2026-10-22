<!-- Inspector: the controls of whatever is selected in the timeline, in the workspace's right panel.
     A step shows its duration and keyframed elements; an element shows its keyframes, ease, and params.
     It reads the page's playback engine for the ease preview instead of running its own clock. -->
<template>
  <aside class="inspector" aria-label="Inspector">
    <header class="inspector-header">
      <nav class="crumbs" aria-label="Selection">
        <button
          class="crumb"
          :aria-current="track ? undefined : 'location'"
          :disabled="!track"
          @click="selection = { step: step.id, track: null }"
        >{{ step.name }}</button>
        <template v-if="track"><span aria-hidden="true">/</span><strong>{{ spec.name }}</strong></template>
      </nav>
      <button v-if="closable" class="icon-button" aria-label="Hide inspector" title="Hide inspector" @click="$emit('close')">
        <Icon name="panel-right-close" />
      </button>
    </header>

    <fieldset class="inspector-body" :disabled="disabled">
      <!-- Step -->
      <template v-if="!track">
        <div class="group" role="group" aria-label="Step">
          <h2>Step</h2>
          <SliderControl
            v-model="duration"
            v-model:bounds="limits"
            label="Duration (s)"
            :min="MIN_STEP"
            :max="max"
            :step="0.1"
          />
          <p class="note">Starts at {{ seconds(offset) }} s. Changing the duration keeps keyframes at the same relative times.</p>
        </div>
        <div class="group" role="group" aria-label="Elements">
          <h2>Elements</h2>
          <ul v-if="specs.length" class="elements">
            <li v-for="item in specs" :key="item.id">
              <button @click="selection = { step: step.id, track: item.id }">
                <strong>{{ item.name }}</strong>
                <small>{{ seconds(tracks[step.id][item.id].start) }}–{{ seconds(tracks[step.id][item.id].end) }} s</small>
              </button>
            </li>
          </ul>
          <p class="note">
            {{ specs.length
              ? "Double-click the step in the timeline to drag its keyframes."
              : "This step has no keyframed elements." }}
          </p>
        </div>
      </template>

      <!-- Keyframed element -->
      <template v-else>
        <div class="group" role="group" aria-label="Keyframes">
          <h2>Keyframes</h2>
          <div class="pair">
            <NumberField v-model="start" label="Start (s)" :min="0" :max="duration" :step="0.01" />
            <NumberField v-model="end" label="End (s)" :min="0" :max="duration" :step="0.01" />
          </div>
          <output class="readout">Length {{ seconds(track.end - track.start) }} s · step {{ seconds(duration) }} s</output>
        </div>

        <div class="group ease" role="group" aria-label="Ease">
          <div v-if="!spec.envelope" class="presets" role="group" aria-label="Ease presets">
            <button
              v-for="preset in CURVES"
              :key="preset.id"
              :aria-pressed="matches(preset)"
              @click="track.ease = ramp(preset.bezier)"
            >{{ preset.label }}</button>
          </div>
          <BezierControl
            v-model="track.ease"
            heading="Ease"
            :envelope="spec.envelope"
            :reset-curve="spec.ease"
            :progress="progress"
            :playing="playback.playing"
            :output-range="outputRange"
            :unit="outputRange.unit"
            :property-label="outputRange.label"
            @toggle-preview="playback.toggle()"
          />
        </div>

        <div v-if="params.length" class="group" role="group" aria-label="Parameters">
          <h2>Parameters</h2>
          <div class="stack">
            <template v-for="[key, param] in params" :key="key">
              <PositionControl v-if="param.position" v-model="track[key]" :heading="param.label" />
              <fieldset v-else-if="param.options">
                <legend>{{ param.label }}</legend>
                <div class="segmented">
                  <label v-for="[id, label] in param.options" :key="id"
                    ><input v-model="track[key]" type="radio" :name="`${spec.id}-${key}`" :value="id" /><span
                      ><Icon name="check" class="selection-check" />{{ label }}</span
                    ></label
                  >
                </div>
              </fieldset>
              <NumberField
                v-else
                v-model="track[key]"
                :label="param.label"
                :min="param.min"
                :max="param.max"
                :step="param.step"
              />
            </template>
          </div>
        </div>
      </template>
    </fieldset>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import NumberField from "./NumberField.vue";
import SliderControl from "./SliderControl.vue";
import BezierControl from "./BezierControl.vue";
import PositionControl from "./PositionControl.vue";
import Icon from "./Icon.vue";
import { clamp } from "../lib/values.js";
import { SAFE_MAX } from "../lib/numeric-limits.js";
import { MIN_STEP, CURVES, ramp, scaleTracks, seconds, stepAt, stepOffsets, trackValue } from "../lib/timeline.js";

const selection = defineModel("selection", { type: Object, required: true });
const durations = defineModel("durations", { type: Object, required: true });
const tracks = defineModel("tracks", { type: Object, required: true });
const limits = defineModel("limits", { type: Object, required: true });
const props = defineProps({
  steps: { type: Array, required: true },
  playback: { type: Object, required: true },
  max: { type: Number, default: SAFE_MAX }, // hard upper bound for a step's duration
  closable: Boolean,
  disabled: Boolean,
});
defineEmits(["close"]);

const index = computed(() => Math.max(0, props.steps.findIndex((s) => s.id === selection.value.step)));
const step = computed(() => props.steps[index.value]);
const offset = computed(() => stepOffsets(props.steps, durations.value)[index.value]);
const specs = computed(() => step.value.tracks);
const spec = computed(() => specs.value.find((s) => s.id === selection.value.track) ?? null);
const track = computed(() => (spec.value ? tracks.value[step.value.id][spec.value.id] : null));
const params = computed(() => Object.entries(spec.value?.params ?? {}));
const local = computed(() => props.playback.time - offset.value);
const progress = computed(() => trackValue(track.value, local.value).progress);
const outputRange = computed(() => spec.value.range?.(track.value) ?? { min: 0, max: 1, unit: "", label: "" });

// A new duration rescales this step's keyframes and keeps the playhead at the same progress.
const duration = computed({
  get: () => durations.value[step.value.id],
  set: (value) => {
    const id = step.value.id;
    const previous = durations.value[id];
    if (value === previous) return;
    const now = stepAt(props.steps, durations.value, props.playback.time);
    const next = { ...durations.value, [id]: value };
    if (tracks.value[id]) tracks.value = { ...tracks.value, [id]: scaleTracks(tracks.value[id], value / previous) };
    durations.value = next;
    if (now.index === index.value) props.playback.time = stepOffsets(props.steps, next)[now.index] + now.progress * value;
  },
});
// Typed keyframes push their partner so start never passes end.
const start = computed({
  get: () => track.value.start,
  set: (value) => {
    track.value.start = clamp(value, 0, duration.value);
    track.value.end = Math.max(track.value.end, track.value.start);
  },
});
const end = computed({
  get: () => track.value.end,
  set: (value) => {
    track.value.end = clamp(value, 0, duration.value);
    track.value.start = Math.min(track.value.start, track.value.end);
  },
});
const matches = ({ bezier: [x1, y1, x2, y2] }) => {
  const [a, b] = track.value.ease;
  return [a.out.x - x1, a.out.y - y1, b.in.x - x2, b.in.y - y2].every((d) => Math.abs(d) < 1e-6);
};
</script>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 10px 10px 10px 16px;
  border-bottom: 1px solid var(--line);
}
.crumbs {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  min-width: 0;
  font: 500 14px/1.3 ui-monospace, SFMono-Regular, Consolas, monospace;
}
.crumbs span { color: var(--muted); }
.crumbs strong {
  overflow: hidden;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.crumb {
  min-height: 0;
  height: auto;
  padding: 0;
  line-height: inherit;
  border: 0;
  background: transparent;
  font: inherit;
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.crumb:hover:not(:disabled) { color: var(--ink); background: transparent; }
.crumb:disabled {
  color: var(--ink);
  text-decoration: none;
  cursor: default;
}
.icon-button {
  width: 32px;
  min-height: 32px;
  padding: 0;
  border-color: transparent;
  background: transparent;
}
.inspector-body {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 4px 16px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 0;
}
.group {
  padding: 4px 0 14px;
  border-bottom: 1px solid var(--line);
}
.group:last-child { border-bottom: 0; }
.group h2 {
  margin: 10px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
/* Graphic controls are standalone sections elsewhere; here they sit flush in the panel. */
.group :deep(section) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
}
.group :deep(section > .row) { margin-top: 10px; }
.group :deep(section h2) { margin: 0; font-size: 13px; font-weight: 600; }
.group :deep(section > p) { margin: 4px 0 0; font-size: 12px; }
.group :deep(.graphic-panel) { margin: 10px 0 0; }
.stack {
  display: grid;
  gap: 12px;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.readout { display: block; margin-top: 8px; }
.note { font-size: 12px; margin: 10px 0 0; }
.elements {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.elements button {
  width: 100%;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  font-size: 12px;
}
.elements strong { font-weight: 550; }
.elements small { font: 10px ui-monospace, monospace; color: var(--muted); }
.presets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin-top: 12px;
}
.presets button {
  min-height: 28px;
  padding: 2px 4px;
  font-size: 11px;
}
.presets button[aria-pressed="true"] {
  border-color: var(--_selection-border);
  background: var(--_selection-bg);
  color: var(--_selection-fg);
}
legend { padding: 0; }
fieldset fieldset { margin: 0; padding: 0; border: 0; }
</style>
