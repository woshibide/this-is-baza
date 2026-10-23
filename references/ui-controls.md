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
| Allowed angles, rotational freedom, angular interval | [AngleRangeControl](../src/components/AngleRangeControl.vue) | Bind `{ start, sweep }` in whole degrees: start is 0–359°, clockwise sweep is 0–360°. |
| Position, offset, origin | [PositionControl](../src/components/PositionControl.vue) | Map normalized coordinates to the composition's coordinates. |
| Angle, direction, rotation | [AngleControl](../src/components/AngleControl.vue) | Preserve accumulated turns, including values such as 720°. |
| Vector, direction with magnitude, force, velocity | [VectorControl](../src/components/VectorControl.vue) | Bind `{ angle, length }`: angle keeps turns like AngleControl; length is a percentage of the dial radius, limited only by its editable limits, and a negative length points the opposite way; past 100% the dial and grid shrink to 100/length while the point stays on the rest rim. |
| Width and height, aspect ratio | [DimensionsControl](../src/components/DimensionsControl.vue) | Connect the aspect lock and exact dimensions to the artwork. |
| Slider: any single number, such as how many, copies, rows, a delay, a scale, or an amount | [SliderControl](../src/components/SliderControl.vue) | Bind the value and `v-model:bounds` with meaningful default bounds, and set `step`. The bounds are the user's min and max and the only clamp: SliderControl has no `min` or `max` props, and nothing restricts the bounds. |
| Mode, alignment, on/off | [ChoiceControl](../src/components/ChoiceControl.vue) | Adapt the options to the sketch while retaining selection and focus styling. |
| Play, scrub, inspect a frame, sequence steps, keyframe an element | [Timeline](../src/components/Timeline.vue) with [Inspector](../src/components/Inspector.vue) | Drive rendering from one `usePlayback` engine; place them as in the [workspace layout](workspace-layout.md). |

In Baza, "slider" always means [SliderControl](../src/components/SliderControl.vue) (gallery `#slider`): a draggable number with decrease and increase buttons and editable bounds.
Never build a slider as a native `<input type="range">` track, alone or alongside SliderControl; native range inputs appear only inside ColorEditor's hue and alpha strips.

These are intent examples, not keyword triggers.
Distinguish changing a duration from changing acceleration within it, and spatial path editing from a timing curve.
A requested physical spring or bounce needs its own physical parameters and response preview.

## Jev decisions (optional)

[decide.mjs](../scripts/jev/decide.mjs) asks TypeSafe's Jev model five fixed questions per value: `expose`, `control`, `region`, `section`, and `persist`.
It needs `TYPESAFE_API_KEY` in the environment or in the skill folder's `.env`; without one it prints `{"jev":"unavailable"}` and makes no request.
It runs only on the developer's machine and never becomes part of a sketch or its build.
Models, thresholds, control descriptions, and question wording live only in [config.mjs](../scripts/jev/config.mjs).

Write candidates as `{ "sketch": "<one-paragraph description>", "values": [ ... ] }`, with one entry per value the artwork or editor uses:

| Field | Content |
| --- | --- |
| `name` | Identifier in the sketch's code. |
| `label` | Human-readable name with its unit. |
| `type` | Shape and unit, such as `number, percent` or `one of "first", "last"`. |
| `example` | Current or default value. |
| `usage` | One sentence on what the value does in the artwork or editor. |
| `gold` | Optional expected answers, used only to report disagreements. |

Each answer comes back with `status: "ok"` when it clears the threshold, or `"review"` with the runner-up when it does not.
Answers that do not apply are omitted: a confidently hidden value has only `expose`, and only left-panel values get a `section`.
Jev chooses among controls; take bounds, steps, units, and labels from the sketch's code.
[demo-candidates.json](../scripts/jev/demo-candidates.json) is a worked example for the workspace demo.

## Shared controls and styles

Use [NumberField](../src/components/NumberField.vue) for exact entry and number dragging, [LimitsEditor](../src/components/LimitsEditor.vue) with [LimitValue](../src/components/LimitValue.vue) for editable bounds, and [GraphicPanel](../src/components/GraphicPanel.vue) for a graphic with attached controls.
Their helpers in [number-scrub.js](../src/lib/number-scrub.js) and [numeric-limits.js](../src/lib/numeric-limits.js) own gesture and validation behavior; reuse or port those implementations with the components.
Put supplementary input fields beneath graphics in GraphicPanel's `fields` slot; its native “Exact values” disclosure is collapsed by default.
Keep primary actions and readouts in the `footer` slot, and keep essential standalone inputs visible.
Use the shared `exact-values` disclosure styles for supplementary fields outside GraphicPanel, as in the color picker.
Keep a value and its editable bounds distinct.
The text `-0` clears a custom limit and is stored as `null`; ordinary `0` remains a valid bound.
Persist custom bounds alongside their values.
Keep drag, keyboard, and typed edits on the same model, with units and invalid-input feedback visible.
Keep reset local to its control and integrate continuous gestures with the target's existing undo behavior when present.

