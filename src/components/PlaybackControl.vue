<!-- Step timeline inspired by Rajanne: scene navigation, phase lanes, and one absolute RAF clock. Scenes meet at a cut; duration edits scale tracks. State belongs to the parent. -->
<style scoped>
.timeline {
  --track-label: 156px;
}
.transport {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.timeline-title {
  margin-right: auto;
}
.timeline-title small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}
.transport-buttons {
  display: flex;
  gap: 4px;
}
.transport-buttons button {
  min-width: 34px;
  padding: 6px 8px;
  font-size: 11px;
}
.transport-buttons .play {
  min-width: 78px;
  color: var(--paper);
  background: var(--ink);
  border-color: var(--ink);
  font-size: 13px;
  margin-right: 4px;
}
.clock {
  display: grid;
  gap: 1px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.clock output {
  font-size: 16px;
  white-space: nowrap;
}
.clock output span,
.clock small {
  color: var(--muted);
  font-size: 11px;
}
.fps {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 10px;
}
.fps select {
  width: 57px;
  height: 30px;
  padding: 2px 5px;
  font-size: 11px;
}
.scene-strip {
  display: flex;
  align-items: center;
  overflow-x: auto;
  gap: 0;
  margin: 22px 0;
  padding: 4px 3px 8px;
}
.scene-tab {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 16px;
  flex: 0 0 158px;
  gap: 7px 12px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 5px;
  position: relative;
}
.scene-tab .ordinal {
  font:
    11px ui-monospace,
    monospace;
  color: var(--muted);
  align-self: start;
  padding-top: 1px;
}
.scene-tab strong {
  font-size: 12px;
  font-weight: 550;
  display: block;
  max-width: 106px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.scene-tab small {
  display: block;
  font:
    10px ui-monospace,
    monospace;
  color: var(--muted);
  margin-top: 3px;
}
.scene-tab[aria-pressed="true"] {
  border-color: var(--_selection-border);
  background: var(--_selection-bg);
  color: var(--_selection-fg);
}
.scene-tab[aria-pressed="true"] :is(.ordinal, small) {
  color: inherit;
}
.scene-tab .selection-check { align-self: start; margin-top: 1px; }
.scene-tab .scene-playing { display: inline; font: inherit; }
.transition-link {
  display: flex;
  align-items: center;
  flex: none;
}
.transition-link::before,
.transition-link::after {
  content: "";
  width: 10px;
  height: 1px;
  background: var(--line);
}
.transition-link span {
  padding: 5px 7px;
  color: var(--muted);
  font-size: 10px;
}
.add-scene {
  flex: none;
  margin-left: 18px;
  border-style: dashed;
  font-size: 11px;
}
.scene-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin: 0 0 18px;
}
.scene-name {
  min-width: 0;
  max-width: 240px;
}
.scene-name span {
  font-size: 10px;
}
.scene-name input[type="text"] {
  font-size: 14px;
  font-weight: 550;
  padding-left: 0;
  border-color: transparent;
  height: 32px;
}
.scene-name input:hover,
.scene-name input:focus {
  border-color: var(--line);
  padding-left: 8px;
}
.scene-duration {
  width: 250px;
  flex-shrink: 0;
}
.scene-duration :deep(.field-label) {
  font-size: 10px;
}
.scene-duration :deep(input.bounded-value[type="number"]) {
  height: 32px;
  font-size: 15px;
}
.timeline-scroll {
  overflow-x: auto;
  padding: 12px 16px;
  border: 1px solid var(--_plot-frame);
  border-radius: var(--plot-radius);
  background: var(--_plot-surround);
}
.timeline-grid {
  min-width: 550px;
}
.ruler-row {
  display: grid;
  grid-template-columns: var(--track-label) 1fr;
  align-items: center;
}
.ruler-label {
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--_plot-label);
}
.ruler {
  height: 38px;
  position: relative;
  border-bottom: 1px solid var(--_plot-grid);
}
.tick {
  position: absolute;
  top: 0;
  height: 100%;
  border-left: 1px solid var(--_plot-grid);
  pointer-events: none;
}
.tick span {
  position: relative;
  display: block;
  transform: translateX(-50%);
  padding: 0 4px;
  background: var(--_plot-surround);
  font:
    10px ui-monospace,
    monospace;
  color: var(--_plot-label);
}
.tick:first-child span {
  transform: none;
  padding-left: 0;
}
.tick:last-of-type span {
  transform: translateX(-100%);
  padding-right: 0;
}
.ruler input[type="range"] {
  position: absolute;
  appearance: none;
  left: -6px;
  bottom: -1px;
  width: calc(100% + 12px);
  height: 22px;
  margin: 0;
  background: transparent;
  cursor: ew-resize;
}
.ruler input::-webkit-slider-runnable-track {
  height: 22px;
  background: transparent;
}
.ruler input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 16px;
  background: var(--_plot-playhead);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%);
}
.ruler input::-moz-range-track {
  height: 22px;
  background: transparent;
}
.ruler input::-moz-range-thumb {
  border: 0;
  border-radius: 0;
  width: 12px;
  height: 16px;
  background: var(--_plot-playhead);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%);
}
.scene-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  color: var(--muted);
  font-size: 10px;
}
.scene-footer output {
  font-size: 10px;
}
.scene-footer button {
  min-height: 28px;
  padding: 3px 7px;
  border-color: transparent;
  color: var(--muted);
  font-size: 10px;
}
@media (max-width: 720px) {
  .timeline {
    --track-label: 124px;
  }
  .transport {
    gap: 14px 10px;
  }
  .timeline-title {
    flex: 1;
  }
  .clock {
    order: 1;
    margin-left: auto;
  }
  .fps {
    order: 2;
  }
  .transport-buttons {
    order: 1;
  }
  .scene-strip {
    margin-top: 18px;
  }
  .scene-heading {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }
  .scene-duration {
    width: 100%;
  }
  .scene-name {
    max-width: none;
  }
  .timeline-grid {
    min-width: 540px;
  }

}
</style>

