TODO:
consider for what happens if the project is not local


# Baza

Turns vibe-coded browser projects into stable sketch workspaces.

## What it does

- Adds stable sketch URLs for different projects and hot reload through `npm run start`.
- Matches the preview aspect ratio to the export, WYSIWYG.
- Browser local storage of sketch parameters after refresh.
- Guides control selection by intent, including Bézier timing editors and colors with alpha.
- Recreates the p5js beat-based timing system when requested: one timing root and automatic dependent durations.
- Includes PNG, MP4 (H.264), and WebM exports with size, FPS, duration, progress, and cancellation controls, without named export presets.
- Checks the build, preview, refresh, and actual exports with a short practical pass.

## Prerequisites

- An agent that supports `SKILL.md`.
- Node.js with npm.
- Git.

## Use

Install or link this folder, then run:

```text
$baza standardize this project, preserve its behavior, and implement the project export system.
```

Request the timing pattern on its own:

```text
$baza add the p5js beat-based system: one timing root per composition, with dependent durations resolved automatically.
```

Audit a project without changing it:

```bash
node scripts/audit-project.mjs /path/to/project
```

Standardized projects support the default development-server port and an explicit port:

```bash
npm run start
npm run start -- --port 4173
```

## Recommended model-agnostic setup

Keep one global instruction file.
Symlink `AGENTS.md` and `CLAUDE.md` to it.

Suggested shared instructions:

```markdown
## General Guidelines
- When writting comments never use Emojis.
- Never manually modify `CHANGELOG.md` files or any files that are marked as auto-generated.
- When writing or substantially editing long Markdown files, put each full sentence on its own line.
  Preserve normal Markdown structure, but avoid wrapping multiple sentences onto one physical line.
- When making technical decisions, do not give much weight to development cost.
  Instead, prefer quality, simplicity, robustness, scalability, and long-term maintainability.
- When doing bug fixes, always start by reproducing the bug in an E2E setting as closely aligned as possible with how an end user experiences it.
  This makes sure you find the real problem, so your fix will actually solve it.
- When end-to-end testing a product, be picky about the UI you see and be obsessed with pixel perfection.
  If something clearly looks off, even if it is not directly related to what you are doing, try to get it fixed along the way.
- Apply that same high standard to engineering excellence: lint failures, test failures, and test flakiness.
  If you see one, even if it is not caused by what you are working on right now, still get it fixed.

## Engineering Principles
Build like a disciplined field technician:
- Prefer the smallest technically complete solution.
- Favor boring, proven tools and explicit code over cleverness, abstractions, and dependencies.
- Optimize for robustness, maintainability, inspectability, and easy repair.
- Avoid feature creep, speculative generalization, unnecessary frameworks, and visual ornament.
- Use few moving parts. Every dependency, layer, and configuration option must justify itself.
- Make failure modes obvious; validate inputs and fail clearly.
- Before adding code, look for the simpler way to remove code or reuse what exists.
- Deliver working, well-tested solutions with concise documentation.

## Architecture and patterns

- Apply established architectural best practices and software design patterns where they improve clarity, testability, or maintainability.
- Use your judgment to choose any suitable architectural or design pattern based on the project's needs and existing architecture.
- Examples include Strategy for interchangeable behavior, Factory for selecting and creating UI elements, Builder for assembling complex UI elements, and Facade for exposing a small, cohesive interface to a complex subsystem.
  These are illustrative suggestions, not an exhaustive list or a required set.
- Keep implementations direct when additional structure offers no clear benefit.

```

Optional concise speaking styles:

- [i-have-adhd](https://github.com/ayghri/i-have-adhd) - action first.
- [caveman](https://github.com/juliusbrussee/caveman) - minimal tokens.

## UI component reference

Run the interactive gallery locally:

```bash
npm install
npm run start
```

Use `npm run start -- --port 4173` to choose a port.
Run `npm run build` to check the Vue production build and `npm test` to check shared value logic.

[index.html](index.html) mounts the gallery in [src/App.vue](src/App.vue).
Each control in [src/components](src/components/) is an independent Vue single-file component with brief notes, scoped CSS, an HTML template, and JavaScript.
The gallery supplies `v-model` values and persistence; components can be reused independently with their explicit imports and the shared [styles](src/styles.css).
See the [control mapping](references/ui-controls.md#choose-by-intent) to find the relevant component.

## Repository contents

- `SKILL.md` - instructions.
- `agents/openai.yaml` - UI metadata.
- `scripts/audit-project.mjs` - project audit.
- [references/ui-controls.md](references/ui-controls.md) - intent-to-control guidance, Bézier timing, alpha-aware colors, and other reusable creative controls.
- [references/beat-timing.md](references/beat-timing.md) - single-root composition timing, automatic duration resolution, and integration checks.
- `references/export-system.md` - required export implementation and verification for every renderer.
- `references/export-system-p5.md` - optional p5.js and Canvas2D export extensions.
