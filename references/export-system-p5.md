# p5.js Export Adaptation Specification

This document is reference material for `$bazaficate`. Read it only when the target project uses p5.js or a compatible Canvas2D renderer and requires the full export suite. Adapt the architecture to the target; do not treat project-specific names or APIs below as universal requirements.

## Original implementation brief

Implement a production-ready browser export system in this p5.js project using the same architecture and behavior described below. Adapt names to the new project, but preserve the approach. Do the implementation, integration, and tests; do not stop at a plan.

## Goal

Build one export suite for static PNG and standalone SVG, plus deterministic MP4, transparent WebM, and numbered PNG-sequence motion exports. Preview and export must use the same drawing code, but motion export must never screen-record the live canvas or depend on real time. It must create a fresh render session from a complete project snapshot, advance it with a fixed clock, and draw analytic Canvas2D geometry directly at the requested output size.

## First inspect and establish the render contract

1. Inspect the existing p5.js lifecycle, renderer, animation state, controls, random sources, and tests. Preserve the project's style and avoid rewriting unrelated code.
2. Extract rendering and simulation behind a director/session API that is independent of the visible canvas. It must support, or have equivalents for:
   - `update(frame)`, `draw(frame, context)`, `dispose()`
   - `snapshotProjectState()` and `restoreProjectState(snapshot)`
   - `animationDuration()` returning one finite seamless-cycle duration in seconds, or `null` for a continuous simulation
   - `contentBounds()` returning `{ x, y, width, height }`, with the logical viewport as fallback
   - optional `seek(time)` and `inspect()`
3. Inject runtime dependencies into a session: logical viewport, Canvas2D context, deterministic project seed/random source, storage, and any host services. Do not let render/simulation code read the DOM canvas, wall time, `Date.now()`, or `Math.random()`.
4. Make every draw operation accept a Canvas2D-like context. The live p5 canvas, an offscreen export canvas, and the SVG recording context must all travel through the same renderer. Do not upscale captured preview pixels.

Use this frame shape consistently:

```js
{
  dt,                   // simulation delta in seconds
  compositionDt: dt,
  time,                 // absolute project time in seconds
  frameIndex,
  viewport,             // logical composition viewport
  pointer: { active: false, x: 0, y: 0 },
  exporting: true,
  exportFrameIndex,     // output-frame index when drawing motion
  exportFrameCount      // total output frames when drawing motion
}
```

## Module shape

Create a small `src/export/` subsystem with separate, testable ES modules for:

- export state and normalization
- resolution/aspect calculations and contain-fit framing
- deterministic frame-clock math
- the export controller/orchestrator
- browser video encoding
- Canvas2D-to-SVG recording
- project snapshot/restore
- cross-format embedded metadata/signature handling
- PNG-sequence directory/ZIP sink
- CRC32 and a dependency-free store-only ZIP writer
- filenames and Blob downloads
- export panel and console-command adapter

Keep pure calculations and binary utilities free of browser globals so Node tests can import them.

## Export state and controls

Use one mutable, normalized export-state object shared by the panel and console commands. Defaults:

```js
{
  mode: "motion",
  exportFormat: "mp4",
  aspect: "16:9",
  resolution: 1920,
  resW: 1920,
  resH: 1080,
  fps: 30,
  transparentBg: false,
  embedProjectState: true
}
```

Treat `resW` and `resH` as authoritative. Aspect and long-edge presets only calculate those fields. Provide long-edge presets 1280, 1920, 2560, and 3840 and aspect presets `16:9`, `4:3`, `3:2`, `1:1`, `4:5`, `2:3`, and `9:16`. Bound dimensions to 2–16384 and FPS to 1–120. For video, round dimensions down to positive even values so codecs such as H.264 accept them.

Static mode permits PNG and SVG. Motion mode permits MP4, WebM, and PNG sequence. Show controls contextually: transparency for PNG/PNG sequence, FPS for motion, and embedded-state controls for every supported stamped format except WebM.

The panel must expose workflow, format, aspect, resolution, width, height, FPS, transparency, embed-state, one Export button, collapse control, and an accessible progress bar/status. During export, lock all relevant controls and canvas input.

## Deterministic motion algorithm

