# Reusable controls for creative tools

Use this guide when choosing or implementing controls for a sketch or motion-design tool.
Choose the control from what the user is manipulating: a value, interval, position, relationship over time, or collection.
Treat the phrases below as intent examples, not literal keyword matches.
Implement only controls needed by the current request, reuse the project's existing components, and follow explicit user choices.

Use the [Vue reference gallery](../src/App.vue) for concrete examples of these controls.
Run `npm install` once, then `npm run start` to open the gallery through [index.html](../index.html).
Each file in [src/components](../src/components/) keeps brief LLM notes, scoped CSS, its HTML template, and JavaScript together.
Read the relevant component and its explicit imports rather than loading the entire gallery.
Components receive values through `v-model`; the gallery owns persistence and passes clock progress to the timing editors.
When reusing a component, include its imported helpers and the shared tokens and native-control styles in [src/styles.css](../src/styles.css), or map those styles to the target project.
Use the contracts below for behavior beyond the demonstration.

## Graphical language and theming

See [state-indicator research](ui-state-research.md) for the sources and component mapping behind the gallery's state conventions.

Use [GraphicPanel](../src/components/GraphicPanel.vue) to connect a graphic to its related controls in one frame.
Keep working areas, extended ranges, guides, value outlines, handles, and the current value visually consistent across graph types.
The default light theme keeps every usable plotting area white, including editable overshoot.
Label nominal boundaries rather than using a disabled-looking fill outside them.
Hatching means an unavailable area, not the space outside a current value or interval.
Use inverse fill, contrasting text, and a checkmark for selected choices, scenes, tracks, palette entries, and gradient stops.
Use outlines and handles for graphical editing targets; selected curve handles have a filled center and an additional ring.
Keep keyboard focus as a separate outer ring, visible on selected and unselected elements.
Draw values with dark contours, points, and narrow interval tracks; a dimensions preview does not use selection styling.
Keep timeline phase interiors on the plotting surface and show time with a playhead, a “Now” marker, and the phase name.
Disabled controls use muted affordances and native disabled behavior.
Color previews retain their actual artwork colors, and checkerboards indicate transparency.
Use the shared `.plot-*` mark classes in [styles.css](../src/styles.css) for SVG guides, axes, shapes, labels, and points.

[theme.css](../src/theme.css) is the color configuration; `styles.css` imports it automatically.
Override CSS custom properties on `:root`, a containing element, or a component's root element.
The base palette supplies defaults for every graphic, so changing the panel color also changes working areas, field backgrounds, and graphic footers.
Optional role overrides let those parts diverge deliberately.
Fallbacks resolve inside each control, allowing differently themed controls to coexist on the same page.
Treat properties beginning with `--_` as internal resolved values; customize the public names below.

| Base variable | Role |
| --- | --- |
| `--surface` | Page and recessed surfaces |
| `--paper` | Control panels and default working areas |
| `--ink`, `--muted` | Primary text/value strokes and secondary labels |
| `--line` | General dividers and input borders |
| `--accent`, `--soft` | Emphasis and subtle press feedback; selection has separate roles |
| `--danger` | Invalid input border |
| `--ui-color-scheme` | `light` or `dark` for native browser controls |

| Optional override | Role |
| --- | --- |
| `--selection-bg`, `--selection-fg`, `--selection-border` | Persistent selection fill, contrasting text/checkmark, and outline; default to accent, paper, and selection fill |
| `--disabled-fg` | Unavailable control text and icons; never the selected state |
| `--plot-area`, `--plot-surround`, `--plot-footer` | Working area, surrounding frame interior, and attached controls |
| `--plot-extended` | Editable overshoot; defaults to the same surface as the plot area |
| `--plot-grid`, `--plot-frame`, `--plot-axis` | Grid, frame border, and axis/boundary strokes |
| `--plot-boundary` | Nominal-domain and allowed-domain boundary strokes |
| `--plot-label`, `--plot-value` | Graphic labels and value outlines |
| `--plot-current`, `--plot-playhead` | Current value markers and the independent playback indicator |
| `--plot-hatch`, `--plot-hatch-opacity` | Excluded-region hatching |
| `--plot-handle-fill`, `--plot-handle-stroke` | Editable hollow handles |
| `--plot-marker-outline` | Contrasting border around filled current-value markers |
| `--control-bg`, `--control-hover`, `--focus` | Input/button fill, button hover fill, and focus ring |
| `--overlay-bg`, `--shadow-color` | Color popover surface and floating-panel shadow |
| `--checker-light`, `--checker-dark` | Transparency checkerboard squares |
| `--color-handle-inner`, `--color-handle-outer` | Contrasting picker marker edges over the color spectrum |

