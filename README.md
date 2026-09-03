# Bazaficate

A Codex skill for turning inherited vibe-coded creative projects into stable, shareable sketch workspaces.

It preserves existing behavior while organizing standalone sketches, keeping the preview canvas WYSIWYG for export aspect ratio, showing transparency with a Photoshop-style checkerboard, introducing reuse where it pays off, adding a hot-reloading `npm run start`, adapting a deterministic export system, and keeping browser state stable across refreshes. Navigation and sidebar design remain project-specific.

## Use

Install or link this folder as a Codex skill, then invoke it in the project you want to normalize:

```text
$bazaficate standardize this project, preserve its behavior, and implement the project export system.
```

The included audit helper is read-only:

```bash
node scripts/audit-project.mjs /path/to/project
```

## Repository contents

- `SKILL.md` — the workflow and decision rules Codex loads.
- `agents/openai.yaml` — Codex UI metadata.
- `scripts/audit-project.mjs` — a zero-dependency project inventory helper.
- `references/export-system-p5.md` — the detailed p5.js/Canvas2D export adaptation specification.