<template>
  <section class="timeline" aria-label="Playback and time" @keydown="shortcut">
    <div class="transport">
      <div class="timeline-title">
        <h2>Timeline</h2>
        <small>{{ model.length }} scenes · {{ seconds(total) }} s total</small>
      </div>
      <div class="transport-buttons">
        <button
          class="play"
          :aria-label="playing ? 'Pause timeline' : 'Play timeline'"
          @click="toggle"
        >
          <Icon :name="playing ? 'pause' : 'play'" />{{
            playing ? "Pause" : "Play"
          }}
        </button>
        <button
          aria-label="Restart playback"
          title="Restart playback"
          @click="scrub(0)"
        >
          <Icon name="reset" />
        </button>
        <button
          aria-label="Previous frame"
          :disabled="time <= 0"
          @click="step(-1)"
        >
          −1f
        </button>
        <button
          aria-label="Next frame"
          :disabled="time >= total"
          @click="step(1)"
        >
          +1f
        </button>
      </div>
      <div class="clock">
        <output
          >{{ time.toFixed(2) }} <span>/ {{ total.toFixed(2) }} s</span></output
        ><small>Frame {{ Math.round(time * fps) }}</small>
      </div>
      <label class="fps"
        ><select v-model.number="fps" aria-label="Frame rate">
          <option :value="24">24</option>
          <option :value="30">30</option>
          <option :value="60">60</option></select
        >fps</label
      >
    </div>

    <div class="scene-strip" role="group" aria-label="Sequence scenes">
      <template v-for="(entry, index) in model" :key="entry.id">
        <button
          class="scene-tab"
          :aria-pressed="selected === index"
          :aria-label="`Select ${entry.name}`"
          @click="selectScene(index)"
        >
          <span class="ordinal">{{ String(index + 1).padStart(2, "0") }}</span
          ><span
            ><strong>{{ entry.name }}</strong
            ><small>{{ seconds(entry.duration) }} s<span v-if="playing && position.index === index" class="scene-playing"> · Playing</span></small></span
          >
          <Icon name="check" class="selection-check" />
        </button>
        <div v-if="index < model.length - 1" class="transition-link">
          <span aria-label="Cut to next scene">Cut</span>
        </div>
      </template>
      <button class="add-scene" @click="addScene">
        <Icon name="plus" />Add scene
      </button>
    </div>

    <div class="scene-heading">
      <label class="scene-name"
        ><span>Scene {{ String(selected + 1).padStart(2, "0") }}</span
        ><input
          type="text"
          aria-label="Scene name"
          :value="scene.name"
          maxlength="48"
          @change="rename"
          @keydown.enter="$event.target.blur()"
      /></label>
      <NumberField
        :key="scene.id"
        class="scene-duration"
        label="Scene duration (s)"
        v-model="sceneDuration"
        v-model:limits="bounds"
        :min="MIN_SCENE_DURATION"
      />
    </div>
    <div class="timeline-scroll">
      <div class="timeline-grid">
        <div class="ruler-row">
          <span class="ruler-label">Element / seconds</span>
          <div class="ruler">
            <span
              v-for="index in 9"
              :key="index"
              class="tick"
              :style="{ left: `${((index - 1) / 8) * 100}%` }"
              aria-hidden="true"
              ><span>{{
                seconds(((index - 1) / 8) * scene.duration)
              }}</span></span
            >
            <input
              type="range"
              aria-label="Scene playhead"
              :aria-valuetext="`${seconds(localTime)} seconds in ${scene.name}`"
              min="0"
              :max="scene.duration"
              :step="1 / fps"
              :value="localTime"
              @input="scrubLocal($event.target.valueAsNumber)"
            />
          </div>
        </div>
        <TimelineLane
          v-for="(track, index) in TRACKS"
          :key="`${scene.id}-${track.id}`"
          :model-value="scene.tracks[track.id]"
          :label="track.label"
          :number="index + 1"
          :duration="scene.duration"
          :time="localTime"
          :selected="selectedTrack === track.id"
          @update:model-value="updateTrack(track.id, $event)"
          @select="selectedTrack = track.id"
          @edit="pause"
          @scrub="scrubLocal"
        />
      </div>
    </div>
    <div class="scene-footer">
      <output
        >{{ seconds(localTime) }} / {{ seconds(scene.duration) }} s in
        scene</output
      ><button :disabled="model.length === 1" @click="removeScene">
        Remove scene
      </button>
    </div>
  </section>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import NumberField from "./NumberField.vue";
