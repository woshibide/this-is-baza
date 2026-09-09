# Browser export implementation

Read this reference for every `$baza` export implementation.
The required formats and scope are defined in [SKILL.md](../SKILL.md#adapt-exports).

## Export panel

Place the export controls in the normal workspace UI and connect every format to its real implementation.
Use one normalized, project-scoped settings object for the panel, persistence, and exporter.

| Control | Behavior |
| --- | --- |
| Format | MP4, WebM, PNG; label the action `Export MP4`, `Export WebM`, or `Export PNG`. |
| Aspect and size | Match the preview contract; display the actual output width × height after normalization. |
| FPS | Numeric input for video, including fractional rates such as 29.97; default to 30. |
| Duration in seconds | Numeric input for video; use one known animation cycle or a 10-second default for continuous motion. |
| Transparent background | Available for PNG; use the project background for opaque video. |
| Export status | Accessible progress/status with completed and total frames, success, cancellation, and actionable errors. |
| Cancel | Visible and enabled while video is rendering or finalizing. |

Use direct numeric inputs without a separate preset system.
Simple aspect-ratio or resolution choices are sufficient where the workspace already uses them.
Show FPS and duration only for video.
Persist validated export settings and restore the corresponding controls after refresh.
Preserve a sensible existing output size; otherwise default to a 1920-pixel long edge at the composition's aspect ratio.
Validate at both the UI and exporter boundary: finite positive duration, finite FPS from 1 to 120, and integer dimensions within the renderer's supported limits.
Use an explicit duration limit, with 120 seconds as a reasonable default for in-memory video.
Normalize video dimensions to positive even integers before displaying, probing, and encoding them.
Reject invalid input visibly; never report success for an empty or failed download.

## Rendering contract

First inspect the render lifecycle, camera/framing, random sources, simulation state, pause state, and current export behavior.
Keep the renderer already used by the project and share its drawing code between preview and export.
Reuse existing snapshot/clone and render-at-time methods before introducing new modules.
Separate settings, rendering, encoding, and UI orchestration only where the project benefits from those boundaries.

At export start, capture the current composition, camera, settings, seed, complete simulation state, and preview time.
Freeze that snapshot for the whole export and prevent concurrent exports or conflicting edits.
Create an independent export session or scene from it; video must not advance or resize the live preview.
Initialize the export session to the currently displayed state, including interpolation state when applicable.
Render at the requested pixel dimensions using the same composition framing as the preview, with pixel ratio 1.
Exclude selection guides, editor overlays, and the preview checkerboard from every format.
For WebGL, retain the existing renderer and render to a dedicated canvas or target; do not rewrite the scene in Canvas2D.
Dispose cloned GPU, simulation, and canvas resources when finished.

PNG captures the current preview state at the requested output size, with zero alpha where transparency is enabled.
If PNG temporarily resizes the live renderer, restore its size, pixel ratio, overlays, and camera in `finally` before allowing interaction again.
Encode using `canvas.toBlob(callback, "image/png")` or the renderer's equivalent, and reject a null Blob.

## Deterministic video

Render offline from the snapshot using output time rather than recording the visible canvas.
Use the project's fixed simulation step (typically `1 / 60`) and its interpolation or analytic time evaluation to sample every output time accurately.
Keep wall-clock time, unseeded randomness, and encoder speed out of the exported simulation.
A continuous simulation uses the selected duration; it does not need a finite loop to support video.
A static composition can render the same state for that duration.

For a finite, positive duration and FPS, derive the frames as follows:

```js
const frameTotal = duration * fps;
const roundoff = Number.EPSILON * Math.max(1, frameTotal);
const frameCount = Math.max(1, Math.ceil(frameTotal - roundoff));
for (let i = 0; i < frameCount; i++) {
  const time = i / fps;
  const frameDuration = Math.min(1 / fps, duration - time);
  // Render the snapshot at startTime + time, then encode at time.
}
```

Generate frames with indices `0` through `frameCount - 1`; never draw a duplicate endpoint at `time === duration`.
The roundoff guard prevents an exact frame boundary from creating an extra zero-duration frame due to floating-point multiplication.
Use zero-based media timestamps even when the snapshot starts later in the project timeline.
Clip the last frame's duration so fractional FPS and durations preserve the requested total length.
For seamless loops, use a cycle duration containing a whole number of output frames, and keep the preview/export timing convention consistent.
Await each encoder submission to apply backpressure and yield regularly so progress and Cancel remain responsive.

## Encoding and downloads

Reuse an existing reliable offline encoder or lazily load a WebCodecs muxer such as Mediabunny through the project's dependency system.
Keep the encoder out of initial preview startup and verify its APIs against the version actually installed.
Do not use `MediaRecorder`, `captureStream()`, or real-time screen recording for the deterministic path.

- MP4: encode H.264/AVC (`avc`) in an MP4 container with in-memory fast start for broad player compatibility.
- WebM: encode VP9, or probe VP8 as a fallback, in a WebM container.
- Probe the chosen codec at the actual output dimensions and encoding settings before allocating the export scene.
- Use an output-resolution-appropriate bitrate, explicit FPS, timestamps, frame durations, and a keyframe interval of one or two seconds.
- Keep baseline video opaque; preserve or add WebM alpha only when already supported or explicitly requested, with alpha-specific capability and decode checks.

A Mediabunny implementation can use `canEncodeVideo`, `Output`, `BufferTarget`, `CanvasSource`, `Mp4OutputFormat`, and `WebMOutputFormat`.
Start the output, submit each rendered canvas frame with its timestamp and duration, finalize, and verify that a nonempty buffer exists.
Return the actual container MIME type (`video/mp4` or `video/webm`) and use the matching filename extension.
Never substitute WebM bytes behind an MP4 filename or silently switch the selected format.
If H.264 is unavailable, show a concrete browser/size error and let the user explicitly choose WebM or another tested size.
Keep the MP4 option discoverable with its support explanation.

Download via a temporary object URL and download link; revoke the URL after the browser has received it.
Use safe filenames containing project/sketch, dimensions, and a timestamp, with FPS for video.

## Cancellation and recovery

Use one export guard and an `AbortController` or equivalent per operation.
Disable conflicting controls and canvas input while keeping Cancel available.
Freeze preview animation during the export and remember whether it was playing or paused.
Report rendering and finalization separately; success means a finalized file was handed to the download path.

Check cancellation between expensive stages and frames, including after finalization and before download.
Use `try/finally` to cancel unfinished encoding, dispose the export session, release locks, clear progress, restore the preview, and resume only if previously playing.
Cleanup must tolerate an encoder that already canceled itself after an error.
Reset the live animation clock when resuming so export time does not become one giant simulation step.
Prevent page unload while an export is active.

## Acceptance checks

Exercise the normal UI before changing an existing exporter, recording which format choices and downloads actually work.
After implementation, use a browser with the required encoders and test through the visible controls and Export button.
A source-code signal, mocked encoder, or nonempty Blob alone does not prove working video export.

1. Start with fresh project storage and verify the default action is Export MP4, then check that PNG and WebM are selectable.
2. Download a small PNG and short MP4 and WebM from the UI, saving the actual files as test artifacts.
3. Decode the PNG and videos; inspect dimensions, container, video codec, FPS, and duration using a media probe or decoder.
   Confirm MP4 contains H.264 and that video duration is within one frame of the requested duration.
4. Seek and decode first and later video frames; compare framing and the first frame with the frozen preview, and verify visible motion for an animated scene.
   Check that no format contains editor overlays or the checkerboard.
5. Smoke-test MP4 at the default output size as well as the small test size; encoder support can depend on resolution.
6. Cancel an export and force an encoder failure, then export successfully again.
   Verify that controls, preview size/state, and the original playing or paused state recover in both cases.
7. Change format, aspect/size, FPS, and duration, then refresh and verify persistence and contextual controls.

Add focused tests for frame timing (including fractional FPS and a partial last frame), settings validation, snapshot isolation, and failure cleanup where those behaviors are newly implemented.
Run the target project's build and required tests.
If the automation browser lacks H.264, test in an available supported browser and identify that browser in the evidence.
If no available browser can exercise MP4, report it as unverified with the observed capability error; keep the implementation and UI path intact.