Preserve these graphical meanings when porting:

| Meaning | Reference treatment |
| --- | --- |
| Selected choice | Inverse fill with contrasting text and a checkmark. |
| Selected graphical target | Marked handle or outline, distinct from keyboard focus. |
| Keyboard focus | Separate visible outer ring on selected and unselected controls. |
| Value or geometry | Contours, points, measurement labels, and narrow interval tracks. |
| Unavailable region | Hatching outside the editable limits. |
| Editable overshoot | Usable plotting surface with labeled nominal boundaries. |
| Playback position | Playhead and current-phase marker, independent of selection. |
| Transparency | Checkerboard behind the actual color or artwork. |

The light and dark presets in [theme.css](../src/theme.css) are monochrome; artwork retains its actual colors.
Use `class="baza-theme"` and `data-ui-theme="light"` or `"dark"` on a wrapper for the supplied themes.
When a different palette is requested, override public CSS variables on that wrapper or component and preserve the state distinctions above.
Variables beginning with `--_` are internal resolved values; selection foreground and background must remain a readable pair.
Keep hue/SV gradients and mask luminance independent of theme colors because they encode values.
Read [state-indicator research](ui-state-research.md) only when changing these conventions or investigating their rationale.

### Editable limits are never clamped

Editable min and max limits are the user's clamp on a value; nothing clamps the limits themselves.
A control with min and max inputs needs no other range: do not add a hardcoded range, an intrinsic domain, `min` or `max` props, or a validator bound on top of its limits.
Any number the user types as a limit is accepted, including negative numbers, zero, and values beyond a nominal extent such as 0–100%; the only errors are a draft that is not a number, a fraction in a whole-number field, and a minimum above the maximum.
Restore saved values and limits with the same rule, so a reload never resets what the user's limits allowed.
Where code cannot use a value, guard it where the value is used and leave the value and its limits unchanged: a canvas color stop outside 0–1 stretches the gradient line as CSS does, a step needs positive time to play, and export reports a size or frame rate it cannot encode.
Plots with a nominal extent, such as PositionControl's and GradientControl's 0–100%, widen to show limits and values outside it and mark the nominal edges.
A fixed range belongs only to a field without min and max inputs, such as alpha or an angle's 0–359° start.

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

For sequences, reuse [Timeline](../src/components/Timeline.vue), [KeyframeLane](../src/components/KeyframeLane.vue), [Inspector](../src/components/Inspector.vue), [timeline.js](../src/lib/timeline.js), and [usePlayback](../src/composables/usePlayback.js); the [workspace layout](workspace-layout.md) describes their placement and behavior.
Steps play back to back; each track is one clip with `start` and `end` keyframes in step-local seconds, an `ease` curve, and optional parameters shown in the inspector.
Describe steps and tracks as data and pass them to the components; the target decides what each track drives.
Create one `usePlayback` engine per page and pass it to every control that plays or previews motion, as [App.vue](../src/App.vue) does for both Bézier examples, keeping playback, scrubbing, frame stepping, and export on one clock.
Use `trackValue` for a track's progress and eased value, and the supplied functions for step boundaries, playback ranges, rescaling, and restoring saved tracks.
This sequence example does not require adopting the separate [beat-based timing pattern](beat-timing.md), which applies only when requested.

## Connecting angle intervals

[AngleRangeControl](../src/components/AngleRangeControl.vue) uses the same orientation as the geometry dial: 0° points up and positive angles run clockwise.
Store `{ start, sweep }`, rather than an ordered minimum and maximum, so an interval can cross 0° and distinguish a locked direction (`sweep: 0`) from unrestricted rotation (`sweep: 360`).
For example, `{ start: 300, sweep: 120 }` allows directions from 300° clockwise through 0° to 60°.
A direction is allowed when `wrapDegrees(direction - start) <= sweep`; use [angle-range.js](../src/lib/angle-range.js) for wrapping, validation, and interval movement.
Endpoint drags clamp at zero and one full turn; dragging the arc preserves its width.
Exact endpoint fields select the clockwise interval, and the Allowed field sets its width explicitly.
Arrow keys adjust 1°, Shift adjusts 15°, and Escape restores a drag's starting state.
Keep both handles accessible when endpoints coincide, and persist the complete model together.

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
