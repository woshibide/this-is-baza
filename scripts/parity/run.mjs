#!/usr/bin/env node
// Parity runner: plays the same scenario on a Vue fixture and a vanilla fixture and compares, after every step,
// the normalized DOM, focus, emitted model values and events, and the <html> scrubbing state.
// Steps with `shot` also take screenshots in both themes and compare pixels.
// Usage: node scripts/parity/run.mjs [case-name-prefix ...] [--headed]
// Logs, screenshots, and diffs go to scripts/parity/out/ (gitignored).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";
import { cases } from "./cases.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const out = join(here, "out");
const args = process.argv.slice(2);
const filters = args.filter((arg) => !arg.startsWith("--"));
const selected = Object.keys(cases).filter((name) => !filters.length || filters.some((f) => name.startsWith(f)));
if (!selected.length) {
  console.error(`No cases match ${filters.join(", ")}. Known: ${Object.keys(cases).join(", ")}`);
  process.exit(2);
}

// Pixels count as different when any channel differs by more than 10%; a case passes up to 0.05% such pixels.
const PIXEL_THRESHOLD = 0.1;
const MAX_DIFF_RATIO = 0.0005;

// Runs in the page. Ids from Vue's useId (v-0) and the port's uid (baza-0) become #1, #2 by first appearance;
// classes starting with "baza-" are the port's scoping hooks (except baza-theme) and are ignored.
function snapshot() {
  const root = document.getElementById("root");
  const ids = new Map();
  const canon = (value) =>
    value.replace(/\b(?:v|baza)-\d+(?:-\d+)*/g, (id) => {
      if (!ids.has(id)) ids.set(id, `#${ids.size + 1}`);
      return ids.get(id);
    });
  const lines = [];
  function walk(node, depth) {
    const pad = "  ".repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, " ");
      if (text === " ") lines.push(`${pad}#whitespace`);
      else if (text) lines.push(`${pad}"${text}"`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const attrs = [];
    for (const { name, value } of node.attributes) {
      if (name.startsWith("data-v-")) continue;
      if (name === "class") {
        const classes = value.split(/\s+/).filter((c) => c && (!c.startsWith("baza-") || c === "baza-theme")).sort();
        if (classes.length) attrs.push(`class="${classes.join(" ")}"`);
      } else if (name === "style") {
        const parts = value.split(";").map((p) => p.trim().replace(/\s*:\s*/, ": ")).filter(Boolean).sort();
        if (parts.length) attrs.push(`style="${parts.join("; ")}"`);
      } else attrs.push(`${name}="${canon(value)}"`);
    }
    if (["INPUT", "SELECT", "TEXTAREA"].includes(node.tagName)) {
      attrs.push(`:value="${node.value}"`);
      if (node.type === "checkbox" || node.type === "radio") attrs.push(`:checked=${node.checked}`);
    }
    if (node.tagName === "DETAILS") attrs.push(`:open=${node.open}`);
    attrs.sort();
    lines.push(`${pad}<${node.tagName.toLowerCase()}${attrs.length ? " " + attrs.join(" ") : ""}>`);
    for (const child of node.childNodes) walk(child, depth + 1);
  }
  for (const child of root.childNodes) walk(child, 0);
  let focus = "outside";
  const active = document.activeElement;
  if (active && root.contains(active)) {
    const path = [];
    for (let n = active; n !== root; n = n.parentElement) path.unshift([...n.parentElement.children].indexOf(n));
    focus = `${active.tagName.toLowerCase()}@${path.join(".")}`;
  } else if (active && active !== document.body) focus = `outside:${active.tagName.toLowerCase()}`;
  const html = [...document.documentElement.attributes]
    .filter((a) => a.name.startsWith("data-number"))
    .map((a) => `${a.name}=${a.value}`)
    .join(" ");
  return {
    dom: lines.join("\n"),
    focus,
    html,
    log: window.__parity.take(),
    models: window.__parity.models(),
  };
}

const frames = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

async function perform(page, step) {
  const at = (selector) => page.locator(`#root ${selector}`).first();
  if (step.click) await at(step.click).click({ modifiers: step.modifiers });
  else if (step.dblclick) await at(step.dblclick).dblclick();
  else if (step.focus) await at(step.focus).focus();
  else if (step.hover) await at(step.hover).hover();
  else if (step.fill) await at(step.fill).fill(step.text);
  else if (step.select) await at(step.select).selectOption(step.value);
  else if (step.type) await page.keyboard.type(step.type);
  else if (step.press) await page.keyboard.press(step.press);
  else if (step.drag) {
    // Pointer drag from the element's center (or `from` offset), moving by `by` in `steps` moves.
    const box = await at(step.drag).boundingBox();
    const [fx, fy] = step.from ?? [box.width / 2, box.height / 2];
    const x = box.x + fx, y = box.y + fy;
    await page.mouse.move(x, y);
    for (const key of step.modifiers ?? []) await page.keyboard.down(key);
    await page.mouse.down();
    const moves = step.steps ?? 8;
    for (let i = 1; i <= moves; i++) await page.mouse.move(x + (step.by[0] * i) / moves, y + (step.by[1] * i) / moves);
    if (step.escape) await page.keyboard.press("Escape");
    if (!step.hold) await page.mouse.up();
    for (const key of step.modifiers ?? []) await page.keyboard.up(key);
  } else if (step.mouseUp) await page.mouse.up();
  else if (step.eval) await page.evaluate(step.eval);
  else if (step.wait) await page.waitForTimeout(step.wait);
  else if (!step.shot) throw new Error(`Unknown step ${JSON.stringify(step)}`);
}