import TimelineLane from "./TimelineLane.vue";
import Icon from "./Icon.vue";
import { clamp, clone } from "../lib/values.js";
import { effectiveLimits } from "../lib/numeric-limits.js";
import {
  TRACKS,
  MIN_SCENE_DURATION,
  seconds,
  sceneOffsets,
  sequenceDuration,
  sequencePosition,
  scaleScene,
} from "../lib/timeline.js";
const model = defineModel({ type: Array, required: true });
const bounds = defineModel("bounds", {
  type: Object,
  default: () => ({ min: 0.1, max: 60 }),
});
const fps = defineModel("fps", { type: Number, required: true });
const emit = defineEmits(["time", "playing"]);
const time = ref(0),
  playing = ref(false),
  selected = ref(0),
  selectedTrack = ref("ramp");
const total = computed(() => sequenceDuration(model.value));
const offsets = computed(() => sceneOffsets(model.value));
const position = computed(() => sequencePosition(model.value, time.value));
const scene = computed(() => model.value[selected.value]);
const localTime = computed(() =>
  clamp(time.value - offsets.value[selected.value], 0, scene.value.duration),
);
const sceneDuration = computed({
  get: () => scene.value.duration,
  set: (value) => {
    pause();
    model.value = scaleScene(model.value, selected.value, value);
  },
});
let start = 0,
  request = 0;
defineExpose({ toggle });
watch(playing, (value) => emit("playing", value));
function setTime(value, follow = true) {
  time.value = clamp(value, 0, total.value);
  if (follow) selected.value = position.value.index;
  emit("time", time.value);
}
function pause() {
  playing.value = false;
  cancelAnimationFrame(request);
}
function tick(now) {
  setTime((now - start) / 1000);
  if (time.value >= total.value) pause();
  else if (playing.value) request = requestAnimationFrame(tick);
}
function toggle() {
  if (playing.value) pause();
  else {
    if (time.value >= total.value) setTime(0);
    playing.value = true;
    start = performance.now() - time.value * 1000;
    request = requestAnimationFrame(tick);
  }
}
function scrub(value) {
  pause();
  setTime(value);
}
function scrubLocal(value) {
  pause();
  setTime(offsets.value[selected.value] + value, false);
}
function step(delta) {
  scrub((Math.round(time.value * fps.value) + delta) / fps.value);
}
function selectScene(index) {
  pause();
  selected.value = index;
  setTime(offsets.value[index], false);
}
function updateTrack(id, value) {
  model.value = model.value.map((entry, index) =>
    index === selected.value
      ? { ...entry, tracks: { ...entry.tracks, [id]: value } }
      : entry,
  );
}
function rename(event) {
  const name = event.target.value.trim();
  if (!name) {
    event.target.value = scene.value.name;
    return;
  }
  model.value = model.value.map((entry, index) =>
    index === selected.value ? { ...entry, name } : entry,
  );
}
async function addScene() {
  pause();
  const entry = clone(scene.value);
  entry.id = crypto.randomUUID();
  entry.name = `Scene ${String(model.value.length + 1).padStart(2, "0")}`;
  const index = model.value.length;
  model.value = [...model.value, entry];
  await nextTick();
  selectScene(index);
}
async function removeScene() {
  if (model.value.length === 1) return;
  pause();
  const index = selected.value;
  const next = model.value.filter((_, i) => i !== index);
  selected.value = Math.min(index, next.length - 1);
  model.value = next;
  await nextTick();
  setTime(sceneOffsets(model.value)[selected.value], false);
}
function shortcut(event) {
  if (
    event.code === "Space" &&
    !event.target.closest("input, select, button, summary, textarea")
  ) {
    event.preventDefault();
    toggle();
  }
}
watch(
  model,
  () => {
    pause();
    setTime(time.value, false);
  },
  { deep: true },
);
watch(fps, () => scrub(time.value));
watch(
  bounds,
  (value) => {
    const limits = effectiveLimits(value, MIN_SCENE_DURATION);
    let next = model.value;
    next.forEach((entry, index) => {
      const duration = clamp(entry.duration, limits.min, limits.max);
      if (duration !== entry.duration) next = scaleScene(next, index, duration);
    });
    if (next !== model.value) model.value = next;
  },
  { deep: true, immediate: true },
);
function visibility() {
  if (document.hidden) pause();
}
onMounted(() => document.addEventListener("visibilitychange", visibility));
onBeforeUnmount(() => {
  pause();
  document.removeEventListener("visibilitychange", visibility);
});
</script>
