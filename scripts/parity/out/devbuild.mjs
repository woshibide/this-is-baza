import { readdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { pixelDiff } from "../compare.mjs";
const dev = "scripts/parity/out/dev/gallery", dist = "scripts/parity/out/dist/gallery";
const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of readdirSync(dev).filter((f) => f.endsWith(".vue.png"))) {
  const r = await pixelDiff(page, readFileSync(`${dev}/${file}`), readFileSync(`${dist}/${file}`));
  if (r.count || !r.sameSize) console.log(file, r.sameSize ? "" : r.size.join("x"), r.count);
}
await browser.close();
