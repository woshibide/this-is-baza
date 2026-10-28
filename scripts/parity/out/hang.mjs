// Loads one case's fixture page and reports whether it finishes initializing within 5 s.
import { createServer } from "vite";
import { chromium } from "playwright";
const [name, impl] = process.argv.slice(2);
const server = await createServer({ root: process.cwd(), logLevel: "error", server: { host: "127.0.0.1", port: 5196 } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("console:", m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("error:", e.message));
const timer = setTimeout(async () => { console.log("HANG", impl); process.exit(3); }, 8000);
await page.goto(`${server.resolvedUrls.local[0]}scripts/parity/fixture-${impl}.html?case=${name}`);
await page.waitForSelector("html[data-ready]", { state: "attached", timeout: 5000 }).then(() => console.log("ready", impl), (e) => console.log("not ready", e.message.split("\n")[0]));
clearTimeout(timer);
await browser.close(); await server.close();
