// Ad hoc probe: replays the first N steps of a case on one implementation and prints state.
import { createServer } from "vite";
import { chromium } from "playwright";
import { cases } from "../cases.js";
const [name, impl, count] = process.argv.slice(2);
const server = await createServer({ root: process.cwd(), logLevel: "error", server: { host: "127.0.0.1", port: 5197 } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => console.log("console:", m.text()));
await page.goto(`${server.resolvedUrls.local[0]}scripts/parity/fixture-${impl}.html?case=${name}`);
await page.waitForSelector("html[data-ready]", { state: "attached" });
const steps = cases[name].steps.slice(0, Number(count));
for (const step of steps) {
  const at = (s) => page.locator(`#root ${s}`).first();
  if (step.click) await at(step.click).click({ timeout: 3000 }).catch((e) => console.log("click failed", e.message.split("\n").slice(0, 8).join("\n")));
  else if (step.focus) await at(step.focus).focus();
  else if (step.press) await page.keyboard.press(step.press);
  else if (step.hover) await at(step.hover).hover();
  console.log(JSON.stringify(step), await page.evaluate(() => [...document.querySelectorAll("[popover]")].map((p) => p.matches(":popover-open")).join(",")), await page.evaluate(() => document.activeElement.className));
}
await browser.close();
await server.close();
