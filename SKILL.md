---
name: baza
description: Standardize an unfamiliar or vibe-coded browser project into a maintainable, Git-backed sketch workspace with stable entry points, a WYSIWYG aspect-ratio canvas, Vue reuse where appropriate, a configurable-port hot-reloading npm start command, PNG/MP4/WebM exports, and refresh-safe browser state. Use when inheriting experimental creative-code projects; do not use for ordinary feature work in an already coherent repository.
---

# Baza

Turn the supplied project into a dependable creative-coding workspace without changing its visible output or interaction model unnecessarily.

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
It defines the required panel, deterministic video rendering, encoding, cleanup, and actual-download acceptance checks.
Adapt the project's renderer to that contract instead of using its framework as a reason to omit video.

Use direct format, size, FPS, and duration settings without named export presets or batch recipes.
Preserve existing additional export capabilities; implement new SVG, PNG-sequence, embedded-state, or console/batch features only when requested.
When preserving or implementing those extensions for p5.js or Canvas2D, also read [references/export-system-p5.md](references/export-system-p5.md).

## Verify and hand off

Run the complete build and test suite plus targeted browser checks. At minimum prove:

1. `npm run start` launches with hot reload, `npm run start -- --port <port>` binds to the requested port, and every sketch URL loads directly and after refresh.
2. Landscape, square, and portrait selections produce preview frames with the exact export aspect ratio and no distortion or cropping.
3. Transparent preview areas reveal the checkerboard, while exported files never contain the checkerboard.
4. The visible export panel downloads a PNG, an H.264 MP4, and a WebM that pass the file and playback checks in [references/export-system.md](references/export-system.md#acceptance-checks).
5. Shared components preserve sketch behavior; export cancellation and failure release locks/resources and restore the preview.
6. A clean install and production build succeed using the repository's declared package manager.

Report the resulting structure, commands, tests run, pre-existing failures, and genuine limitations.
For each required export format, report a verified sample path and its dimensions, plus codec, FPS, and duration for video, or the concrete reason it remains unverified.
An unsupported codec in the test browser is a limitation to report, not a passing video-export check.
Finish the implementation rather than stopping after an audit or plan unless additional authority is required.
