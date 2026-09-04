# Baza

Turns vibe-coded browser projects into stable sketch workspaces.

## What it does

- Adds stable sketch URLs for different projects and hot reload through `npm run start`.
- Matches the preview aspect ratio to the export, WYSIWYG.
- Browser local storage of sketch parameters after refresh.
- Renders deterministic exports at the requested dimensions and runs build, browser, and clean-install checks.

## Prerequisites

- An agent that supports `SKILL.md`.
- Node.js with npm.
- Git.

## Use

Install or link this folder, then run:

```text
$baza standardize this project, preserve its behavior, and implement the project export system.
```

Audit a project without changing it:

```bash
node scripts/audit-project.mjs /path/to/project
```

## Recommended model-agnostic setup

Keep one global instruction file.
Symlink `AGENTS.md` and `CLAUDE.md` to it.

Suggested shared instructions:

```markdown
- Never use the em dash. Use a plain dash "-" instead.
- When writing commit messages, NEVER auto-add your agent name as co-author.
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
```

Optional concise speaking styles:

- [i-have-adhd](https://github.com/ayghri/i-have-adhd) - action first.
- [caveman](https://github.com/juliusbrussee/caveman) - minimal tokens.

## Repository contents

- `SKILL.md` - instructions.
- `agents/openai.yaml` - UI metadata.
- `scripts/audit-project.mjs` - project audit.
- `references/export-system-p5.md` - p5.js and Canvas2D exports.