Use a fixed internal simulation rate of 60 Hz, independent of output FPS and encoding speed.

```js
frameCount = Math.max(1, Math.round(durationSeconds * outputFps));
outputTime(i) = i / outputFps;
```

Render exactly indices `0 ... frameCount - 1`. Never render `time === duration`; omitting that duplicated loop endpoint is required for seamless playback.

At export start:

1. Reject concurrent exports with a single `exporting` guard.
2. Record whether the p5 loop was running, then lock panel/input and call `p.noLoop()`.
3. Snapshot the live director, selected composition, deterministic seed, export settings, and preview timeline.
4. Create a fresh director/session with injected dependencies, restore the snapshot into it, calculate content bounds once, and initialize it with an update at time 0 and `dt: 0`.
5. Reject motion export clearly when `animationDuration()` is not finite and positive. Static PNG/SVG must still work for continuous simulations.

For each output frame `i`:

1. The fresh session must already represent `i / fps`.
2. Clear the output canvas with an identity transform. Leave it zero-alpha for transparent output; otherwise fill the configured background.
3. Draw using the frame metadata above, including `exportFrameIndex` and `exportFrameCount`.
4. Send the canvas to the selected encoder/sink with timestamp `i / fps` and duration `1 / fps`.
5. Advance the simulation from `i / fps` to `(i + 1) / fps` using chunks no larger than `1 / 60`. Use a smaller final chunk when output FPS does not divide 60.
6. Update progress and yield with `setTimeout(resolve, 0)` so the browser UI remains responsive.

Wrap the entire run in `try/catch/finally`. On any success, error, unsupported codec, picker cancellation, or encoder failure: cancel unfinished encoding, dispose the fresh session, clear progress, unlock controls/input, redraw the preview, and resume `p.loop()` only if it had been running before export. Prevent page unload while exporting.

## Framing and alpha

Contain-fit `contentBounds()` into the output frame without cropping:

```js
scale = Math.min(outputWidth / bounds.width, outputHeight / bounds.height);
dx = (outputWidth - bounds.width * scale) / 2 - bounds.x * scale;
dy = (outputHeight - bounds.height * scale) / 2 - bounds.y * scale;
```

Draw inside `context.save()`, `translate(dx, dy)`, `scale(scale, scale)`, and `restore()`.

- Transparent PNG and transparent PNG-sequence frames: clear to zero alpha.
- WebM: always preserve alpha and clear to zero alpha.
- MP4: opaque; fill the configured background.
- SVG: do not add a page-background rectangle or preview-only interaction guides.

## Format implementations

### PNG still

Create an offscreen canvas at exact output dimensions, render the live project's current preview time into it, call `canvas.toBlob(..., "image/png")`, optionally stamp project metadata, then download via a temporary `<a download>` and revoke the object URL after a short delay.

### SVG still

Implement a Canvas2D-compatible recording context used by the same draw path. It must track save/restore state, transforms, paths, fill/stroke, alpha, line properties, clipping, rectangles, rounded rectangles, arcs/ellipses converted to paths, and text properties used by this project. Serialize a standalone SVG with width, height, viewBox, defs/clipPaths, and recorded elements. Add project metadata only when enabled. Explicitly test every Canvas2D method the artwork uses; fail clearly for unsupported operations instead of silently producing a wrong SVG.

### MP4 and transparent WebM

Use a browser WebCodecs-based muxer such as a vendored Mediabunny ES module, loaded lazily. Feed it the export canvas; do not use `MediaRecorder`.

- MP4: probe codecs in compatibility order (`avc`, then `vp9`, then `av1`), preferably with realtime/display-order latency. If that probe fails, retry without the latency constraint. Use an in-memory fast-start MP4.
- WebM alpha: probe `vp9`, `vp8`, then `av1` with `alpha: "keep"`; preserve alpha in both source and track.
- Use high bitrate/quality, a one-second keyframe interval, explicit frame rate, exact timestamps, and exact frame durations.
- Return a clear browser-support error if no compatible encoder exists.
- Finalize to an in-memory Blob. Provide a safe `cancel()` that tolerates an encoder already torn down by an error.

### PNG sequence

Name frames with one timestamped prefix and zero-based numbering padded to at least four digits: `PREFIX_0000.png`.

