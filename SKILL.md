---
name: baza
description: Standardize an unfamiliar or vibe-coded browser project into a maintainable, Git-backed sketch workspace with stable entry points, a WYSIWYG aspect-ratio canvas, Vue reuse where appropriate, a hot-reloading npm start command, project-adapted exports, and refresh-safe browser state. Use when inheriting experimental creative-code projects; do not use for ordinary feature work in an already coherent repository.
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

Provide one root `npm run start` command with hot reload. Preserve the existing package manager and build tool when viable; prefer adapting its configuration over migrating tools. Ensure the command prints a stable local URL, accepts the normal host/port flags of the underlying tool, and does not require a global installation.

## Preserve the preview contract

The navigation and sidebar implementation are not part of the contract. Keep or simplify them according to the target project; do not spend effort imposing a standard sidebar layout.

The composition canvas is the contract. Its visible frame must be WYSIWYG for aspect ratio: selecting or restoring an export aspect ratio changes the preview frame to that exact ratio. Scale the frame uniformly to fit the available workspace without stretching, cropping, or using export pixel dimensions as CSS dimensions. Canvas backing resolution may differ for device-pixel ratio or performance, but the logical composition bounds and framing must match export.

Place a distinctive Photoshop-style checkerboard behind transparent canvas pixels. Choose a light or dark checkerboard with clear adjacent-tile contrast appropriate to the surrounding UI. Keep tile size stable in screen space, make the render-frame boundary unambiguous, and never draw the checkerboard into PNG, SVG, video, or sequence output. Opaque artwork or an enabled project background covers it; transparent regions reveal it.

## Preserve browser continuity

Give each sketch a stable URL. On reload, restore the active sketch and user-meaningful controls when the existing product implies persistence. Use a small, versioned, project-scoped storage payload; validate and merge known keys only, tolerate missing or corrupt data, and avoid storing transient animation or DOM state.

When browser tools are available, keep one development-server process alive, reuse the same tab, and verify both direct navigation and refresh. A successful check returns to the same sketch and reconstructs the intended persistent state without console errors.

## Adapt exports

First find the project's render contract, deterministic state, timing model, content bounds, and current export behavior. Preview and export should share drawing logic; export must render at the requested output dimensions rather than upscale captured preview pixels.

For p5.js or Canvas2D projects requiring the full export suite, read [references/export-system-p5.md](references/export-system-p5.md). Treat it as an adaptation specification: preserve its deterministic rendering, snapshot, metadata, cleanup, and test invariants, but map names and modules to the target project. Do not copy p5-specific APIs into projects using another renderer.

For other renderers, carry across only applicable outcomes and explicitly report unsupported formats or browser codec limits. Keep export state project-scoped and embed only validated, versioned project data.

## Verify and hand off

Run the complete build and test suite plus targeted browser checks. At minimum prove:

1. `npm run start` launches with hot reload, and every sketch URL loads directly and after refresh.
2. Landscape, square, and portrait selections produce preview frames with the exact export aspect ratio and no distortion or cropping.
3. Transparent preview areas reveal the checkerboard, while exported files never contain the checkerboard.
4. Shared components preserve sketch behavior; export formats use their requested pixel dimensions and release locks/resources after failure.
5. A clean install and production build succeed using the repository's declared package manager.

Report the resulting structure, commands, supported exports, tests run, pre-existing failures, and genuine limitations. Finish the implementation rather than stopping after an audit or plan unless additional authority is required.
