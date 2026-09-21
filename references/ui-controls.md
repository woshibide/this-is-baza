# Reuse the UI examples

The bundled Vue components and their running gallery define Baza's control appearance and interactions.
Reuse them in Vue projects or port them to the target framework, preserving both the visual design and behavior unless the user requests a change.
Choose only the controls needed by the sketch.

## Reuse workflow

1. Choose a component from the intent table below and inspect its live example.
   From the skill folder, run `npm install` once, then `npm run start -- --port <available-port>` to view the gallery without replacing the target project's server.
2. Read that component and its explicit imports, including shared components and pure helpers.
   Read the component's notes, template, script, and any scoped styles; read [App.vue](../src/App.vue) only when you need its wiring example.
3. Copy or port the component and required helpers, and include the relevant control styles from [styles.css](../src/styles.css) and tokens from [theme.css](../src/theme.css).
   Scope shared styles to the target controls rather than importing the gallery's page layout into an existing application.
   Keep [Lucide attribution](../THIRD_PARTY_NOTICES.txt) when reusing [Icon.vue](../src/components/Icon.vue).
4. Bind values and editable bounds to the target project's validated, persisted state, and connect them to the actual artwork.
   The gallery owns persistence through [useSavedState](../src/composables/useSavedState.js); components own neither browser storage nor the renderer.
   Use the project's clock for timing controls and the same resolved values for preview and export.
