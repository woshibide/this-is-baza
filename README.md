# Baza

An agent skill that gives browser sketches a standard creative-coding workspace, plus a runnable gallery of reusable UI controls.
The workspace includes reference controls, an aspect-correct preview, saved state, and PNG/MP4/WebM exports.
The gallery is the visual and interaction reference; it is not a complete sketch application or exporter.

## Workspace standard

- Preserve the sketch's artwork and renderer while adding the standard workspace.
- Restore the active sketch, artwork controls, and export settings after refresh.
- Match preview framing to the selected export aspect ratio.
- Verify real PNG, MP4, and WebM downloads through the workspace UI.
- Reuse or port the supplied controls, preserving their appearance and interactions.

## Use the skill

Install or link this folder into your agent's skills directory, then invoke:

```text
$baza give this sketch the standard workspace, preserving its artwork.
```

For a new project:

```text
$baza create a new sketch workspace.
```

Use a focused request to adopt only the controls or optional timing pattern:

```text
$baza reuse the reference color and Bézier controls in this sketch.
$baza add beat-based timing with one composition root and automatic dependent durations.
```

The [skill instructions](SKILL.md) define the workspace contract and completion checks.
Local projects need Node.js, npm, and Git.

## Run and reuse the UI examples

From this folder:

```bash
npm install
npm run start
```

Use `npm run start -- --port 4173` to choose a port.
Use `npm run build` and `npm test` to check the gallery build and shared value logic.

Start with the [control index and reuse instructions](references/ui-controls.md).
Choose an example by intent, inspect it in the gallery, and reuse or port its component together with its imported helpers and shared styles.
Preserve the appearance and interactions while connecting its values to the target artwork and saved state.
[App.vue](src/App.vue) demonstrates composition, persistence, and a shared playback clock.

The gallery includes:

| Group | Examples |
| --- | --- |
| Timing | Bézier ramp, pulse envelope, scene timeline, playback, and scrubbing |
| Color | Alpha-aware color picker, palette, and gradient stops |
| Range | Paired interval values with editable bounds |
| Geometry | XY position, angle, and linked dimensions |
| Values | Integer count, choices, and toggles |

Shared components provide exact numeric entry, number dragging, editable limits, and consistent graphical states.
The examples support light and dark themes through shared CSS tokens.
Read the [reuse workflow](references/ui-controls.md#reuse-workflow) before copying components so their helpers, styles, and state connections travel with them.

## References

- [UI examples](references/ui-controls.md): control selection, reuse, and integration checks.
- [Export system](references/export-system.md): required export implementation and verification for every renderer.
- [Beat timing](references/beat-timing.md): optional single-root composition timing.
- [Export extensions](references/export-system-p5.md): optional p5.js and Canvas2D export recipes.

For a coarse read-only project inventory, optionally run:

```bash
node scripts/audit-project.mjs /path/to/project
```

The inventory reports code signals; it does not verify runtime behavior.
