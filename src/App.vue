<!-- Gallery composition only. Read a control in components/ for its notes, scoped CSS, template, and script. -->
<style scoped>
.gallery-shell {
  min-height: 100dvh;
}
.gallery-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.theme-choice {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.theme-choice select {
  width: auto;
}
.gallery-title {
  margin: 0;
  color: var(--accent);
  font: 500 12px/1.5 ui-monospace, monospace;
  letter-spacing: 0.06em;
}
footer {
  margin-top: 22px;
  color: var(--muted);
  font-size: 12px;
}
</style>

<template>
  <div class="gallery-shell baza-theme" :data-ui-theme="appearance.theme">
  <a class="skip-link" href="#ramp">Skip to controls</a>
  <main>
    <header>
      <div class="gallery-heading">
      <h1 class="gallery-title">BAZA / UI COMPONENT REFERENCE</h1>
      <label class="theme-choice">Preview theme
        <select v-model="appearance.theme" name="preview-theme" autocomplete="off">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      </div>
      <nav aria-label="Control groups">
        <a href="#ramp">Timing</a><a href="#color">Color</a
        ><a href="#range">Range</a><a href="#position">Geometry</a
        ><a href="#count">Values</a><a href="#random">Randomness</a
        ><a href="#playback">Playback</a>
      </nav>
    </header>
    <div class="grid">
      <BezierControl
        id="ramp"
        v-model="state.ramp"
        :progress="previewProgress.ramp"
        :output-range="state.range"
        unit="px"
        :playing="playing"
        @toggle-preview="playback?.toggle()"
      />
      <BezierControl
        id="envelope"
        v-model="state.envelope"
        envelope
        :progress="previewProgress.envelope"
        :output-range="state.range"
        unit="px"
        :playing="playing"
        @toggle-preview="playback?.toggle()"
      />
      <PlaybackControl
        id="playback"
        ref="playback"
        class="wide"
        v-model="state.timeline"
        v-model:fps="state.fps"
        v-model:bounds="state.durationBounds"
        @time="time = $event"
        @playing="playing = $event"
      />
      <PaletteControl id="color" v-model="state.palette" />
      <GradientControl
        id="gradient"
        v-model="state.gradient"
        v-model:bounds="state.gradientBounds"
      />
      <RangeControl
        id="range"
        v-model="state.range"
        v-model:bounds="state.rangeBounds"
      />
      <PositionControl
        id="position"
        v-model="state.position"
        v-model:bounds="state.positionBounds"
      />
      <AngleControl
        id="angle"
        v-model="state.rotation"
        v-model:bounds="state.rotationBounds"
      />
      <DimensionsControl
        id="dimensions"
        v-model="state.dimensions"
        v-model:bounds="state.dimensionsBounds"
      />
      <CountControl
        id="count"
        v-model="state.count"
        v-model:bounds="state.countBounds"
      />
      <ChoiceControl id="choices" v-model="state.choices" />
      <RandomControl
        id="random"
        v-model="state.random"
        v-model:bounds="state.randomBounds"
      />
    </div>
    <footer>
      <span role="status">{{ status }}</span> Vue components with scoped styles.
      UI icons: <a href="https://lucide.dev">Lucide</a>.
      <span v-if="appearanceStatus !== 'Values save locally in this browser.'" role="status">{{ appearanceStatus }}</span>
    </footer>
  </main>
  </div>
</template>
<script setup>
import { ref, computed } from "vue";
import BezierControl from "./components/BezierControl.vue";
import PlaybackControl from "./components/PlaybackControl.vue";
import PaletteControl from "./components/PaletteControl.vue";
import GradientControl from "./components/GradientControl.vue";
import RangeControl from "./components/RangeControl.vue";
import PositionControl from "./components/PositionControl.vue";
import AngleControl from "./components/AngleControl.vue";
import DimensionsControl from "./components/DimensionsControl.vue";
import CountControl from "./components/CountControl.vue";
import ChoiceControl from "./components/ChoiceControl.vue";
import RandomControl from "./components/RandomControl.vue";
import { useSavedState } from "./composables/useSavedState.js";
import { defaults, validators } from "./lib/demo-state.js";
import {
  createTimeline,
  sequencePosition,
  trackProgress,
} from "./lib/timeline.js";
const { state, status } = useSavedState(
  "baza:ui-controls:v1",
  defaults,
  validators,
);
const { state: appearance, status: appearanceStatus } = useSavedState(
  "baza:ui-appearance:v1",
  { theme: "light" },
  { theme: (value) => value === "light" || value === "dark" },
);
const time = ref(0);
// Migrate the original single duration once; existing unrelated controls retain their state.
if (!state.value.timeline)
  state.value.timeline = createTimeline(state.value.duration);
const previewProgress = computed(() => {
  const { index, local } = sequencePosition(state.value.timeline, time.value);
  const { tracks } = state.value.timeline[index];
  return {
    ramp: trackProgress(tracks.ramp, local),
    envelope: trackProgress(
      tracks.envelope,
      local,
      state.value.envelope[1].x,
      1,
    ),
  };
});
const playing = ref(false);
const playback = ref(null);
</script>