5. Compare the target control with the running example at the intended panel width, then perform the [integration checks](#integration-checks).

## Choose by intent

| User intent | Example | Integration detail |
| --- | --- | --- |
| Ease in, accelerate, fade over time | [BezierControl](../src/components/BezierControl.vue) | Pass actual property bounds, units, and clock progress. |
| Pulse, breathe, grow then shrink | [BezierControl](../src/components/BezierControl.vue) with `envelope` | Preserve the movable middle anchor and its handles. |
| Color, fill, stroke, background | [ColorEditor](../src/components/ColorEditor.vue) | Keep color and alpha together in state. |
| Palette | [PaletteControl](../src/components/PaletteControl.vue) | Bind the entries used by the artwork. |
| Gradient or color stops | [GradientControl](../src/components/GradientControl.vue) | Use the same stop positions, alpha, and interpolation in rendering. |
| Minimum and maximum, interval | [RangeControl](../src/components/RangeControl.vue) | Bind both values and editable bounds. |
| Position, offset, origin | [PositionControl](../src/components/PositionControl.vue) | Map normalized coordinates to the composition's coordinates. |
| Angle, direction, rotation | [AngleControl](../src/components/AngleControl.vue) | Preserve accumulated turns, including values such as 720°. |
| Width and height, aspect ratio | [DimensionsControl](../src/components/DimensionsControl.vue) | Connect the aspect lock and exact dimensions to the artwork. |
| How many, copies, rows | [CountControl](../src/components/CountControl.vue) | Use meaningful integer bounds. |
| Mode, alignment, on/off | [ChoiceControl](../src/components/ChoiceControl.vue) | Adapt the options to the sketch while retaining selection and focus styling. |
| Play, scrub, inspect a frame | [PlaybackControl](../src/components/PlaybackControl.vue) | Drive rendering from its reported time. |

These are intent examples, not keyword triggers.
Distinguish changing a duration from changing acceleration within it, and spatial path editing from a timing curve.
A requested physical spring or bounce needs its own physical parameters and response preview.

## Shared controls and styles

Use [NumberField](../src/components/NumberField.vue) for exact entry and number dragging, [LimitsEditor](../src/components/LimitsEditor.vue) with [LimitValue](../src/components/LimitValue.vue) for editable bounds, and [GraphicPanel](../src/components/GraphicPanel.vue) for a graphic with attached controls.
Their helpers in [number-scrub.js](../src/lib/number-scrub.js) and [numeric-limits.js](../src/lib/numeric-limits.js) own gesture and validation behavior; reuse or port those implementations with the components.
Preserve the distinction between a value, its editable bounds, and its intrinsic domain.
The text `-0` clears a custom limit and is stored as `null`; ordinary `0` remains a valid bound.
Persist custom bounds alongside their values and retain intrinsic limits such as positive dimensions and 0–100% opacity.
Keep drag, keyboard, and typed edits on the same model, with units and invalid-input feedback visible.
Keep reset local to its control and integrate continuous gestures with the target's existing undo behavior when present.

Preserve these graphical meanings when porting:

| Meaning | Reference treatment |
| --- | --- |
| Selected choice | Inverse fill with contrasting text and a checkmark. |
| Selected graphical target | Marked handle or outline, distinct from keyboard focus. |
| Keyboard focus | Separate visible outer ring on selected and unselected controls. |
| Value or geometry | Contours, points, measurement labels, and narrow interval tracks. |
| Unavailable region | Hatching outside the allowed domain. |
| Editable overshoot | Usable plotting surface with labeled nominal boundaries. |
| Playback position | Playhead and current-phase marker, independent of selection. |
| Transparency | Checkerboard behind the actual color or artwork. |

The light and dark presets in [theme.css](../src/theme.css) are monochrome; artwork retains its actual colors.
Use `class="baza-theme"` and `data-ui-theme="light"` or `"dark"` on a wrapper for the supplied themes.
When a different palette is requested, override public CSS variables on that wrapper or component and preserve the state distinctions above.
Variables beginning with `--_` are internal resolved values; selection foreground and background must remain a readable pair.
Keep hue/SV gradients and mask luminance independent of theme colors because they encode values.
Read [state-indicator research](ui-state-research.md) only when changing these conventions or investigating their rationale.

## Connecting timing controls

[BezierControl](../src/components/BezierControl.vue) receives normalized curve data through `v-model`, plus `progress`, `outputRange` (`{ min, max }`), `unit`, and `propertyLabel`.
Supply the actual property being edited; the gallery's pixel range is illustrative and does not measure its preview marker's screen position.
Use [evaluateCurve](../src/lib/bezier.js) and [remapValue](../src/lib/values.js) for the graph readout and the rendered property.
For a 40–320 px width range, a curve value of 50% produces 180 px.
The evaluator solves X for elapsed time before evaluating Y; its Bézier parameter is not itself elapsed time.
Reuse the evaluator rather than reconstructing its algorithm from a visual approximation.

Endpoints are fixed; the envelope's middle anchor moves horizontally and vertically with its handles.
Preserve crossed handles, overshoot, and the example's proportional editing margins.
Clamp a bounded property's rendered result at the rendering boundary, keeping the editable curve intact.
Keep duration separate from curve shape and drive the marker, artwork, scrubbing, and export from the same composition time.
For loops, choose reset or return behavior deliberately; matching endpoint values prevents a value jump, while smooth velocity also requires matching slopes.

For sequences, reuse [PlaybackControl](../src/components/PlaybackControl.vue), [TimelineLane](../src/components/TimelineLane.vue), and [timeline.js](../src/lib/timeline.js).
The example uses scene cuts and tracks with `start`, `intro`, `hold`, and `outro` relative to each scene; the target decides which artwork is visible in each scene.
Wire the reported time to rendering as demonstrated in [App.vue](../src/App.vue), keeping playback, scrubbing, frame stepping, and export on one clock.
Use the supplied timing functions for scene boundaries, skipped phases, and scene resizing.
This sequence example does not require adopting the separate [beat-based timing pattern](beat-timing.md), which applies only when requested.

## Connecting colors

Use the supplied picker for individual colors, palette entries, and gradient stops, preserving alpha including zero.
Retain RGB when alpha is zero so raising opacity restores the chosen color.
The examples use `{ hex, alpha }`; adapt that boundary if the target already has a different color representation.
Six-digit hex changes RGB while retaining alpha; eight-digit `#RRGGBBAA` changes both.
Keep per-color alpha separate from whole-layer opacity, and flatten translucent artwork only when writing an opaque output.
Preserve named palette roles or fixed slots when the artwork depends on them.

## Integration checks

Check the controls actually added or changed:

1. Compare appearance with the example, including selection, keyboard focus, disabled states, popovers, and usable plotting regions at the target panel width.
2. Try drag, keyboard, and exact entry; confirm they update the same artwork value and recover from invalid input.
3. Refresh after editing values and bounds, including zero/fractional alpha and curve handles where applicable; confirm both the controls and artwork are restored.
4. At a chosen composition time, confirm the displayed values, artwork, and exported result agree and editor graphics stay out of the export.

Use the target's existing tests and the relevant [gallery tests](../test/) to verify behavior when porting helpers.
For export implementation and file checks, follow [export-system.md](export-system.md).
