// Opens a page, prints console errors, and saves a full-page screenshot.
import { createServer } from "vite";
import { chromium } from "playwright";
const [path, out, width = 1280, height = 900] = process.argv.slice(2);
const server = await createServer({ root: process.cwd(), logLevel: "error", server: { host: "127.0.0.1", port: 5195 } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
page.on("console", (m) => m.type() !== "debug" && !m.text().includes("[vite]") && console.log(m.type(), m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(`${server.resolvedUrls.local[0]}${path}`);
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });
await browser.close(); await server.close();
