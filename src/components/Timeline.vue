<!-- Step timeline: transport, ruler, a step strip proportional to durations, and one playhead.
     Click a step to jump to it and inspect it; double-click it to open its keyframe lanes, which loops it.
     The page owns the clock (usePlayback); this component reads it and reports selection and edits.
     Space plays and pauses, Escape closes an open step, unless a control has focus. -->
<template>
  <section class="timeline" aria-label="Timeline">
    <div class="transport">
      <div class="transport-buttons">
        <button class="play" :disabled="disabled" :aria-label="playback.playing ? 'Pause' : 'Play'" @click="playback.toggle()">
          <Icon :name="playback.playing ? 'pause' : 'play'" />{{ playback.playing ? "Pause" : "Play" }}
        </button>
        <button :disabled="disabled" aria-label="Restart" title="Restart" @click="playback.scrub(playback.range.start)"><Icon name="reset" /></button>
        <button :disabled="disabled || playback.time <= playback.range.start" aria-label="Previous frame" @click="playback.stepFrame(-1)">−1f</button>
        <button :disabled="disabled || playback.time >= playback.range.end" aria-label="Next frame" @click="playback.stepFrame(1)">+1f</button>
      </div>
      <output class="clock">
        {{ playback.time.toFixed(2) }} <span>/ {{ playback.total.toFixed(2) }} s · frame {{ Math.round(playback.time * playback.fps) }}</span>
      </output>
      <p v-if="scene" class="scene-note">Playback loops {{ scene.name }}</p>
    </div>

    <!-- Overview: the whole sequence. -->
    <div v-if="!scene" class="track">
      <div class="ruler">
        <span
          v-for="tick in overviewTicks"
          :key="tick"
          class="tick"
          :style="{ left: `${(tick / playback.total) * 100}%` }"
          aria-hidden="true"
        ><span>{{ tick }}</span></span>
        <input
          type="range"
          aria-label="Playhead"
          :aria-valuetext="`${playback.time.toFixed(2)} seconds, ${steps[current.index].name}`"
          min="0"
          :max="playback.total"
          :step="1 / playback.fps"
          :value="playback.time"
          :disabled="disabled"
          @input="playback.scrub($event.target.valueAsNumber)"
        />
      </div>
      <div class="steps" role="group" aria-label="Steps. Double-click a step to edit its keyframes.">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          class="step"
          :style="{ flexGrow: durations[step.id] }"
          :aria-pressed="selection.step === step.id && !selection.track"
          :aria-current="current.index === index ? 'step' : undefined"
          :aria-label="step.tracks.length ? `${step.name}. Double-click to edit keyframes.` : step.name"
          :title="step.tracks.length ? `${step.name} · double-click to edit keyframes` : step.name"
          :disabled="disabled"
          @click="openStep(index, false)"
          @dblclick="openStep(index, true)"
        >
          <span class="ordinal">{{ String(index + 1).padStart(2, "0") }}</span>
          <strong>{{ step.name }}</strong>
          <small>{{ seconds(durations[step.id]) }} s<template v-if="step.tracks.length"> · {{ step.tracks.length }} keyed</template></small>
        </button>
        <span class="playhead" :style="{ left: `${(playback.time / playback.total) * 100}%` }" aria-hidden="true" />
      </div>
    </div>

    <!-- One step opened: its keyframed elements, in step-local seconds. -->
    <div v-else class="track scene">
      <div class="scene-head">
        <button class="back" :disabled="disabled" @click="expanded = null"><Icon name="chevron-left" />All steps</button>
        <div class="ruler">
          <span
            v-for="tick in sceneTicks"
            :key="tick"
            class="tick"
            :style="{ left: `${(tick / scene.duration) * 100}%` }"
            aria-hidden="true"
          ><span>{{ tick }}</span></span>
          <input
            type="range"
            :aria-label="`${scene.name} playhead`"
            :aria-valuetext="`${local.toFixed(2)} seconds into ${scene.name}`"
            min="0"
            :max="scene.duration"
            :step="1 / playback.fps"
            :value="clamp(local, 0, scene.duration)"
            :disabled="disabled"
            @input="playback.scrub(scene.offset + $event.target.valueAsNumber)"
          />
        </div>
      </div>
      <KeyframeLane
        v-for="(spec, index) in scene.tracks"
        :key="spec.id"
        v-model="tracks[scene.id][spec.id]"
        :label="spec.name"
        :number="index + 1"
        :duration="scene.duration"
        :time="local"
        :selected="selection.track === spec.id"
        :disabled="disabled"
        @select="selection = { step: scene.id, track: spec.id }"
        @scrub="playback.scrub(scene.offset + $event)"
      />
      <p v-if="!scene.tracks.length" class="empty">{{ scene.name }} has no keyframed elements.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from "vue";
