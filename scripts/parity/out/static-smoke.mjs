import { chromium } from "playwright";
const browser = await chromium.launch();
for (const path of ["vanilla/examples/", "vanilla/examples/demo/"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !r.url().endsWith("favicon.ico") && problems.push(`${r.status()} ${r.url()}`));
  await page.goto(`http://127.0.0.1:8767/${path}`);
  await page.waitForTimeout(1500);
  const controls = await page.locator("section, .workspace").count();
  console.log(path, problems.length ? problems.join(" | ") : "no errors", `· ${controls} sections`);
}
await browser.close();
