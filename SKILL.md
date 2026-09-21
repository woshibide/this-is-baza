---
name: baza
description: Create or standardize browser sketches with Baza's reference UI controls, aspect-correct preview, saved state, and PNG/MP4/WebM exports. Also use when adding Baza controls or its beat-based timing to an existing sketch. Keep focused requests scoped to the requested part of the workspace.
---

# Baza

Give every sketch a standard creative-coding workspace while preserving its artwork and rendering behavior.
The bundled UI examples define the controls' appearance and interactions: reuse or port them rather than inventing replacements.
Apply the full workspace contract below unless the user explicitly narrows the task.
For a controls-only or timing-only request, follow the relevant reference and verify the affected behavior.

## Completion checks

A standard workspace is complete when these checks pass in the browser:

| Check | Required evidence |
| --- | --- |
| Saved state | Change artwork controls and export settings, navigate to a sketch directly, and refresh: the active sketch and edited values return without console errors. |
| Preview framing | Change aspect ratio and output size: the preview frame has the selected ratio, and exported artwork has the same composition bounds and framing. |
| Exports | Download and open a PNG and short MP4 and WebM files through the normal UI, checking size, framing, motion, and absence of editor overlays. |

Record each check as passed, failed, or unverified in the handoff.
A visible export button or successful build does not establish these behaviors.
If browser or codec availability prevents a check, report the concrete limitation and which behavior remains unverified.

## Inspect and preserve

Run the existing project and inspect its entry points, renderer, controls, storage, exports, build scripts, and tests before editing.
Distinguish existing failures from regressions.
The optional `node <skill-folder>/scripts/audit-project.mjs <project-folder>` gives a coarse inventory; inspect the relevant code and runtime to verify its signals.
Preserve unrelated files, working changes, and Git history; initialize Git only outside an existing repository.
Committing, publishing, deleting originals, and adding remote services require a user request.

Keep the existing framework, package manager, and build tool when viable.
Share genuinely reusable controls and helpers; keep sketch-specific rendering and state local.
Use stable sketch URLs and the smallest existing structure that makes each sketch independently addressable.
Navigation and sidebar layout can follow the target project.

For a new project without supplied artwork, start with only lowercase `hello`, centered horizontally and vertically in a static composition canvas.
It receives the same workspace controls, persistence, and exports as any other sketch.

## Build the workspace

### Start command

Provide hot reload through root `npm run start`, with `npm run start -- --port <port>` for explicit port selection.
Retain the normal default port when omitted, reject invalid or occupied ports clearly, and print the actual local URL.
Use project dependencies rather than global installations.

### Reference controls

When adding or changing controls, use the [UI example guide](references/ui-controls.md) to select and reuse the relevant components, helpers, and styles.
Preserve their appearance, direct manipulation, exact entry, keyboard behavior, and graphical state distinctions unless the user requests a change.
Bind the controls to real artwork values and the project's saved state; include only controls that the sketch uses.
Reuse an existing open-source icon set or the bundled Lucide icons, retain attribution, and give icon-only controls accessible names.

### Composition preview

The visible composition frame follows the selected export aspect ratio and scales uniformly to fit the workspace.
Keep logical composition bounds independent of CSS size, export pixel dimensions, and backing resolution; avoid stretching or cropping the frame.
Show transparent pixels over a clearly contrasting checkerboard with stable screen-space tiles and an unambiguous frame boundary.
Project backgrounds cover the checkerboard, which stays outside all exported artwork.

### Saved state

Persist the active sketch, user-meaningful artwork controls, and export settings for every sketch.
Use a small, versioned, project-scoped payload; validate and merge known keys, tolerate missing or corrupt data, and keep transient playback, focus, and drag state out of storage.
Restore saved values into the controls and renderer before presenting the composition.

### Exports

Provide PNG, MP4 (H.264), and WebM unless the user explicitly narrows the formats.
Read [export-system.md](references/export-system.md) when implementing or repairing exports for any renderer.
It owns the panel settings, deterministic rendering, encoding, progress, cancellation, cleanup, and export check.
Default new export settings to MP4 while retaining valid saved or user-selected formats.
Use direct format, size, FPS, and duration settings without named presets or batch recipes.
Preserve existing additional export capabilities.
For requested or existing SVG, PNG-sequence, embedded-state, or console/batch extensions in p5.js or Canvas2D, use [export-system-p5.md](references/export-system-p5.md).

## Optional timing pattern

For requested beat-based timing, automatic durations, or the p5js single-root timing pattern, use [beat-timing.md](references/beat-timing.md).
Preserve existing timing behavior during ordinary workspace standardization.

## Verify and hand off

Run the existing build and relevant tests, then perform the completion checks above using one running development server and the same browser tab.
For focused requests, check the affected controls, saved state, and existing preview/export paths without adding unrelated workspace features.
Compare affected controls with their gallery examples and check hot reload and explicit port selection when changing the server.
Keep verification proportional: add tests for meaningful logic or concrete regressions, and broaden checks when an observed failure warrants it.
Report the run command, changes, completion-check results, and remaining limitations.
