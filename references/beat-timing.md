# Beat-based composition timing

Use this pattern when the user asks for beat-based composition timing, automatic durations, or the timing system from the p5js project.
A beat is a shared unit of composition time; audio detection or music synchronization is separate scope.

## Source and portability

The reference implementation is `/Users/pyotr/wip/openai/p5js`:

- `src/timeline/timeline-settings.js` defines `resolveTimelineSettings`, `resolveTimelineDuration`, and `requireMatchingTimelineValue`.
- `src/core/automatic-duration.js` defines the duration syntax, validation, resolution, and provenance.
- `test/timeline-settings.test.js` demonstrates the public contract and invalid inputs.

Inspect these files when available and reuse or adapt the two modules together, preserving their relative import or adjusting it to the target layout.
They are independent of p5.js and contain the core mechanism; connecting the target project's durations and playback to it is still required.
When the source project is unavailable, implement the contract below with small pure functions in the target project's language and existing structure.

## One timing root per composition

Choose the root from the intended authoring behavior:

| Mode | Authored root | Derived values | Use when |
| --- | --- | --- | --- |
| `fixed-body` | Positive finite `bodyDurationSeconds` and positive safe integer `beatCount` | `beatSeconds = bodyDurationSeconds / beatCount` | The body must fit a known duration. |
| `fixed-beat` | Positive finite `beatSeconds` | Body duration follows the sequence; for N equal beats, `N * beatSeconds`. | Steps can be added or recorded while beat length stays constant. |

`fixed-body` is the reference default when `mode` is omitted.
Treat its `beatSeconds` as output, not another authored input.
In `fixed-beat`, reject authored `bodyDurationSeconds` or `beatCount` alongside the beat root.
The root must be absolute: resolving it from `"auto"` would make its children determine their own parent.
Validate the derived beat as finite and positive too, then freeze the resolved settings object.
Freezing describes one resolved snapshot; a user edit creates a new snapshot and resolves its descendants again.

Body duration is distinct from total playback duration when intro and outro phases surround it.
For sequential phases, derive total duration from `intro + body + outro`.
In `fixed-beat`, derive the body from the actual sequence rather than maintaining a second editable body clock.

## Automatic durations form a directed graph

Author dependent durations as `"auto"` or `"calc(auto * n)"` and resolve them in parent-before-child order.
Each automatic duration has exactly one named parent, which ultimately traces back to the composition root.
An intro can inherit the beat, while a reveal inside that intro inherits the resolved intro duration.
`"auto"` means the selected parent's duration, so it does not always mean one beat directly.

| Authored value | Result |
| --- | --- |
| `"auto"` | Parent duration × 1. |
| `"calc(auto * 0.5)"` | Half the parent duration. |
| `"calc(auto * 2)"` | Twice the parent duration. |
| Positive finite number | Explicit seconds, independent of the parent. |

The reference resolver accepts explicit numbers for compatibility and intentional overrides.
To reproduce the requested system where all timing follows the root, keep dependent settings automatic; an explicit numeric child stops inheriting tempo changes.
Use the project's schema or normalization boundary to enforce automatic children if that is a strict contract.
The generic resolver alone does not enforce it.

Implement the small `calc(auto * n)` grammar with a positive finite decimal multiplier and validate the resulting seconds.
Use a parser or a narrow regular expression, never `eval` or a general expression engine.
Match the reference's syntax when reusing its modules; arbitrary arithmetic is outside that grammar.

`resolveTimelineDuration(value, { automaticSeconds, label, source })` passes one candidate to `resolveAutomaticDuration`.
The lower-level resolver selects the first positive finite candidate, so use the timeline wrapper or supply exactly one candidate to retain the single-parent contract.
An automatic value without a valid parent must throw a labeled error instead of silently inventing a fallback duration.
Resolve a directed acyclic graph; parents must not depend on their descendants.