async function play(context, url, scenario) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(url);
  await page.waitForSelector("html[data-ready]", { state: "attached", timeout: 10000 });
  await frames(page);
  const records = [{ step: "initial", ...(await page.evaluate(snapshot)) }];
  const shots = [];
  for (const step of scenario) {
    await perform(page, step);
    await frames(page);
    records.push({ step, ...(await page.evaluate(snapshot)) });
    if (step.shot) shots.push({ name: step.shot, png: await page.locator("#stage").screenshot({ animations: "disabled", caret: "hide" }) });
  }
  await page.close();
  return { records, shots, errors };
}

async function pixelDiff(page, a, b) {
  return page.evaluate(async ([a, b, threshold]) => {
    const load = async (base64) => createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const width = Math.max(ia.width, ib.width), height = Math.max(ia.height, ib.height);
    const read = (image) => {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, width, height).data;
    };
    const da = read(ia), db = read(ib);
    const diff = new OffscreenCanvas(width, height);
    const dctx = diff.getContext("2d");
    const out = dctx.createImageData(width, height);
    let count = 0;
    for (let i = 0; i < da.length; i += 4) {
      const delta = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(da[i + c] - db[i + c]))) / 255;
      const bad = delta > threshold;
      if (bad) count++;
      out.data.set(bad ? [255, 0, 0, 255] : [da[i], da[i + 1], da[i + 2], 40], i);
    }
    dctx.putImageData(out, 0, 0);
    const blob = await diff.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { sameSize: ia.width === ib.width && ia.height === ib.height, size: [ia.width, ia.height, ib.width, ib.height], count, total: width * height, diff: btoa(binary) };
  }, [a.toString("base64"), b.toString("base64"), PIXEL_THRESHOLD]);
}

function firstDifference(a, b) {
  const la = a.split("\n"), lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++)
    if (la[i] !== lb[i]) return `line ${i + 1}\n    vue:     ${la[i] ?? "(end)"}\n    vanilla: ${lb[i] ?? "(end)"}`;
  return null;
}

const describe = (step) => (typeof step === "string" ? step : JSON.stringify(step, (k, v) => (typeof v === "function" ? String(v) : v)));

const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: !args.includes("--headed") });
mkdirSync(out, { recursive: true });
let failed = 0;
try {
  for (const name of selected) {
    const fixture = cases[name];
    const themes = fixture.themes ?? ["light", "dark"];
    const problems = [];
    try {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const query = `case=${encodeURIComponent(name)}&theme=${theme}`;
      const vue = await play(context, `${base}scripts/parity/fixture-vue.html?${query}`, fixture.steps ?? []);
      const vanilla = await play(context, `${base}scripts/parity/fixture-vanilla.html?${query}`, fixture.steps ?? []);
      writeFileSync(join(out, `${name}.${theme}.json`), JSON.stringify({ vue: vue.records, vanilla: vanilla.records }, null, 2));
      for (const [impl, run] of [["vue", vue], ["vanilla", vanilla]])
        for (const error of run.errors) problems.push(`${theme}: ${impl} console error: ${error}`);
      // Behavior is theme-independent; compare it once, on the first theme.
      if (theme === themes[0]) {
        vue.records.forEach((v, i) => {
          const w = vanilla.records[i];
          const label = `step ${i} ${describe(v.step)}`;
          const dom = firstDifference(v.dom, w.dom);
          if (dom) problems.push(`${label}: DOM differs at ${dom}`);
          if (v.focus !== w.focus) problems.push(`${label}: focus vue=${v.focus} vanilla=${w.focus}`);
          if (v.html !== w.html) problems.push(`${label}: <html> vue="${v.html}" vanilla="${w.html}"`);
          if (JSON.stringify(v.log) !== JSON.stringify(w.log)) problems.push(`${label}: log\n    vue:     ${JSON.stringify(v.log)}\n    vanilla: ${JSON.stringify(w.log)}`);
          if (JSON.stringify(v.models) !== JSON.stringify(w.models)) problems.push(`${label}: models\n    vue:     ${JSON.stringify(v.models)}\n    vanilla: ${JSON.stringify(w.models)}`);
        });
      }
      const diffPage = await context.newPage();
      for (const [i, shot] of vue.shots.entries()) {
        const other = vanilla.shots[i];
        const file = `${name}.${theme}.${shot.name}`;
        writeFileSync(join(out, `${file}.vue.png`), shot.png);
        writeFileSync(join(out, `${file}.vanilla.png`), other.png);
        const result = await pixelDiff(diffPage, shot.png, other.png);
        if (!result.sameSize) problems.push(`${theme} shot ${shot.name}: size differs ${result.size.join("x")}`);
        if (result.count / result.total > MAX_DIFF_RATIO) {
          writeFileSync(join(out, `${file}.diff.png`), Buffer.from(result.diff, "base64"));
          problems.push(`${theme} shot ${shot.name}: ${result.count} of ${result.total} pixels differ (${file}.diff.png)`);
        }
      }
      await context.close();
    }
    } catch (error) {
      problems.push(`runner error: ${error.message.split("\n")[0]}`);
    }
    if (problems.length) {
      failed++;
      console.log(`FAIL ${name}\n  ${problems.join("\n  ")}`);
    } else console.log(`pass ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`${selected.length - failed}/${selected.length} cases pass`);
process.exit(failed ? 1 : 0);
