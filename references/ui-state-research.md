# State indicators for the control gallery

Research date: 2026-09-21.
Status: adopted and implemented in the Vue gallery on 2026-09-21.

## Recommendation

Use **Carbon's high-contrast selection pattern** as the visual reference for selected choices and editing targets, and **Spectrum's creative-control patterns** for behavior and graphical anatomy.
This is an adaptation of documented patterns, not a claim of full Carbon or Spectrum compliance.
Keep the existing Vue components and adopt the relevant rules without importing either framework.

The original problem was semantic as well as visual: a chosen option, a rendered value, an allowed region, and the phase under the playhead resembled variations of one “active” state.
The former `--plot-selection` token painted the interval value and the dimensions preview, although neither represented selection between UI targets.
Define the meaning first, then choose its appearance.

## Mapping the seven reported examples

Before the revision, live gallery inspection confirmed that selected alignment, the interval band, and the dimensions rectangle all used `#e8e8e8` in the light theme.
Their behaviors differ: alignment stores a chosen option, the band stores two numeric values, and the rectangle only previews dimensions.
The revised roles are implemented in [segmented styles](../src/styles.css), [RangeControl](../src/components/RangeControl.vue), and [DimensionsControl](../src/components/DimensionsControl.vue).

The following adaptations are implemented in the gallery.

| Comment | Actual meaning | Implemented adaptation |
| --- | --- | --- |
| 1. Center alignment | Chosen option. | Use the inverse selected surface with a checkmark; keep other usable choices white. |
| 2. Dimensions rectangle | Preview of width and height. | Use a white interior with a strong dark contour and measurement labels; remove the selection fill. |
| 3. XY canvas | Allowed coordinates, excluded coordinates, and one position value. | Keep the usable canvas white, excluded space hatched, and the current point dark. |
| 4. Interval band | The current pair of values within a larger allowed domain. | Use a narrow dark value track between two handles on a white canvas; retain a generous drag target. |
| 5. Intro phase | A phase type that currently contains the playhead. | Keep all phase interiors white with labels and separators; identify time with a playhead and a compact “Now” marker. |
| 6. Scene 01 | The chosen scene whose settings are displayed. | Use the same inverse selected surface and checkmark as alignment; communicate playback separately. |
| 7. Bézier working area | The nominal 0–100% range plus editable overshoot. | Keep both areas white and distinguish the nominal range through labeled boundary lines, including in the motion strip. |

The interval outside its two value handles remains available for editing; it must not acquire the exclusion hatch used for prohibited XY coordinates.
Likewise, Bézier overshoot is permitted, so a disabled-looking mask would communicate the wrong constraint.
The evidence is the separate limits and values in [RangeControl](../src/components/RangeControl.vue), the exclusion mask in [PositionControl](../src/components/PositionControl.vue), and editable extended coordinates in [BezierControl](../src/components/BezierControl.vue).

## What the sources establish

| Reference | Documented pattern | Useful application here |
| --- | --- | --- |
| [Carbon content switcher](https://carbondesignsystem.com/components/content-switcher/style/) | Its high-contrast variant uses `layer-selected-inverse` with `text-inverse` and `icon-inverse`; focus and disabled states have separate tokens. | A strong, reversible black/white treatment for chosen options, independently distinguishable from unavailable controls. |
| [Spectrum action group](https://opensource.adobe.com/spectrum-web-components/components/action-group/) | A single-selection group follows radio-button behavior; multiple selection follows checkbox behavior. | Alignment remains a radio choice, even if presented as segments. |
| [Spectrum tabs](https://spectrum.adobe.com/page/tabs/) | Default selected tabs use a dark line under or beside the item; emphasis is optional. | A selection indicator is an explicit mark, not necessarily a tinted surface. |
| [Spectrum slider](https://opensource.adobe.com/spectrum-web-components/components/slider/) | A filled slider represents the distance from a starting value to the current value; a range uses two handles; disabled is a separate state. | The range band represents data, while handles provide editing affordances. |
| [Carbon slider](https://carbondesignsystem.com/components/slider/style/) | The track, filled track, handle, focus, active interaction, and disabled presentation have separate roles. | A strong thin value track can replace the ambiguous pale rectangular slab. |
| [Spectrum color system](https://spectrum.adobe.com/page/color-system/) | Neutral grays support color/image workflows, while semantic meanings are assigned consistently through tokens. | Preserve monochrome defaults and customizable role tokens. |

These documents do not prescribe our Bézier editor, XY constraint mask, dimensions diagram, or timeline.
The treatments below are product-specific adaptations, informed by the documented separation of value, selection, focus, and availability.

## Adopted vocabulary and appearance

| Meaning | Light-theme treatment | Keep separate from |
| --- | --- | --- |
| **Selected choice or editing target** | Black selected control with white text and a checkmark; for a large graphic, use a strong selection outline and an explicit selected label or handle. | A displayed value or playback position. |
| **Keyboard focus** | An offset, contrasting ring that remains visible on both selected and unselected controls. | Persistent selection. |
| **Pressing or dragging** | Temporary feedback on the operated control or handle; retain its existing selection indication. | A toggle's persistent on/off value. |
| **Disabled** | Muted text and affordances, with interaction actually unavailable. | An unselected but usable option. |
| **Value or geometry** | White plot base, dark contours, value markers, and measurement labels; use a strong narrow band for intervals. | Selection fill. |
| **Allowed domain** | White working area, with hatching outside the permitted limits. | The point's current value. |
| **Nominal domain** | Labeled boundary lines; editable overshoot remains visibly usable. | Unavailable space. |
| **Current playback position** | A playhead and an explicit current-phase marker; selection keeps its separate outline. | The editing target or phase type. |

White means the plotting surface, not “active.”
Gray remains useful for secondary labels and guides; it should not be the sole distinction between a chosen option and an unavailable one.
The dimensions preview is informational graphics, so it needs clear value contours rather than a simulated enabled/disabled control state.
Carbon explicitly cautions against calling static information read-only when it has no enabled state. [Carbon read-only guidance](https://preview.carbondesignsystem.com/building-blocks/core/patterns/read-only-states)

WAI distinguishes persistent selection from keyboard focus and requires their visual indicators to be distinguishable. [APG keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
For terminology, `aria-pressed` describes a toggle button's persistent state; it does not mean the momentary pointer-down appearance. [APG button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

## Token and verification consequences

Separate selection styling into `--selection-bg`, `--selection-fg`, and `--selection-border` roles.
Keep the existing `--focus` and `--plot-value` roles for focus and graphical values, and give disabled affordances and playback their own `--disabled-fg` and `--plot-playhead` roles.
Keep plot surface, grid, constraint hatch, and nominal-boundary roles separate; values may initially share a palette color without sharing their meaning.
Remove timeline phase type from `--plot-extended`; name the phases with text and separators.

When extending the gallery, compare the chosen alignment, selected scene, interval, and focused handle together before applying a new state recipe to every component.
Check selected-plus-focused and selected-plus-disabled combinations, light/dark themes, keyboard operation, and actual disabled behavior.
Meaningful control/state indicators and required graphical information need at least 3:1 contrast against adjacent colors; decorative grid lines do not automatically carry the same requirement. [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
Use shape, labels, position, and contrast together so the design continues to communicate when themes change. [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
