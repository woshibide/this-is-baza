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
import { normalize, pixelDiff, MAX_DIFF_RATIO } from "./compare.mjs";

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


// Runs in the page, with the normalizer from compare.mjs passed in as source.
function snapshot(source) {
  const normalize = new Function(`return ${source}`)();
  const root = document.getElementById("root");
  const dom = normalize([...root.childNodes]);
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
    dom,
    focus,
    html,
    log: window.__parity.take(),
    models: window.__parity.models(),
  };
}

// page.evaluate has no timeout; a page stuck in a loop must fail the step instead of hanging the run.
const limit = (promise, what) =>
  Promise.race([promise, new Promise((_, fail) => setTimeout(() => fail(new Error(`${what} did not finish in 5 s (page busy or frozen)`)), 5000))]);
const frames = (page) => limit(page.evaluate(() => new Promise((done) => {
  const frame = window.__realAnimationFrame ?? requestAnimationFrame;
  setTimeout(() => frame(() => frame(done)), 0);
})), "settling");

async function perform(page, step) {
  const at = (selector) => page.locator(`#root ${selector}`).first();
  if (step.click && step.at) await at(step.click).click({ position: { x: step.at[0], y: step.at[1] } });
  else if (step.click) await at(step.click).click({ modifiers: step.modifiers, force: step.force });
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
  } else if (step.around) {
    // Pointer drag along a circle around the element's center: [radius, fromDegrees, toDegrees, moves]; 0° is up, clockwise.
    const box = await at(step.around).boundingBox();
    const [radius, from, to, moves = 24] = step.circle;
    const point = (deg) => [box.x + box.width / 2 + radius * Math.sin((deg * Math.PI) / 180), box.y + box.height / 2 - radius * Math.cos((deg * Math.PI) / 180)];
    await page.mouse.move(...point(from));
    for (const key of step.modifiers ?? []) await page.keyboard.down(key);
    await page.mouse.down();
    for (let i = 1; i <= moves; i++) await page.mouse.move(...point(from + ((to - from) * i) / moves));
    if (step.escape) await page.keyboard.press("Escape");
    await page.mouse.up();
    for (const key of step.modifiers ?? []) await page.keyboard.up(key);
  } else if (step.mouseUp) await page.mouse.up();
  else if (step.frames) await limit(page.evaluate((durations) => window.__frames(durations), step.frames), "frames");
  else if (step.props) await page.evaluate((partial) => window.__parity.setProps(partial), step.props);
  else if (step.call) await page.evaluate((name) => window.__parity.control[name](), step.call);
  else if (step.eval) await limit(page.evaluate(step.eval), "eval");
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
  const records = [{ step: "initial", ...(await page.evaluate(snapshot, normalize.toString())) }];
  const shots = [];
  for (const step of scenario) {
    try {
      await perform(page, step);
    } catch (error) {
      throw new Error(`${url.includes("vue") ? "vue" : "vanilla"} step ${JSON.stringify(step)}: ${error.message}`);
    }
    await frames(page);
    records.push({ step, ...(await limit(page.evaluate(snapshot, normalize.toString()), "snapshot")) });
    // `of` screenshots another element, such as a popover in the top layer.
    if (step.shot) {
      const target = page.locator(step.of ? `#root ${step.of}` : "#stage").first();
      const png = await target.screenshot({ animations: "disabled", caret: "hide", timeout: 5000 }).catch((error) => {
        throw new Error(`${url.includes("vue") ? "vue" : "vanilla"} shot ${step.shot}: ${error.message.split("\n")[0]}`);
      });
      shots.push({ name: step.shot, png });
    }
  }
  await page.close();
  return { records, shots, errors };
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
const known = [];
try {
  for (const name of selected) {
    const fixture = cases[name];
    const themes = fixture.themes ?? ["light", "dark"];
    const problems = [];
    try {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      // A step that cannot act within 5 s is a broken step, not a slow page.
      context.setDefaultTimeout(5000);
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
          // `mutates` names models the Vue component edits in place instead of emitting; the port emits them.
          const emitted = (log) => log.filter((entry) => !(entry.type === "model" && fixture.mutates?.includes(entry.name)));
          if (JSON.stringify(emitted(v.log)) !== JSON.stringify(emitted(w.log))) problems.push(`${label}: log\n    vue:     ${JSON.stringify(v.log)}\n    vanilla: ${JSON.stringify(w.log)}`);
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
    // A case with `known` documents an accepted difference: it must still differ, and is reported, not failed.
    if (fixture.known) {
      if (problems.length) {
        known.push(name);
        console.log(`known ${name}: ${fixture.known}\n  ${problems.slice(0, 3).join("\n  ")}`);
      } else {
        failed++;
        console.log(`FAIL ${name}: marked known but no longer differs; remove "known".`);
      }
    } else if (problems.length) {
      failed++;
      console.log(`FAIL ${name}\n  ${problems.join("\n  ")}`);
    } else console.log(`pass ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`${selected.length - failed - known.length}/${selected.length} cases pass${known.length ? `, ${known.length} known difference(s)` : ""}`);
process.exit(failed ? 1 : 0);
