# p5.js and Canvas2D export extensions

Read this reference when preserving or implementing requested SVG, PNG-sequence, embedded-state, or console/batch exports in a p5.js or compatible Canvas2D project.
Implement the required export panel and video paths using [export-system.md](export-system.md) first.
Only implement the extensions needed by the target project; these are not prerequisites for shipping its core export formats.

## Canvas2D adapter

Reuse the existing renderer through a context parameter shared by the preview, offscreen export canvas, and any SVG recording context.
Provide project equivalents of `snapshotProjectState()`, `restoreProjectState(snapshot)`, `update(frame)`, `draw(frame, context)`, and `dispose()` where the extensions need them.
Inject the logical viewport, deterministic random source, context, and host services into independent export sessions.
Keep DOM access and wall-clock time outside rendering and simulation.

A useful frame shape is:

```js
{
  dt,
  compositionDt: dt,
  time,
  frameIndex,
  viewport,
  pointer: { active: false, x: 0, y: 0 },
  exporting: true,
  exportFrameIndex,
  exportFrameCount
}
```

Use the baseline's frame clock, duration, and cleanup rules for every motion sink, including PNG sequences.
For p5.js, record whether the live loop was running, call `p.noLoop()` while exporting, and resume `p.loop()` only when it was previously running.
A continuous simulation remains exportable for the selected duration.

Preserve the preview's logical composition frame and use the same framing for export.
When the project explicitly uses contain-fit content bounds, share that calculation between preview and export:

```js
scale = Math.min(outputWidth / bounds.width, outputHeight / bounds.height);
dx = (outputWidth - bounds.width * scale) / 2 - bounds.x * scale;
dy = (outputHeight - bounds.height * scale) / 2 - bounds.y * scale;
```

Apply the transform inside `context.save()` and `context.restore()`.
Clear with the identity transform before each frame.
Transparent PNG-sequence frames start at zero alpha; opaque frames use the configured project background.

## SVG still

Expose SVG as an additional still format, capturing the current preview state and composition frame.
Use the same drawing path with a Canvas2D-compatible recording context.
Implement the operations actually used by the project: save/restore, transforms, paths, fill/stroke, alpha, line properties, clipping, rectangles, rounded rectangles, arcs/ellipses, and text as applicable.
Serialize a standalone SVG with width, height, viewBox, definitions, clip paths, and recorded elements.
Preserve the configured artwork/background and exclude preview-only guides and checkerboard.
Fail clearly for unsupported operations instead of silently producing incorrect geometry.
Test each drawing primitive the project actually uses and render the SVG to compare its framing with the preview.

## PNG sequence

Expose PNG sequence as an additional motion format using the baseline's snapshot and deterministic frame loop.
Name frames with one timestamped prefix and zero-based numbering padded to at least four digits: `PREFIX_0000.png`.
Use the same base name for every frame in a sequence.

If `window.showDirectoryPicker` exists, request the output directory directly from the export button's user gesture, before asynchronous setup consumes that gesture.
Stream each frame through `getFileHandle(..., { create: true })` and `createWritable()`.
Otherwise collect encoded PNG bytes and download one ZIP at the end.
Treat picker cancellation as cancellation and release locks/resources normally.
When cancellation or failure leaves files already written to a directory, identify the partial sequence in the status.

Reuse an existing ZIP utility when available.
If a dependency-free writer is appropriate, use store-only ZIP entries because PNG is already compressed.
Include UTF-8 filenames, CRC32, fixed DOS epoch timestamps, central directory records, and explicit rejection of unsupported ZIP64 sizes/counts.
Validate frame count, names, CRCs, and dimensions by reading the resulting ZIP or directory.

## Embedded project state

Preserve existing restorable metadata, or implement it when requested.
Use an opt-in control shared by the export settings and panel, and keep the payload versioned and project-scoped.
A payload shape is:

```js
{
  app: "<stable-app-id>",
  project: "<stable-project-id>",
  version: 1,
  params: {
    version: 1,
    director: /* complete project snapshot */,
    export: /* known export-state keys only */,
    seed: /* deterministic seed */,
    timeline: { time, frameIndex }
  },
  svg: null
}
```

Use one ASCII magic marker, such as `<APPNAME>PARAMS1`, followed by a fixed 10-digit payload length and UTF-8 JSON.
Limit accepted metadata to 16 MiB and validate lengths before allocating or parsing.

- PNG: insert one uncompressed `iTXt` chunk with a stable keyword immediately before `IEND`, computing its CRC and replacing an existing same-keyword chunk.
  Stamp every sequence frame when embedding is enabled.
- MP4: append a valid top-level `skip` box containing the binary payload.
- SVG: put base64-encoded UTF-8 JSON inside a stable `<metadata id="...">` element to avoid XML escaping changes.
- WebM: leave unstamped unless the project has a proper container-aware metadata implementation; arbitrary trailing EBML bytes are unsuitable.

Use a bounded extractor that scans for the magic marker, validates the declared length and JSON, skips malformed candidates, and checks app/project/version identity.
For SVG, locate and decode its metadata element before applying the same identity and payload validation.

Support dropping the applicable exported files onto the app to restore state.
Capture the current snapshot before applying the imported one.
Validate identity/version, deterministic seed, timeline, and known settings; ignore unknown export-setting keys.
Restore atomically and integrate with the existing undo mechanism when available.
On failure, roll back to the previous snapshot, resync controls, redraw, and show a concise error.

Verify metadata stamp/extract round-trips for each supported format, including PNG replacement, malformed/truncated candidates, size limits, and CRC32.
Verify that imported state has no live references to its source and a failed restoration leaves the current project intact.

## Console and batch extensions

Keep these only when already part of the product or explicitly requested.
Use the same normalized settings and exporter as the panel.
A global command function can accept either strings or tagged templates:

```js
app`status`
app`export --png`
app`export --mp4 --fps 60 --duration 10`
```

Only expose flags for implemented capabilities and resync the visible controls after changes.
For projects supporting multiple compositions, an explicit batch command may select compositions or all compositions without introducing named export presets.
Return a structured per-item result, continue after an individual composition failure, stop on user cancellation, and restore the originally active composition in `finally`.
Validate failure cleanup with the same rigor as the single-export path.
