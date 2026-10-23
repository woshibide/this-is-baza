#!/usr/bin/env node
// Gallery parity: opens the Vue gallery (/examples/) and the vanilla gallery (/vanilla/examples/) with fresh storage,
// then compares every example's normalized markup and its screenshot in both themes.
// Usage: node scripts/parity/gallery.mjs
// Screenshots and diffs go to scripts/parity/out/gallery/.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright";
import { normalize, pixelDiff, MAX_DIFF_RATIO } from "./compare.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out", process.argv.includes("--dist") ? "dist" : "dev", "gallery");
mkdirSync(out, { recursive: true });

// --dist compares the production build in dist/ (run npm run build first), served as plain files.
const dist = process.argv.includes("--dist");
let base, stopServer;
if (dist) {
  const files = spawn("python3", ["-m", "http.server", "8194", "--bind", "127.0.0.1"], { cwd: resolve(here, "../../dist"), stdio: "ignore" });
  await new Promise((done) => setTimeout(done, 800));
  base = "http://127.0.0.1:8194/";
  stopServer = () => files.kill();
} else {
  const server = await createServer({ root: resolve(here, "../.."), logLevel: "error", server: { host: "127.0.0.1", port: 5194, strictPort: false } });
  await server.listen();
  base = server.resolvedUrls.local[0];
  stopServer = () => server.close();
}
const browser = await chromium.launch();
let failures = 0;

async function open(context, path, theme) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${base}${path}`);
  await page.waitForSelector(".reference-examples .example section", { timeout: 10000 });
  await page.selectOption(".theme-choice select", theme);
  // The Vue page layout adds copy-link buttons to headings; that page chrome is not part of the port.
  await page.evaluate(() => document.querySelectorAll(".reference-examples .heading-link").forEach((node) => node.remove()));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  return { page, errors };
}

try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const vue = await open(context, "examples/", theme);
    const vanilla = await open(context, "vanilla/examples/", theme);
    for (const [impl, run] of [["vue", vue], ["vanilla", vanilla]])
      for (const error of run.errors) {
        failures++;
        console.log(`FAIL ${theme} ${impl} console error: ${error}`);
      }
    const ids = await vue.page.$$eval(".reference-examples .example", (nodes) => nodes.map((node) => node.id || node.parentElement.id));
    const diffPage = await context.newPage();
    for (const [i, id] of ids.entries()) {
      const pick = (page) => page.locator(".reference-examples .example").nth(i);
      // Markup of the control itself, after the intro paragraph.
      const markup = (page) => pick(page).evaluate((node, source) => {
        const normalize = new Function(`return ${source}`)();
        return normalize([...node.children].filter((child) => !child.matches(".example-intro")));
      }, normalize.toString());
      if (theme === "light") {
        const [a, b] = [await markup(vue.page), await markup(vanilla.page)];
        if (a !== b) {
          failures++;
          const la = a.split("\n"), lb = b.split("\n");
          const line = la.findIndex((l, k) => l !== lb[k]);
          console.log(`FAIL ${id}: markup differs at line ${line + 1}\n    vue:     ${la[line]}\n    vanilla: ${lb[line]}`);
        }
      }
      const shots = [];
      for (const run of [vue, vanilla]) {
        await pick(run.page).scrollIntoViewIfNeeded();
        shots.push(await pick(run.page).screenshot({ animations: "disabled", caret: "hide" }));
      }
      writeFileSync(join(out, `${id}.${theme}.vue.png`), shots[0]);
      writeFileSync(join(out, `${id}.${theme}.vanilla.png`), shots[1]);
      const result = await pixelDiff(diffPage, shots[0], shots[1]);
      if (!result.sameSize || result.count / result.total > MAX_DIFF_RATIO) {
        failures++;
        writeFileSync(join(out, `${id}.${theme}.diff.png`), Buffer.from(result.diff, "base64"));
        console.log(`FAIL ${id} ${theme}: ${result.sameSize ? "" : `size ${result.size.join("x")}, `}${result.count} of ${result.total} pixels differ`);
      } else console.log(`pass ${id} ${theme}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await stopServer();
}
process.exit(failures ? 1 : 0);
