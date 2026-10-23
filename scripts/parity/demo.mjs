#!/usr/bin/env node
// Workspace demo parity: replays the same steps on the Vue demo (/examples/demo/) and the vanilla demo
// (/vanilla/examples/demo/), each with fresh storage, and compares the workspace markup and a full-window
// screenshot (including the rendered canvas) after every step.
// Usage: node scripts/parity/demo.mjs
// Screenshots and diffs go to scripts/parity/out/demo/.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright";
import { normalize, pixelDiff, MAX_DIFF_RATIO } from "./compare.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out", process.argv.includes("--dist") ? "dist" : "dev", "demo");
mkdirSync(out, { recursive: true });

// Each step acts on both pages; selectors are relative to the workspace.
const STEPS = [
  { name: "initial" },
  { name: "aspect-square", act: (page) => page.locator(".segmented label:has(input[value='1:1'])").click() },
  { name: "aspect-portrait", act: (page) => page.locator(".segmented label:has(input[value='9:16'])").click() },
  { name: "scrub", act: (page) => page.locator(".step:nth-of-type(1)").click().then(() => page.locator(".ruler input").fill("1.5")) },
  { name: "letter-size", act: (page) => page.locator(".stack .number-field").first().locator(".value-control input").fill("40") },
  { name: "dark", act: (page) => page.locator(".segmented label:has(input[value='dark'])").click() },
  { name: "png", act: (page) => page.locator(".segmented label:has(input[value='png'])").click() },
  { name: "transparent", act: (page) => page.locator("input[name='transparent']").check() },
  { name: "webm", act: (page) => page.locator(".segmented label:has(input[value='webm'])").click() },
  { name: "open-step", act: (page) => page.locator(".step:nth-of-type(2)").dblclick() },
  { name: "select-lane", act: (page) => page.locator(".lane-label").first().click() },
  { name: "panel-closed", act: (page) => page.locator("[aria-label='Hide controls']").click() },
  { name: "inspector-closed", act: (page) => page.locator("[aria-label='Hide inspector']").click() },
  { name: "panels-reopened", act: (page) => page.locator("[aria-label='Show controls']").click().then(() => page.locator("[aria-label='Show inspector']").click()) },
  { name: "all-steps", act: (page) => page.locator(".back").click() },
  { name: "reload", act: (page) => page.reload().then(() => page.waitForSelector(".workspace .timeline")) },
];

// --dist compares the production build in dist/ (run npm run build first), served as plain files.
const dist = process.argv.includes("--dist");
let base, stopServer;
if (dist) {
  const files = spawn("python3", ["-m", "http.server", "8193", "--bind", "127.0.0.1"], { cwd: resolve(here, "../../dist"), stdio: "ignore" });
  await new Promise((done) => setTimeout(done, 800));
  base = "http://127.0.0.1:8193/";
  stopServer = () => files.kill();
} else {
  const server = await createServer({ root: resolve(here, "../.."), logLevel: "error", server: { host: "127.0.0.1", port: 5193, strictPort: false } });
  await server.listen();
  base = server.resolvedUrls.local[0];
  stopServer = () => server.close();
}
const browser = await chromium.launch();
let failures = 0;
const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 50)))));
const markup = (page) => page.evaluate((source) => new Function(`return ${source}`)()([document.querySelector(".workspace")]), normalize.toString());

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  context.setDefaultTimeout(5000);
  const pages = [];
  for (const path of ["examples/demo/", "vanilla/examples/demo/"]) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    await page.goto(`${base}${path}`);
    await page.waitForSelector(".workspace .timeline");
    pages.push({ page, errors });
  }
  const diffPage = await context.newPage();
  // Step recordings in the parity runner's format, for the Jev review (scripts/jev/parity.mjs Demo).
  const recordings = { vue: [], vanilla: [] };
  const saved = (page, key) => page.evaluate((name) => JSON.parse(localStorage.getItem(name) ?? "null")?.values ?? null, key);
  for (const step of STEPS) {
    const shots = [];
    const marks = [];
    for (const [i, { page }] of pages.entries()) {
      if (step.act) await step.act(page);
      await page.mouse.move(640, 899);
      await settle(page);
      marks.push(await markup(page));
      shots.push(await page.screenshot({ animations: "disabled", caret: "hide" }));
      const impl = i ? "vanilla" : "vue";
      recordings[impl].push({
        step: step.name,
        dom: marks.at(-1),
        focus: await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName.toLowerCase()),
        html: "",
        log: [],
        models: { demo: await saved(page, i ? "baza:vanilla:demo:v1" : "baza:demo:v1"), appearance: await saved(page, i ? "baza:vanilla:ui-appearance:v1" : "baza:ui-appearance:v1") },
      });
    }
    const problems = [];
    if (marks[0] !== marks[1]) {
      const la = marks[0].split("\n"), lb = marks[1].split("\n");
      const line = la.findIndex((l, k) => l !== lb[k]);
      problems.push(`markup differs at line ${line + 1}\n    vue:     ${la[line]}\n    vanilla: ${lb[line]}`);
    }
    writeFileSync(join(out, `${step.name}.vue.png`), shots[0]);
    writeFileSync(join(out, `${step.name}.vanilla.png`), shots[1]);
    const result = await pixelDiff(diffPage, shots[0], shots[1]);
    if (result.count / result.total > MAX_DIFF_RATIO) {
      writeFileSync(join(out, `${step.name}.diff.png`), Buffer.from(result.diff, "base64"));
      problems.push(`${result.count} of ${result.total} pixels differ (${step.name}.diff.png)`);
    }
    for (const [i, { errors }] of pages.entries()) for (const error of errors.splice(0)) problems.push(`${i ? "vanilla" : "vue"} console error: ${error}`);
    if (problems.length) {
      failures++;
      console.log(`FAIL ${step.name}\n  ${problems.join("\n  ")}`);
    } else console.log(`pass ${step.name}`);
  }
  if (!dist) writeFileSync(join(here, "out", "Demo.workspace.light.json"), JSON.stringify(recordings, null, 2));
} finally {
  await browser.close();
  await stopServer();
}
process.exit(failures ? 1 : 0);
