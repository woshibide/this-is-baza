<style scoped>
.theme-choice { flex-direction: row; align-items: center; gap: 8px; color: #54595d; }
.theme-choice select { width: auto; }
.reference-heading {
  margin: 36px 0 12px;
  scroll-margin-top: 20px;
  border-bottom: 1px solid #a2a9b1;
  color: #202122;
  font: 400 24px/1.3 Georgia, "Times New Roman", serif;
}
.reference-intro, .example-intro {
  margin: 12px 0 16px;
  color: #202122;
  font: 16px/1.6 Arial, sans-serif;
}
.example-anchor { scroll-margin-top: 20px; }
.example { scroll-margin-top: 20px; max-width: 600px; margin-bottom: 32px; }
.example-timeline { max-width: none; }
.examples-theme { background: transparent; }
.gallery-status { color: #54595d; font: 12px/1.6 Arial, sans-serif; }
</style>

<template>
  <PageLayout title="UI examples" page="examples" home-href="../" :contents="contents">
    <template #tools>
      <label class="theme-choice">Preview theme
        <select v-model="appearance.theme" name="preview-theme" autocomplete="off">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </template>
    <p class="reference-intro">Interactive controls for browser sketches. Each example shows a reusable way to edit a value, shape motion, or arrange a sequence. Changes save locally in this browser.</p>
    <div class="baza-theme examples-theme" :data-ui-theme="appearance.theme">
    <div class="reference-examples">
      <div id="ramp" class="example-anchor">
      <h2 id="timing" class="reference-heading">Timing</h2>
      <div class="example">
        <p class="example-intro">A Bézier ramp controls how a value changes over time. Move its handles to shape the acceleration and deceleration; the dot below the graph previews the resulting motion.</p>
      <BezierControl
        v-model="state.ramp"
        :progress="previewProgress.ramp"
        :output-range="state.range"
        unit="px"
        :playing="playing"
        @toggle-preview="playback?.toggle()"
      />
      </div>
      </div>
      <div class="example" id="envelope">
        <p class="example-intro">A pulse envelope rises to a peak and returns to its starting value. Adjust the peak and curve handles to shape a swell, flash, or other temporary change.</p>
      <BezierControl
        v-model="state.envelope"
        envelope
        :progress="previewProgress.envelope"
        :output-range="state.range"
        unit="px"
        :playing="playing"
        @toggle-preview="playback?.toggle()"
      />
      </div>
      <div class="example example-timeline" id="playback">
        <p class="example-intro">The timeline places motion within a sequence of scenes. Play or scrub the sequence to preview both curves above, and adjust each track’s intro, hold, and outro durations.</p>
      <PlaybackControl
        ref="playback"
        v-model="state.timeline"
        v-model:fps="state.fps"
        v-model:bounds="state.durationBounds"
        @time="time = $event"
        @playing="playing = $event"
      />
      </div>
      <div id="color" class="example-anchor">
      <h2 id="colors" class="reference-heading">Color</h2>
      <div class="example">
        <p class="example-intro">A palette keeps a small set of colors together. Select a swatch to edit its color and opacity, or add and remove colors as the sketch needs.</p>
      <PaletteControl  v-model="state.palette" />
      </div>
      </div>
      <div class="example" id="gradient">
        <p class="example-intro">A gradient blends colors between stops. Move the stops to change where each color appears, and edit their colors and opacity independently.</p>
      <GradientControl
        v-model="state.gradient"
        v-model:bounds="state.gradientBounds"
      />
      </div>
      <div id="range" class="example-anchor">
      <h2 id="ranges" class="reference-heading">Range</h2>
      <div class="example">
        <p class="example-intro">An interval defines a lower and upper value. Move either endpoint or shift the whole interval; here, the selected range also sets the pixel distances used by the two motion previews.</p>
      <RangeControl
        v-model="state.range"
        v-model:bounds="state.rangeBounds"
      />
      </div>
      </div>
      <div id="position" class="example-anchor">
      <h2 id="geometry" class="reference-heading">Geometry</h2>
      <div class="example">
        <p class="example-intro">An XY control places a point on a two-dimensional canvas. Drag the point for a visual adjustment, or enter exact coordinates and limits in the fields.</p>
      <PositionControl
        v-model="state.position"
        v-model:bounds="state.positionBounds"
      />
      </div>
      </div>
      <div class="example" id="angle">
        <p class="example-intro">An angle control sets direction or rotation. Use the dial for visual adjustments or enter degrees directly; complete turns are retained rather than discarded.</p>
      <AngleControl
        v-model="state.rotation"
        v-model:bounds="state.rotationBounds"
      />
      </div>
      <div class="example" id="dimensions">
        <p class="example-intro">Linked dimensions set width and height together. Lock the current aspect ratio to resize proportionally, or unlock it to change each dimension independently.</p>
      <DimensionsControl
        v-model="state.dimensions"
        v-model:bounds="state.dimensionsBounds"
      />
      </div>
      <div id="count" class="example-anchor">
      <h2 id="values" class="reference-heading">Values</h2>
      <div class="example">
        <p class="example-intro">A count control edits a whole-number quantity, such as copies or repetitions. Step through values with the buttons or enter a number within the chosen limits.</p>
      <CountControl
        v-model="state.count"
        v-model:bounds="state.countBounds"
      />
      </div>
      </div>
      <div class="example" id="choices">
        <p class="example-intro">Choices and toggles represent discrete settings. These examples show a mutually exclusive alignment, a shape selection, and an independent on/off option.</p>
      <ChoiceControl  v-model="state.choices" />
      </div>
    </div>
    </div>
    <p class="gallery-status">
      <span role="status">{{ status }}</span>
      <span v-if="appearanceStatus !== 'Values save locally in this browser.'" role="status">{{ appearanceStatus }}</span>
    </p>
  </PageLayout>
</template>
<script setup>
import { ref, computed } from "vue";
import PageLayout from "./PageLayout.vue";
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
const contents = [
  { id: "timing", label: "Timing" },
  { id: "ramp", label: "Bézier ramp", example: true },
  { id: "envelope", label: "Pulse envelope", example: true },
  { id: "playback", label: "Timeline", example: true },
  { id: "colors", label: "Color" },
  { id: "color", label: "Palette", example: true },
  { id: "gradient", label: "Gradient", example: true },
  { id: "ranges", label: "Range" },
  { id: "range", label: "Interval", example: true },
  { id: "geometry", label: "Geometry" },
  { id: "position", label: "XY position", example: true },
  { id: "angle", label: "Angle", example: true },
  { id: "dimensions", label: "Linked dimensions", example: true },
  { id: "values", label: "Values" },
  { id: "count", label: "Count", example: true },
  { id: "choices", label: "Choices and toggles", example: true },
];
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