import Icon from "./Icon.vue";
import KeyframeLane from "./KeyframeLane.vue";
import { clamp } from "../lib/values.js";
import { seconds, stepAt, stepOffsets, ticks } from "../lib/timeline.js";

const tracks = defineModel("tracks", { type: Object, required: true });
// { step, track }: what the inspector shows. track is null for the step itself.
const selection = defineModel("selection", { type: Object, required: true });
// Id of the step whose lanes are open, or null for the overview. The page's playback range loops it.
const expanded = defineModel("expanded", { default: null });
const props = defineProps({
  steps: { type: Array, required: true },
  durations: { type: Object, required: true },
  playback: { type: Object, required: true },
  disabled: Boolean,
});

const offsets = computed(() => stepOffsets(props.steps, props.durations));
const current = computed(() => stepAt(props.steps, props.durations, props.playback.time));
const overviewTicks = computed(() => ticks(props.playback.total, [1, 2, 5, 10, 30, 60]));
const scene = computed(() => {
  const index = props.steps.findIndex((step) => step.id === expanded.value);
  if (index < 0) return null;
  const step = props.steps[index];
  return { ...step, offset: offsets.value[index], duration: props.durations[step.id] };
});
const local = computed(() => (scene.value ? props.playback.time - scene.value.offset : 0));
const sceneTicks = computed(() => ticks(scene.value.duration, [0.25, 0.5, 1, 2, 5, 10]));

function openStep(index, expand) {
  const step = props.steps[index];
  selection.value = { step: step.id, track: null };
  if (expand) expanded.value = step.id;
  props.playback.scrub(offsets.value[index]);
}

function shortcut(event) {
  if (props.disabled || event.target.closest?.("input, select, textarea, button, summary, [role=slider]")) return;
  if (event.code === "Space") {
    event.preventDefault();
    props.playback.toggle();
  } else if (event.key === "Escape" && expanded.value) expanded.value = null;
}
onMounted(() => window.addEventListener("keydown", shortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", shortcut));
</script>

<style scoped>
.timeline {
  --lane-label: 148px;
  display: grid;
  gap: 10px;
  padding: 12px 16px 14px;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.transport-buttons {
  display: flex;
  gap: 4px;
}
.transport-buttons button {
  min-width: 34px;
  min-height: 32px;
  padding: 4px 8px;
  font-size: 11px;
}
.transport-buttons .play {
  min-width: 78px;
  margin-right: 4px;
  color: var(--paper);
  background: var(--ink);
  border-color: var(--ink);
  font-size: 13px;
}
.clock {
  margin-right: auto;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.clock span {
  color: var(--muted);
  font-size: 11px;
}
.scene-note {
  margin: 0;
  white-space: nowrap;
  font: 11px ui-monospace, monospace;
  color: var(--muted);
}
.track {
  display: grid;
  gap: 4px;
}
.ruler {
  position: relative;
  height: 22px;
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
  display: block;
  padding: 0 4px;
  font: 10px ui-monospace, monospace;
  color: var(--_plot-label);
}
.ruler input[type="range"] {
  position: absolute;
  appearance: none;
  left: -6px;
  bottom: -1px;
  width: calc(100% + 12px);
  height: 22px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: ew-resize;
}
.ruler input:focus-visible {
  outline: 2px solid var(--focus, var(--accent));
  outline-offset: -2px;
}
.ruler input::-webkit-slider-runnable-track {
  height: 22px;
  background: transparent;
}
.ruler input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 16px;
  margin-top: 6px;
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
.steps {
  position: relative;
  display: flex;
  gap: 2px;
}
.step {
  flex-basis: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 8px;
  justify-content: stretch;
  align-items: baseline;
  padding: 6px 8px;
  border-radius: 4px;
  text-align: left;
}
.step .ordinal {
  grid-row: span 2;
  font: 10px ui-monospace, monospace;
  color: var(--muted);
}
.step strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.step small {
  overflow: hidden;
  font: 10px ui-monospace, monospace;
  color: var(--muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.step[aria-current="step"] {
  border-color: var(--_plot-axis);
}
.step[aria-pressed="true"] {
  border-color: var(--_selection-border);
  background: var(--_selection-bg);
  color: var(--_selection-fg);
}
.step[aria-pressed="true"] :is(.ordinal, small) {
  color: inherit;
}
.playhead {
  position: absolute;
  top: -5px;
  bottom: 0;
  width: 1px;
  margin-left: -0.5px;
  background: var(--_plot-playhead);
  box-shadow: 0 0 0 1px var(--paper);
  pointer-events: none;
  z-index: 1;
}
.scene-head {
  display: grid;
  grid-template-columns: var(--lane-label) minmax(0, 1fr);
  align-items: end;
}
.back {
  justify-self: start;
  min-height: 26px;
  margin-right: 10px;
  padding: 2px 8px 2px 4px;
  font-size: 12px;
}
.empty {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}
</style>
