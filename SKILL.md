---
name: baza
description: Standardize an unfamiliar or vibe-coded browser project into a maintainable, Git-backed sketch workspace with stable entry points, a WYSIWYG aspect-ratio canvas, Vue reuse where appropriate, a configurable-port hot-reloading npm start command, PNG/MP4/WebM exports, and refresh-safe browser state. Also use when asked to build or reproduce beat-based composition timing with one timing root. Otherwise, do not use for ordinary feature work in an already coherent repository.
---

# Baza

Turn the supplied project into a dependable creative-coding workspace without changing its visible output or interaction model unnecessarily.
Favor small, readable implementations, a few useful documents, and direct checks of real behavior.
Keep verification proportional to the change; add automated tests only when they protect meaningful logic or prevent a concrete regression.

## New projects

When creating a project from scratch, start with only the lowercase text `hello`, centered horizontally and vertically in the composition canvas.
Keep the initial composition static and free of graphics, illustrations, decorative shapes, or other artwork.
Apply the workspace, preview, persistence, and export requirements below to this minimal composition.

## Beat-based composition timing

When the user requests a beat-based system, automatic durations, or the p5js single-root timing pattern, read [references/beat-timing.md](references/beat-timing.md).
Each composition owns one absolute timing root, resolves and freezes `beatSeconds`, and derives dependent durations from one named parent using `"auto"` or `"calc(auto * n)"`.
For a timing-only request, apply that reference and relevant verification without expanding the work into workspace normalization or new export features.
Introduce this timing model when requested; preserve an existing project's timing behavior during ordinary standardization.

## Establish the contract

Before editing, inspect the repository, entry points, package manager, frameworks, build tools, browser storage, rendering lifecycle, export code, and tests. Run `node <skill-folder>/scripts/audit-project.mjs <project-folder>` for a quick read-only inventory, then verify its findings directly.

Treat existing work as user-owned:

- Preserve unrelated files and working changes.
- Initialize Git only when the target is not already inside a repository. Never replace existing history.
- Do not commit, publish, delete originals, or add remote services unless requested.
- Record the current runnable behavior before restructuring. If it does not run, distinguish pre-existing failures from regressions.

## Normalize the workspace

Choose the smallest structure that makes every distinct visual experiment independently addressable. Prefer `sketches/<slug>/index.html` when the project already contains multiple page-like sketches. Keep a single application structure when splitting it would create artificial duplication.

For Vue projects, move genuinely shared UI, controls, utilities, and rendering adapters into reusable modules or components. Keep sketch-specific rendering and state local. Do not introduce Vue merely to wrap static HTML or a framework that already has a sound component model.

When adding or revising creative controls, read [references/ui-controls.md](references/ui-controls.md) to choose controls by user intent: timing ramps, colors and alpha, gradients, ranges, spatial values, randomness, and playback.
It defines the reusable Bézier timing editor and alpha-aware color/palette contract, with guidance for choosing numeric, spatial, and discrete controls.
Apply only the patterns needed by the requested work and preserve explicit user choices.

Use icons from a free, open-source icon library for UI elements such as buttons, toolbars, navigation, and playback controls.
Reuse the project's existing library when it meets this requirement; otherwise choose one consistent icon set and include only the icons needed.
Preserve the library's license and required attribution, and give icon-only controls accessible names.
Do not substitute emoji, Unicode symbols, or custom-drawn icons for library icons in UI controls.

Provide one root `npm run start` command with hot reload.
Preserve the existing package manager and build tool when viable; prefer adapting its configuration over migrating tools.
Support explicit port selection with `npm run start -- --port <port>` regardless of the underlying development server.
When no port is supplied, retain the project's normal default.
Reject invalid ports clearly, surface port-in-use failures, print the actual local URL, and do not require a global installation.

## Preserve the preview contract

The navigation and sidebar implementation are not part of the contract. Keep or simplify them according to the target project; do not spend effort imposing a standard sidebar layout.

The composition canvas is the contract. Its visible frame must be WYSIWYG for aspect ratio: selecting or restoring an export aspect ratio changes the preview frame to that exact ratio. Scale the frame uniformly to fit the available workspace without stretching, cropping, or using export pixel dimensions as CSS dimensions. Canvas backing resolution may differ for device-pixel ratio or performance, but the logical composition bounds and framing must match export.

Place a distinctive Photoshop-style checkerboard behind transparent canvas pixels. Choose a light or dark checkerboard with clear adjacent-tile contrast appropriate to the surrounding UI. Keep tile size stable in screen space, make the render-frame boundary unambiguous, and never draw the checkerboard into PNG, SVG, video, or sequence output. Opaque artwork or an enabled project background covers it; transparent regions reveal it.

## Preserve browser continuity

Give each sketch a stable URL. On reload, restore the active sketch and user-meaningful controls when the existing product implies persistence. Use a small, versioned, project-scoped storage payload; validate and merge known keys only, tolerate missing or corrupt data, and avoid storing transient animation or DOM state.

When browser tools are available, keep one development-server process alive, reuse the same tab, and verify both direct navigation and refresh. A successful check returns to the same sketch and reconstructs the intended persistent state without console errors.

## Adapt exports

Deliver visible, working PNG, MP4 (H.264), and WebM export paths unless the user explicitly narrows the requested formats.
Default new export settings to MP4; preserve a valid saved or user-selected format.
An existing Export PNG button is an incomplete export implementation.

Read [references/export-system.md](references/export-system.md) for every project before implementing exports, including p5.js, Canvas2D, Three.js, and other renderers.
It defines the required panel, deterministic video rendering, encoding, cleanup, and a practical export check.
Adapt the project's renderer to that contract instead of using its framework as a reason to omit video.

Use direct format, size, FPS, and duration settings without named export presets or batch recipes.
Preserve existing additional export capabilities; implement new SVG, PNG-sequence, embedded-state, or console/batch features only when requested.
When preserving or implementing those extensions for p5.js or Canvas2D, also read [references/export-system-p5.md](references/export-system-p5.md).

## Verify and hand off

Run the existing build and relevant existing tests once, when available.
Use one short browser pass:

1. Start the project and try the controls affected by the changes.
   Check hot reload and explicit port selection when changing the development server.
2. Check that the preview looks right at a changed aspect ratio and that refreshing restores the sketch and its settings.
3. Confirm real exports using the [export check](references/export-system.md#export-check).

A clean install, a new test framework, and exhaustive browser or settings matrices are not routine requirements.
Expand verification only when a failure or a specific risk warrants it.
Report how to run the project, what changed, what was checked, and any remaining limitation.
If a format could not be exercised in the available browser, say so explicitly.
Finish the implementation rather than stopping after an audit or plan unless additional authority is required.
