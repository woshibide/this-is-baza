# Baza controls in vanilla JavaScript

This folder is a plain JavaScript port of the Baza controls, timeline, inspector, and workspace demo.
It runs as ES modules in the browser with no framework and no build step.

It is a dated snapshot: it was ported from the Vue components at commit `6e24fca` on 2026-10-23, together with the later change that removed every hardcoded range from editable limits (`e18abbb`).
The Vue components in `src/components/` stay the canonical reference, and this port is not kept in sync with later changes to them.
Use it for projects without a framework or build step; Vue projects should reuse the Vue components.

The [vanilla gallery](examples/index.html) and the [vanilla workspace demo](examples/demo/index.html) show every module working.
Run `npm run start` and open `/vanilla/examples/` and `/vanilla/examples/demo/`, or serve the repository root with any static server, for example `python3 -m http.server`.

## What to copy

Keep the folder layout, because the modules import each other and the shared helpers by relative paths:

| Path | Contents |
| --- | --- |
| `src/lib/` | Framework-free helpers shared with the Vue components: limits, number dragging, colors, curves, angles, timeline, export. |
| `src/theme.css` | Theme tokens for the light and dark presets. |
| `src/styles.css` | Shared native-control and plot styles; imports `theme.css`. |
| `vanilla/dom.js` | Small DOM, prop, and model helpers used by every component. |
| `vanilla/components/` | One module per Vue component. |
| `vanilla/components.css`, `vanilla/controls.css` | Component styles, and the stylesheet to link, which loads them before `src/styles.css`. |
| `vanilla/playback.js`, `vanilla/saved-state.js` | The page's clock and its saved state. |
| `THIRD_PARTY_NOTICES.txt` | The Lucide icon license; keep it with `vanilla/components/icon.js`. |

Link `vanilla/controls.css` on the page.
Like the Vue reference, `src/styles.css` styles native elements such as `label`, `input`, `button`, `section`, `h2`, and `p` globally, so use it on a page dedicated to the workspace.
Put the controls inside an element with `class="baza-theme"` and `data-ui-theme="light"` or `"dark"`.

## Component contract

Every module exports one factory, `create<ComponentName>(props)`, which returns `{ element, update(partialProps), destroy() }`.
ColorEditor also returns `open()`, the method its Vue version exposes.

```js
import { createSliderControl } from "./vanilla/components/slider-control.js";

let copies = 8;
let copiesLimits = { min: 1, max: 200 };
const slider = createSliderControl({
  label: "Copies",
  value: copies,
  bounds: copiesLimits,
  step: 1,
  onInput: (value) => {
    copies = value;
    slider.update({ value });
    drawArtwork();
  },
  onBoundsInput: (bounds) => {
    copiesLimits = bounds;
    slider.update({ bounds });
  },
});
panel.append(slider.element);
slider.destroy(); // when the panel goes away
```

- Props have the names of the Vue props.
  A Vue `v-model` becomes the prop `value` with the callback `onInput`; a named model such as `v-model:bounds` becomes `bounds` with `onBoundsInput`.
- The owner holds the state.
  A component never changes the object it was given: it calls the callback with a new value, and the owner passes it back with `update()`.
  When the owner passes a model value without its callback, the component keeps that value itself, as a Vue component does without `v-model`.
- Vue events become callbacks: `toggle-preview` is `onTogglePreview`, `close` is `onClose`, `select` is `onSelect`.
- Vue slots become props that take a node or an array of nodes: GraphicPanel's `content`, `footer`, and `fields`, NumberField's `decrease` and `increase`, LimitsEditor's `content`.
- A missing required prop, a prop of the wrong type, a failed validator, or an unknown prop throws an `Error` naming the component and the prop.
  The Vue components only warn in development.
- `update()` takes any subset of the props and patches only the DOM that changed, so a field being typed in keeps its draft and focus.
- A component may report a corrected value while it is being created, for example a value clamped to its bounds.
  It keeps that value itself, so an owner only needs to save it; the owner's later `update()` with the same value changes nothing.
- Editable min and max limits are the user's clamp on a value and are never clamped themselves, as [Editable limits are never clamped](../references/ui-controls.md#editable-limits-are-never-clamped) describes.
  SliderControl has no `min` or `max` props, so passing them throws; give it `bounds` instead.
- Components own neither storage nor a clock.
  Add classes to `element` as needed; the components only toggle their own classes.
  Classes that start with `baza-` are the port's styling hooks for roots that have no class in Vue.

