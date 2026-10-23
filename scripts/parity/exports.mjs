#!/usr/bin/env node
// Export check from SKILL.md: downloads PNG, MP4, and WebM through the demo's normal UI and inspects the files.
// Serves the repository with Vite (both demos) or with a plain static server (`--static`, vanilla demo only, as a
// project without a build step would), and uses installed Google Chrome, whose WebCodecs can encode H.264.
// Usage: node scripts/parity/exports.mjs [--static]
// Files go to scripts/parity/out/exports/<server>/; needs ffprobe on PATH.

import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";
import { pixelDiff } from "./compare.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const useStatic = process.argv.includes("--static");
const out = join(here, "out", "exports", useStatic ? "static" : "vite");
mkdirSync(out, { recursive: true });

let base, stop;
if (useStatic) {
  const port = 8765;
  const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: root, stdio: "ignore" });
  await new Promise((done) => setTimeout(done, 800));
  base = `http://127.0.0.1:${port}/`;
  stop = () => server.kill();
} else {
  const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 5191, strictPort: false } });
  await server.listen();
  base = server.resolvedUrls.local[0];
  stop = () => server.close();
}

const demos = useStatic ? { vanilla: "vanilla/examples/demo/" } : { vue: "examples/demo/", vanilla: "vanilla/examples/demo/" };
const browser = await chromium.launch({ channel: "chrome" });
const results = {};
let failures = 0;
const probe = (file) =>
  JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,nb_frames,duration,pix_fmt", "-show_entries", "format=duration", "-of", "json", file], { encoding: "utf8" }));
const pngSize = (file) => {
  const bytes = readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

try {
  for (const [impl, path] of Object.entries(demos)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    context.setDefaultTimeout(60000);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && !/status of 404/.test(message.text()) && errors.push(message.text()));
    // Missing files are reported by URL; a missing favicon is the browser's own request, not the page's.
    page.on("response", (response) => response.status() >= 400 && !response.url().endsWith("/favicon.ico") && errors.push(`${response.status()} ${response.url()}`));
    await page.goto(`${base}${path}`);
    await page.waitForSelector(".workspace .timeline");
    // Same settings on every demo: 512 px long edge, 24 fps, playhead at 1.5 s.
    const longEdge = page.locator(".stack .number-field", { hasText: "Long edge" }).locator(".value-control input");
    await longEdge.fill("512");
    await longEdge.press("Enter");
    const fps = page.locator(".stack .number-field", { hasText: "Frame rate" }).locator(".value-control input");
    await fps.fill("24");
    await fps.press("Enter");
    await page.locator(".step:nth-of-type(1)").click();
    await page.locator(".ruler input").fill("1.5");
    results[impl] = {};
    for (const format of ["png", "mp4", "webm"]) {
      await page.locator(`.segmented label:has(input[value='${format}'])`).click();
      const downloading = page.waitForEvent("download");
      await page.locator(".export-actions .primary").click();
      const download = await downloading;
      const file = join(out, `${impl}.${format}`);
      await download.saveAs(file);
      await page.waitForFunction(() => /^Saved /.test(document.querySelector(".workspace .status")?.textContent ?? ""));
      const status = await page.locator(".workspace .status").textContent();
      const info = format === "png" ? pngSize(file) : probe(file);
      results[impl][format] = { file: download.suggestedFilename(), status, info };
      console.log(`${impl} ${format}: ${status} · ${JSON.stringify(info)}`);
    }
    // The preview at the same time, for comparing against the PNG export.
    await page.locator(".segmented label:has(input[value='png'])").click();
    if (errors.length) {
      failures++;
      console.log(`FAIL ${impl} console errors: ${errors.join(" | ")}`);
    }
    await context.close();
  }
  const checks = [];
  for (const [impl, formats] of Object.entries(results)) {
    checks.push([`${impl} PNG is 512 x 288`, formats.png.info.width === 512 && formats.png.info.height === 288]);
    for (const format of ["mp4", "webm"]) {
      const stream = formats[format].info.streams[0];
      const duration = Number(formats[format].info.format.duration);
      checks.push([`${impl} ${format.toUpperCase()} is 512 x 288 ${stream.codec_name}`, stream.width === 512 && stream.height === 288]);
      checks.push([`${impl} ${format.toUpperCase()} lasts the 4 s timeline (${duration.toFixed(3)} s)`, Math.abs(duration - 4) < 0.1]);
    }
    checks.push([`${impl} MP4 is H.264`, formats.mp4.info.streams[0].codec_name === "h264"]);
    checks.push([`${impl} WebM is VP9 or VP8`, ["vp9", "vp8"].includes(formats.webm.info.streams[0].codec_name)]);
  }
  if (results.vue && results.vanilla) {
    const page = await browser.newPage();
    const diff = await pixelDiff(page, readFileSync(join(out, "vue.png")), readFileSync(join(out, "vanilla.png")));
    checks.push([`vanilla PNG matches the Vue PNG (${diff.count} of ${diff.total} pixels differ)`, diff.sameSize && diff.count === 0]);
  }
  for (const [label, ok] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? "pass" : "FAIL"} ${label}`);
  }
} finally {
  await browser.close();
  await stop();
}
process.exit(failures ? 1 : 0);