If `window.showDirectoryPicker` exists, ask for a read/write directory and stream each frame immediately through `getFileHandle(..., { create: true })` and `createWritable()`. Otherwise collect the encoded PNG bytes and download one ZIP at the end. Build a deterministic store-only ZIP (compression method 0) with UTF-8 filenames, CRC32, fixed DOS epoch timestamps, central directory records, and explicit rejection of unsupported ZIP64 sizes/counts. PNG data is already compressed, so do not deflate it again.

## Restorable project state embedded in exports

Create a versioned payload containing:

```js
{
  app: "<stable-app-id>",
  project: "<stable-project-id>",
  version: 1,
  params: {
    version: 1,
    director: /* complete director snapshot */,
    export: /* known export-state keys only */,
    seed: /* uint32 deterministic seed */,
    timeline: { time, frameIndex }
  },
  svg: null
}
```

Use one ASCII magic marker, for example `<APPNAME>PARAMS1`, followed by a fixed 10-digit payload length and UTF-8 JSON. Limit accepted metadata to 16 MiB and validate all lengths before allocating or parsing.

- PNG: insert one uncompressed `iTXt` chunk with a stable keyword immediately before `IEND`, compute its CRC, and replace an existing same-keyword chunk rather than accumulating copies. Stamp every sequence frame too.
- MP4: append a valid top-level `skip` box containing the binary payload.
- SVG: put a base64 version of the UTF-8 JSON payload inside a stable `<metadata id="...">`; base64 prevents XML escaping from altering it.
- WebM: leave unstamped because this implementation does not rely on unsafe trailing EBML data.

Implement one bounded extractor that scans file bytes for the magic marker, validates the declared length and JSON, skips malformed marker-like candidates, and applies an app/project/version acceptance predicate.

Support dropping an exported PNG, MP4, or SVG onto the app to restore state. Before applying it, capture the current snapshot. Validate identity/version, seed, timeline, and known state keys; ignore unknown export-setting keys. Apply restoration as one undoable action. If any part fails, atomically roll back to the pre-drop snapshot, resync the panel, redraw, and show a concise error.

## Console API and filenames

Expose one global command function that accepts either a normal string or tagged template because `export` is reserved. Support at least:

```js
app`status`
app`export --png`
app`export --mp4 --fps 60 --cycles 2`
app`export --format webm --aspect 9:16 --resolution 1920`
app`panel show`
```

Flags must mutate the same normalized state object as the panel and immediately resync it. Include `--format`, format shortcuts, aspect/resolution/width/height/FPS, `--transparent`/`--no-transparent`, `--embed-state`/`--no-embed-state`, composition subsets, all compositions, cycle count, and dry-run where the project supports multiple compositions. Batch export should continue after one composition fails and return a structured per-item result, then restore the originally active composition.

Generate safe filenames from sanitized project/composition/mode segments plus one local timestamp captured at export start, e.g. `PREFIX_composition_mode_MMDD-HHMMSS-alpha.webm`. Use the same base for every frame in a sequence.

## Tests and completion criteria

Add focused Node tests for the pure modules and browser-adapter tests with fakes. At minimum prove:

1. Frame count/timestamps omit the duplicate endpoint, fixed steps sum exactly to one output-frame interval, and no step exceeds `1/60` within floating tolerance.
2. Contain-fit centers without cropping; preset normalization bounds values; video dimensions round down to even values; filenames and sequence padding are safe and deterministic for a supplied date.
3. Project snapshots round-trip without live references; unknown keys are ignored; invalid identity/version/timeline is rejected; failed restore rolls back.
4. PNG, MP4, and SVG metadata stamp/extract round-trip; malformed/truncated candidates are skipped; PNG replacement does not duplicate metadata; size limits and CRC32 are correct.
5. ZIP bytes are valid and deterministic; directory and ZIP sequence sinks name/write every frame; SVG output covers every drawing primitive used by the project.

Also add an integration test proving that a forced export failure still clears the `exporting` guard and progress, unlocks input/panel, disposes/cancels resources, restores preview rendering, and resumes only the previously running p5 loop.

Run the project's complete test and build commands. Report the files changed, the exact formats now supported, what was verified, and any genuine browser/codec limitation that remains.
