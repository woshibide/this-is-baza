# Workspace layout

Every sketch workspace uses the same arrangement, so users find global settings, the artwork, time, and the selected element in the same places.
The [workspace demo](../examples/demo/index.html) shows it working; its artwork only illustrates the layout and is not part of this rule.
Port the layout from [Demo.vue](../src/Demo.vue), keeping the demo's artwork local to the demo.

## Regions

| Region | Position | Contents |
| --- | --- | --- |
| Controls panel | Left | Global and sketch-wide settings: active sketch, composition size and aspect ratio, artwork parameters that apply to the whole piece, frame rate, export, interface theme. |
| Preview | Center | The composition frame, fitted to the free space at the export aspect ratio. |
| Timeline | Center, directly under the preview | Transport, ruler, the step strip, and a step's keyframe lanes when open. |
| Inspector | Right | The controls of whatever is selected in the timeline: a step's duration and elements, or one element's keyframes, ease, and parameters. |

Put a control on the left when it affects the whole piece, and in the inspector when it belongs to the selected step or element.
A sketch without a timeline omits the timeline and inspector; the preview then fills the center.

## Behavior

- Panels are floating cards inset by one gutter from the window edges.
  The preview and timeline sit between them and never sit underneath a panel.
- Each panel has a header with its title or selection breadcrumb and a collapse button.
  A collapsed panel becomes a 40 px icon button in its corner, and the center grows into the freed space.
- Only panel bodies scroll; the window itself does not.
  Group long left-panel content into collapsible sections.
- The preview refits when the window resizes, a panel collapses or expands, or the timeline changes height.
- Panel open states are saved with the sketch; selection and the open step are transient, like play state.
- Below 720 px wide or 480 px tall, show only the desktop-only message.

Reference sizes, as CSS custom properties on the workspace root: `--panel-width: 340px`, `--inspector-width: 320px`, `--gutter: 16px`.
Use the shared theme tokens for surfaces, lines, and text so both themes work.

## Timeline

Reuse [Timeline](../src/components/Timeline.vue), [KeyframeLane](../src/components/KeyframeLane.vue), [Inspector](../src/components/Inspector.vue), [timeline.js](../src/lib/timeline.js), and [usePlayback](../src/composables/usePlayback.js).

- Steps play back to back.
  Each step holds tracks; a track is one clip with `start` and `end` keyframes in step-local seconds, an `ease` curve, and optional parameters.
- The overview shows the whole sequence with steps sized by duration.
  Click a step to jump to it and inspect it; double-click it to open its keyframe lanes.
- An open step loops during playback; "All steps" or Escape returns to the overview.
- Drag a clip to move it and a keyframe to retime it; arrows nudge 0.01 s and Shift 0.1 s; Escape during a drag restores the clip.
- Space plays and pauses unless a control has focus.
- Changing a step's duration rescales its keyframes and keeps the playhead at the same relative position.
- One `usePlayback` engine per page drives the preview, the inspector's ease preview, scrubbing, frame stepping, and export.
  Never give a control its own clock.
  Render a frame with a pure function of saved state and time, so preview and export agree.
- Save durations and tracks; restore tracks with `restoreTracks` so corrupt or out-of-range values fall back to defaults.