For example, theme a container or one Vue control by adding this class:

```css
.custom-editor {
  --ui-color-scheme: dark;
  --surface: #171d20;
  --paper: #242e33;
  --ink: #ecf1f3;
  --muted: #b3c1c8;
  --line: #50616b;
  --accent: #f1bd78;
  --soft: #463b2f;
  --danger: #ff9e94;
  /* Optional: give only the working area a distinct surface. */
  --plot-area: #1b252a;
}
```

Use `class="baza-theme custom-editor"` on a wrapper to theme its own background and text too.
The supplied `data-ui-theme="light"` and `data-ui-theme="dark"` presets change only the base palette.
Both defaults are monochrome, including active states and errors; colors are introduced only through theme overrides or the artwork being edited.
The gallery's **Preview theme** selector demonstrates both presets and saves that choice separately from artwork values.
Keep actual hue/SV gradients and SVG mask luminance fixed: those colors encode values and masking operations, not interface styling.
When adding a theme, verify contrast, focus visibility, hatch legibility, popovers, and the same drag/keyboard interactions in each palette.
Set selection foreground and background together when overriding either to preserve readable text and checks.
The former `--plot-selection` role is retired: selection colors belong to selection controls, while shapes and intervals use plot area/value roles.

## Choose by intent

| User intent or wording | Preferred control | Essential behavior | Vue example |
| --- | --- | --- | --- |
| “Ease in”, “ramp up”, “accelerate”, “slow down”, “fade over time” | [Bézier timing editor](#bézier-timing-editor) | Show how a property changes over normalized time; keep duration separate. | [BezierControl](../src/components/BezierControl.vue) |
| “Pulse”, “breathe”, “grow then shrink” | Bézier envelope with a middle keyframe | Shape the rise and fall independently and move the peak in time. | [BezierControl](../src/components/BezierControl.vue) |
| “Color”, “palette”, “fill”, “stroke”, “background” | [Color or palette editor with alpha](#color-and-palette-with-alpha) | Edit and preserve each color's opacity. | [PaletteControl](../src/components/PaletteControl.vue) |
| “Gradient”, “color stops”, “fade across the surface” | [Gradient editor](#gradient-stops) | Position stops visually; each stop has color and alpha. | [GradientControl](../src/components/GradientControl.vue) |
| “Between”, “minimum and maximum”, “random size range” | [Paired range fields](#ranges-and-intervals) | Keep both bounds visible and enforce their relationship. | [RangeControl](../src/components/RangeControl.vue) |
| “Position”, “offset”, “origin”, “focal point” | [XY control](#position-direction-and-size) | Pair direct positioning with exact X and Y fields. | [PositionControl](../src/components/PositionControl.vue) |
| “Angle”, “direction”, “rotation” | Angle field with a direction preview | Show orientation and allow exact degrees. | [AngleControl](../src/components/AngleControl.vue) |
| “Width and height”, “scale”, “aspect ratio” | Linked dimension fields | Make proportional resizing explicit. | [DimensionsControl](../src/components/DimensionsControl.vue) |
| “How many”, “copies”, “rows”, “columns” | Integer field with stepper | Use whole-number increments and meaningful bounds. | [CountControl](../src/components/CountControl.vue) |
| “Amount”, “strength”, “thickness”, “opacity” at one instant | Numeric field; optional slider | Use a slider when a bounded continuous sweep helps, with exact entry alongside it. | [AmountControl](../src/components/AmountControl.vue) |
| “Mode”, “alignment”, “blend mode”, “on/off” | Segmented choice, select, or checkbox | Show mutually exclusive choices or a true boolean directly. | [ChoiceControl](../src/components/ChoiceControl.vue) |
| “Random”, “variation”, “shuffle”, “another version” | [Seed field and regenerate action](#repeatable-randomness) | Make every generated result reproducible. | [RandomControl](../src/components/RandomControl.vue) |
| “Scrub”, “preview the loop”, “inspect a frame” | [Playback and time scrubber](#playback-and-time) | Pause and inspect the same time used by export. | [PlaybackControl](../src/components/PlaybackControl.vue) |

“Make it faster” can mean reducing total duration or changing acceleration within that duration.
Use the surrounding request to distinguish them; ask one short question if the difference changes the requested behavior and remains unclear.
A request for a curved path concerns spatial geometry and needs path handles, not a timing graph.
For explicitly physical spring or bounce behavior, expose the relevant physical parameters and a response preview; a generic Bézier is not an exact physical simulation.

## Bézier timing editor

### Reference and appearance

The reference is `~/wip/underline/1_explorations/lines`.
Its `src/ui/bezier-editor.js`, `src/easing.js`, and `css/style.css` contain the editor, evaluator, and styling.
Inspect these when available; the contract below is self-contained so other projects do not depend on that local path.

Replicate the reference's compact inline graph: quiet grid, thin curve, filled anchors, hollow handles, connecting handle lines, and one accent for selection and the playhead.
Use the available panel width; the reference uses an SVG `viewBox="0 0 300 196"` with a plot from `(24, 26)` to `(276, 166)`.
Keep labels and controls legible when resizing rather than requiring those exact pixels.
In the runnable examples, reserve space above and below the 0–100% plot equal to 75% of the plot height on each side.
Derive these margins, rendering coordinates, and pointer mapping from the same scalable geometry so the proportions hold at every panel width.
Place the selected point's name and two numeric fields, **Time %** and **Value %**, directly below the graph.
Show a vertical playhead and a dot on the evaluated curve while previewing animation.
Keep the editor outside the exported composition.

The horizontal axis is elapsed time, normalized from 0 to 1 and displayed as 0–100%.
The vertical axis is the normalized property value or progress, with 0 at the bottom and 1 at the top.
Label the edited property so “Value” has a concrete meaning, such as spread, opacity, or distance traveled.
When the property is distance, a steeper curve means faster movement; the height itself is distance, not speed.

### Curves and interaction

- For a single ramp, start with two anchors at `(0, 0)` and `(1, 1)`.
- Give the start one outgoing handle and the finish one incoming handle.
- For a rise-and-fall envelope, add a middle anchor at `(peakTime, 1)` and finish at `(1, 0)`.
  Give each interior anchor its own incoming and outgoing handles.
- Keep anchor values fixed at their intended endpoints and peak, and endpoint times fixed at 0 and 1.
  Move the middle anchor horizontally to change when the peak happens, carrying its handles with it and respecting adjacent bounds.
- Drag handles in both axes; select them to edit the same coordinates numerically.
  Keep each handle’s time between its segment’s two anchors, but allow the outgoing and incoming handles to cross each other.
  Moving the middle anchor carries its handles and clamps neighboring handles to their updated segment bounds.
  Maintain a positive gap between anchors; the reference uses 0.02 of the full duration.
- Allow handle values in `[-0.75, 1.75]`, filling the proportional space below and above the nominal 0–100% plot.
  Apply these limits consistently to dragging, keyboard nudges, numeric fields, and restored data.
  Preserve curve overshoot in evaluation and previews; for bounded properties such as opacity, clamp the resulting property at the rendering boundary rather than restricting the editor.
- Support Tab focus, visible selection, arrow-key nudging, and a larger Shift nudge.
  The reference nudges by 1 percentage point, or 5 with Shift; numeric fields allow finer entry.
  Give small visible handles larger invisible hit areas and accessible names that identify their anchor and direction.
- Use pointer capture for dragging and finish the gesture on pointer release, cancellation, or lost capture.
  Convert pointer coordinates through the SVG's inverse screen transform so dragging remains accurate when resized.
- Keep drag, keyboard, and numeric edits synchronized through the same validated value.
  Preserve focus across redraws and offer a local reset to the project's default curve.

### Data and evaluation

Store normalized anchors with absolute handle coordinates, not offsets from the anchor.
For example, this is the reference's rise-and-fall envelope:

```json
[
  { "x": 0, "y": 0, "out": { "x": 0.22, "y": 0 } },
  { "x": 0.5, "y": 1, "in": { "x": 0.28, "y": 1 }, "out": { "x": 0.72, "y": 1 } },
  { "x": 1, "y": 0, "in": { "x": 0.78, "y": 0 } }
]
```

Keep duration and output bounds separate from this shape.
Map the curve to property units with `min + (max - min) * curve(progress)`.
The gallery demonstrates an imaginary pixel-based property by passing its shared **Range & interval** value to both Bézier controls as `outputRange`, with `unit="px"`.
These demo numbers illustrate remapping; they do not measure the on-screen distance traveled by the preview marker or an existing artwork property.
The motion preview places mapped endpoint values above the line, directly above their 0% and 100% labels, and includes the mapped current value in its readout.
These labels and the readout derive from the same range; changing the interval updates both previews without changing the normalized curves.
In a real project, consumers must supply the actual property being tweaked through `outputRange` (`{ min, max }`), `unit`, and a meaningful `propertyLabel`.
Derive the labels, current-value readout, and rendered property from that same mapping rather than keeping illustrative numbers or a separate display-only range.
For example, an actual width range of 40–320 px should label 0% as 40 px and 100% as 320 px, and a curve value of 50% must produce a width of 180 px.
Clamp that result to the property’s legal range only when the property requires it.
For a one-shot animation, clamp elapsed time divided by positive duration to `[0, 1]`; for a repeating animation, wrap phase deliberately.
Choose a return envelope when the property should come back continuously; use a ramp that wraps only when a reset at the loop boundary is intended.
Matching endpoint values prevents a position/value jump, but smooth velocity across a loop also requires matching endpoint slopes.

For each cubic segment, use `B(u) = (1-u)^3*a + 3*(1-u)^2*u*b + 3*(1-u)*u^2*c + u^3*d` independently for X and Y.
Find the segment containing the requested time, solve `Bx(u) = progress`, then return `By(u)`.
The Bézier parameter `u` is not elapsed time; inserting progress directly into the Y polynomial produces the wrong timing.
Use 32 iterations of bisection on the monotonic X curve and return anchor values exactly at their times.
Handle X coordinates may cross each other while both remain within the segment’s anchor interval; this still gives one value for each time.
This time-to-value interpretation also underlies [CSS easing](https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions).

Validate finite coordinates, strictly increasing anchor times, required handles, supported value bounds, and positive duration before accepting restored or imported state.
Use one pure evaluator for the graph marker, preview, and offline export, driven by the supplied animation time.
Keep selection, focus, drag state, and the live playhead out of saved curve data.

## Color and palette with alpha

Every editable color includes alpha unless the target's data model or rendering pipeline genuinely cannot represent it.
Apply this to individual colors, palette entries, gradient stops, fills, strokes, and backgrounds.
Use opaque alpha as a default, not as a restriction.

1. Show a swatch over a checkerboard and provide a color picker, exact color text entry, and a clearly labeled **Opacity %** field from 0 to 100.
   An optional opacity slider is useful here because it edits one bounded scalar.
2. Store color and alpha together using the project's established format.
   For a new sRGB model, `{ "r": 255, "g": 96, "b": 32, "a": 0.5 }` is sufficient; define RGB as 0–255 and alpha as 0–1.
3. Preserve alpha when changing RGB, switching picker modes, copying colors, saving, restoring, or editing palette entries.
   Treat zero alpha as valid and retain its RGB channels so raising opacity restores the chosen color.
4. Define exact-entry behavior: six-digit hex edits RGB while preserving the current alpha; eight-digit `#RRGGBBAA` edits both.
   Validate entries before committing them and keep all controls synchronized.
5. For a palette, show selectable swatches with the selected entry's editor nearby.
   Add, remove, and reorder entries when the palette is variable-length; preserve named roles and fixed slots when the artwork depends on them.
6. Composite transparent artwork over the actual background or a preview checkerboard.
   Keep checkerboard pixels out of exported artwork.

Use a native color picker with alpha only after checking it works in the target browser; otherwise combine RGB picking with an explicit alpha field.
Browser picker support is not a reason to remove alpha from the product; see the [native color input reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color).
Keep per-color alpha separate from whole-layer opacity when both exist; their effects combine.
An opaque export format still permits translucent colors composited over a background, so preserve their alpha in editable state and flatten only at the output boundary.
If a specific target truly requires opaque colors, state that concrete limitation beside the affected control and make the conversion explicit.

## Other reusable patterns

### Dragging numeric values

[NumberField](../src/components/NumberField.vue) and [LimitValue](../src/components/LimitValue.vue) use one [number-scrubbing controller](../src/lib/number-scrub.js).
The controller emits through their existing models, so previews, linked dimensions, validation, and browser persistence keep the same source of truth.
Do not add pointer arithmetic to individual controls.

Click a number to select it for exact typing, or drag right/up to increase it and left/down to decrease it.
A four-pixel threshold separates clicks from drags; the initial direction locks the axis for that gesture, avoiding diagonal jitter.
Four pixels advance one step: integer fields use their declared step, and unrestricted decimal fields use 0.1 without changing native `step="any"` validation.
Shift makes dragging ten times faster, and Alt makes it ten times finer while respecting any declared numeric step.
Dragging respects the latest constraints and follows any additional normalization from the parent control.
Release, Escape, pointer cancellation, loss of capture, or window blur ends the gesture and retains the last accepted value.
Use pointer capture so a drag continues outside the input, and dispose the controller when its field unmounts.
An unlimited `-0` boundary remains a text-entry field until a finite limit is set.
Hover hints, resize cursors, and the active underline expose the interaction without introducing a second control.

### Editable numeric limits

Attach editable limits to the element they constrain using [LimitsEditor](../src/components/LimitsEditor.vue).
For scalar values, place Min and Max inside opposing brackets in the same enclosure as the value.
For range tracks, place editable end caps at the rail terminals; for XY pads, place the limits on their matching horizontal and vertical axes and map the pad through those visible limits.
Place count steppers inside the scalar enclosure, between each editable limit and the central value.
[LimitValue](../src/components/LimitValue.vue) owns parsing, focused help, and validation so all placements share one interaction contract.
At narrow widths, stack paired scalar controls while keeping each value and its limits together.
[NumberField](../src/components/NumberField.vue) accepts `v-model:limits="limits"`, where `limits` contains `{ min, max }`; composite controls expose `v-model:bounds` and apply the shared [limit helpers](../src/lib/numeric-limits.js) to every input path.
Commit limits on Enter or blur, restore them on Escape, and show an inline error for malformed or reversed limits.
The exact text `-0` removes a custom limit; store it as `null` because JSON loses numeric negative zero.
Ordinary `0` remains a valid bound, and integer controls continue to reject fractions.
Keep intrinsic domains intact when custom limits are removed: opacity and normalized positions stay within 0–100%, seeds stay within the PRNG domain, and dimensions and duration stay positive.
Clamp existing values when a changed limit excludes them, and save custom limits alongside values.
For linked dimensions, clamp both dimensions when limits change; subsequent resizing preserves the resulting ratio within both axes' limits.
Use a finite display scale for an unbounded track and freeze its numeric span during each drag; a display scale does not restrict typed values or keyboard nudges.
Verify extended and unbounded entry, limit edits that exclude current values, drag and keyboard consistency, and persistence after refresh.

### Ranges and intervals

Use adjacent Min/Max or Start/End fields with units and domain-appropriate validation.
Add a two-handle track when visually adjusting the interval is useful; allow coincident bounds only when they have meaning.
Prevent handles crossing without silently swapping their identities, and preserve valid intermediate typing until a complete value can be committed.
A value range controls amplitude; a timing graph controls how that range is traversed.
Show the current output values with units above the range handles, using the interval model itself; combine nearby labels to avoid overlap.

### Position, direction, and size

For a point, use an on-canvas handle when placement in the composition matters, or an XY pad when it needs a compact panel control.
Provide exact X/Y fields, label the coordinate system and units, and map through composition coordinates rather than display pixels.
For direction, pair degrees with an interactive orientation dial when visual rotation is useful.
The gallery dial supports click-to-set and circular dragging through the same rotation model and editable limits as its numeric field.
Crossing zero preserves accumulated turns; arrow keys change one degree, Shift uses 15 degrees, and Escape restores the rotation at the start of a drag.
Distinguish wrapped orientation from accumulated rotation so a requested two-turn spin retains 720°.
For dimensions, pair width/height or X/Y scale with an explicit aspect lock; resizing while locked updates the paired value.
Show the actual width and height with units beside their measurement guides in the preview, derived from the same model as the numeric fields rather than the scaled preview geometry.

### Gradient stops

Show a gradient strip with selectable, draggable stops and a numeric position for the selected stop.
Use the alpha-aware color editor for every stop and allow adding/removing stops when supported.
Preview transparency over a checkerboard and use the same interpolation in preview and rendering.
Name the domain: a spatial color gradient, a color change over time, and a timing curve are different controls.

### Repeatable randomness

Pair a visible integer seed with **Regenerate**, which chooses a new seed and updates the preview.
Keep variation amount or distribution controls separate from the seed.
Save the seed and use it consistently in preview and export; refreshing must reproduce the same result.
If the user needs to protect individual choices while regenerating, add explicit locks for those choices.

### Playback and time

Provide Play/Pause, Restart, current time, and a scrubber for the animation's actual duration.
Scrubbing pauses playback and renders the selected time immediately, including the timing graph's playhead.
Offer frame stepping and frame numbers when the user needs frame-accurate work, derived from the chosen FPS.
Keep timing shape, duration, and playback position separate so changing one has a predictable effect.

For a sequence, use the scene tabs and phase lanes in [PlaybackControl](../src/components/PlaybackControl.vue), with [TimelineLane](../src/components/TimelineLane.vue) and the pure timing functions in [timeline.js](../src/lib/timeline.js).
Each scene owns a positive duration and element tracks with `start`, `intro`, `hold`, and `outro` in seconds relative to that scene.
The example uses a simple cut between scenes; the consuming project decides which elements remain visible across that boundary.
Drag a whole clip to move its phases together, or drag a boundary to redistribute the adjacent phases without crossing them.
Arrow keys adjust by 0.01 seconds, Shift by 0.1 seconds, and Escape cancels a drag.
Zero skips a phase; an omitted outro can leave an element in its held state.
Keep exact timing fields under the selected lane, and place editable scene-duration limits around that scene's duration.
Resizing a scene scales all its track timings proportionally; total duration is derived from the scenes.
Use one absolute clock for playback, scrubbing, frame stepping, and scene selection, with half-open scene intervals and an inclusive final endpoint.
The gallery's curve mapping lives in `App.vue`; timeline controls report time and do not own rendering or browser storage.

## Shared implementation and completion

Reuse one component for each repeated interaction, with a validated value, change notification, and consistent disabled behavior.
Keep renderer-specific code outside controls; prefer a direct component interface over a new factory or framework unless the project already benefits from one.
Expose units and exact values, keep frequently used controls visible, and disclose secondary controls within the relevant group.
Treat one continuous drag as one undoable edit when the application has undo, and keep reset scoped to the affected control.

Before handing off an implementation, verify the controls actually added or changed:

- Drag, keyboard, and exact entry agree, remain usable at the target panel width, and recover from invalid input.
- Saved values survive refresh, including alpha 0 and fractional alpha, curve handles, and seeds where applicable.
- Timing curves hit their intended endpoints and extrema; their playheads agree with the rendered property at a chosen time.
- Preview and export use the same timing, colors, and random result; editor guides and transparency checkerboards stay outside the artwork.

For export formats and their checks, use [export-system.md](export-system.md).
