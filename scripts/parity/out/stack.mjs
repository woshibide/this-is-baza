import { createServer } from "vite";
import { chromium } from "playwright";
const server = await createServer({ root: process.cwd(), logLevel: "silent", server: { host: "127.0.0.1", port: 5192 } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${server.resolvedUrls.local[0]}vanilla/examples/demo/`);
await page.waitForSelector(".workspace .timeline");
await page.evaluate(() => {
  Error.stackTraceLimit = 80;
  window.addEventListener("error", (e) => { window.__stack = e.error?.stack; });
});
for (const label of ["Hide controls", "Hide inspector", "Show controls", "Show inspector"]) {
  await page.locator(`[aria-label='${label}']`).click();
  console.log(label, await page.evaluate(() => window.__stack ? "ERROR" : "ok"));
}
await page.waitForTimeout(300);
const stack = await page.evaluate(() => window.__stack);
console.log(stack?.split("\n").map((l) => l.replace(/https?:\/\/[^/]+\//, "")).slice(0, 60).join("\n"));
await browser.close(); await server.close();