Return a resolution record with `{ authored, source, baseSeconds, multiplier, seconds }`.
Pass `.seconds` to consumers and retain the record for inspection so an agent or UI can explain where a duration came from.
Explicit numbers use `source: "explicit"`, with the value as both `baseSeconds` and `seconds`, and multiplier 1.

## Minimal wiring example

After placing the two modules under the same `src/` layout, this example can run from the target project's root:

```js
import {
  resolveTimelineSettings,
  resolveTimelineDuration,
} from "./src/timeline/timeline-settings.js";

const authored = {
  timing: { mode: "fixed-body", bodyDurationSeconds: 12, beatCount: 6 },
  intro: { durationSeconds: "auto" },
  reveal: { durationSeconds: "calc(auto * 0.5)" },
};

function resolveComposition(settings) {
  const timing = resolveTimelineSettings(settings.timing, "demo.timing");
  const intro = resolveTimelineDuration(settings.intro.durationSeconds, {
    automaticSeconds: timing.beatSeconds,
    label: "demo.intro.durationSeconds",
    source: "demo.timing.beatSeconds",
  });
  const reveal = resolveTimelineDuration(settings.reveal.durationSeconds, {
    automaticSeconds: intro.seconds,
    label: "demo.reveal.durationSeconds",
    source: "demo.intro.durationSeconds",
  });
  return { timing, intro, reveal };
}

const first = resolveComposition(authored);
// Beat: 2 seconds; intro: 2 seconds; reveal: 1 second.
const slower = resolveComposition({
  ...authored,
  timing: { ...authored.timing, bodyDurationSeconds: 24 },
});
// Beat: 4 seconds; intro: 4 seconds; reveal: 2 seconds.
```

For a dynamic sequence, replace the authored timing root with `{ mode: "fixed-beat", beatSeconds: 3 }`.
Eight equal body steps then occupy 24 seconds; adding a ninth makes the body 27 seconds while the beat stays 3 seconds.

## Connect the rest of the project

1. Trace existing timing consumers, including phases, transitions, generators, repeated effects, and preview settings, and assign each dependent duration its intended parent.
   Keep structural counts and dimensionless fractions as counts and fractions; resolve their time spans from the shared beat.
2. Resolve the root and its descendants at the configuration boundary, before constructing consumers.
   Renderers, transitions, and UI read those resolved values rather than each computing a tempo or supplying unrelated fallback seconds.
3. Preserve authored automatic expressions in editable and persisted state.
   Rebuild the resolved graph after root changes and restoration so saving resolved seconds does not turn automatic children into explicit overrides.
4. Migrate legacy timing aliases to derived reads.
   When an alias must remain for compatibility, use `requireMatchingTimelineValue(value, expected, { label, source })` to accept an omitted or matching value and reject conflicts.
5. Feed preview, scrubbing, and deterministic export the same resolved graph and composition time.
   Compute local progress from that time and the resolved phase duration; easing changes normalized progress within the duration.
   FPS determines sample times, and export duration determines the capture window; neither independently retimes the composition.

Duration resolution defines the timing relationships; the two helper files do not implement a playback scheduler.
Reuse the target's time-driven renderer or simulation and connect every participating effect to its composition time.

## Verify the behavior

Use focused checks for the graph and one browser pass through affected controls:

1. Resolve the example and verify beat/intro/reveal are 2/2/1 seconds; change the body root to 24 and verify 4/4/2 without editing children.
2. In `fixed-beat`, add a step and verify the body grows by one beat while intro and effect durations keep their configured relationships.
3. Reject invalid roots, a mixed `fixed-beat` root, missing automatic parents, invalid multipliers, non-finite results, and conflicting legacy aliases with useful labels.
4. Change the root through the UI, refresh, and verify automatic descendants still follow it.
   At the same composition time and seed, preview, scrubbing, and any existing export path should show the same phase and progress.

Report the root inputs, the important parent relationships, and any intentionally explicit duration overrides.