| Vue component | Module | Factory |
| --- | --- | --- |
| Icon | `components/icon.js` | `createIcon` |
| GraphicPanel | `components/graphic-panel.js` | `createGraphicPanel` |
| LimitValue | `components/limit-value.js` | `createLimitValue` |
| LimitsEditor | `components/limits-editor.js` | `createLimitsEditor` |
| NumberField | `components/number-field.js` | `createNumberField` |
| SliderControl | `components/slider-control.js` | `createSliderControl` |
| ChoiceControl | `components/choice-control.js` | `createChoiceControl` |
| ColorEditor | `components/color-editor.js` | `createColorEditor` |
| PaletteControl | `components/palette-control.js` | `createPaletteControl` |
| GradientControl | `components/gradient-control.js` | `createGradientControl` |
| RangeControl | `components/range-control.js` | `createRangeControl` |
| DimensionsControl | `components/dimensions-control.js` | `createDimensionsControl` |
| PositionControl | `components/position-control.js` | `createPositionControl` |
| AngleControl | `components/angle-control.js` | `createAngleControl` |
| AngleRangeControl | `components/angle-range-control.js` | `createAngleRangeControl` |
| VectorControl | `components/vector-control.js` | `createVectorControl` |
| BezierControl | `components/bezier-control.js` | `createBezierControl` |
| KeyframeLane | `components/keyframe-lane.js` | `createKeyframeLane` |
| Timeline | `components/timeline.js` | `createTimeline` |
| Inspector | `components/inspector.js` | `createInspector` |
| usePlayback | `playback.js` | `createPlayback` |
| useSavedState | `saved-state.js` | `createSavedState` |

## Playback and saved state

One playback engine per page drives the preview, the Inspector's ease preview, scrubbing, frame stepping, and export:

```js
import { createPlayback } from "./vanilla/playback.js";

const playback = createPlayback({
  total: () => sequenceDuration(steps, durations),
  range: () => playRange(steps, durations, openStep),
  fps: () => 30,
});
const unsubscribe = playback.subscribe(({ time, playing }) => drawArtwork(time));
playback.toggle();
playback.scrub(1.2);
playback.stepFrame(1);
playback.refresh(); // after changing durations, the open step, or the frame rate
playback.destroy();
```

`total`, `range`, and `fps` are functions the engine reads when it needs them.
Call `refresh()` after changing what they return: it keeps the time within the new total and notifies subscribers.
`time` and `playing` can also be set directly, as the Inspector does when a duration changes and the demo does while exporting.
Timeline and Inspector subscribe to the engine they are given and unsubscribe in `destroy()`.

`createSavedState(key, defaults, validators)` reads a versioned payload `{ version: 1, values }` from `localStorage`, keeps only valid known keys, and falls back to the defaults.
Read values from `state`, write each change with `set(name, value)`, and show `status`, which reports unavailable or invalid storage.

## Exports

`src/lib/export.js` loads `mediabunny` by name for MP4 and WebM.
Without a build step, map that name to the single-file bundle with an import map before the page's module script:

```html
<script type="importmap">
  { "imports": { "mediabunny": "./node_modules/mediabunny/dist/bundles/mediabunny.min.mjs" } }
</script>
```

Point the path at your own copy of `mediabunny.min.mjs` (version 1.61.3 was used here); PNG export needs no import map.

## Differences from the Vue components

- Invalid props throw instead of warning.
- Where the Vue components write into an object they were given, the port reports a new object instead:
  DimensionsControl, PositionControl, and VectorControl call `onBoundsInput` for each axis limit, and Timeline and Inspector call `onTracksInput` for lane, keyframe, ease, and parameter edits.
- These Vue bugs do not occur in the port:
  - GradientControl's first render with saved stops outside saved bounds leaves the unselected stop outside them in Vue.
  - DimensionsControl and PositionControl without a bounds owner do not clamp to edited limits in Vue, because the edit goes into a non-reactive default object.
- The vanilla gallery has no heading copy-links or README navigation, which belong to the Vue page layout.

## How parity was checked

The scripts in `scripts/parity/` compare the two implementations and can be run again:

| Command | Check |
| --- | --- |
| `npm run parity` | Replays the cases in `scripts/parity/cases.js` on a Vue and a vanilla fixture of each component, comparing markup, focus, reported values, and screenshots in both themes. |
| `npm run parity:css` | Compares every ported style rule with the compiled Vue scoped CSS: declarations, context, and selector specificity. |
| `npm run parity:pages` | Compares the two galleries example by example and the two workspace demos step by step, in markup and pixels; add `--dist` to either script to check the production build. |
| `npm run parity:exports` | Downloads PNG, MP4, and WebM through the demo UI, served by Vite and by a plain static server, and checks them with `ffprobe`. |
| `node scripts/jev/parity.mjs <Component>` | Optional: asks Jev whether the vanilla recording follows each behavior rule in `scripts/jev/parity-rules.mjs` the same way the Vue recording does. |
