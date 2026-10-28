import { createServer } from "vite";
import { chromium } from "playwright";
const server = await createServer({ root: process.cwd(), logLevel: "error", server: { host: "127.0.0.1", port: 5198 } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("error:", e.message));
await page.goto(`${server.resolvedUrls.local[0]}scripts/parity/fixture-vanilla.html?case=${process.argv[2]}`);
await page.waitForSelector("html[data-ready]", { state: "attached" });
await page.evaluate(() => {
  for (const type of ["focusin", "focusout"]) document.addEventListener(type, (e) => console.log(type, e.target.tagName, e.target.getAttribute("aria-label"), e.relatedTarget?.tagName));
  new MutationObserver((list) => list.forEach((m) => m.type === "childList" && console.log("mutation", m.target.className, m.addedNodes.length, m.removedNodes.length))).observe(document.getElementById("root"), { childList: true, subtree: true });
});
await page.locator("#root button[aria-label^=Decrease]").click();
console.log(await page.evaluate(() => document.activeElement.outerHTML.slice(0, 120)));
await browser.close();
await server.close();
