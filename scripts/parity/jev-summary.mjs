#!/usr/bin/env node
// Prints a compact table of a Jev parity report piped from scripts/jev/parity.mjs.
let input = "";
process.stdin.on("data", (chunk) => (input += chunk)).on("end", () => {
  for (const part of input.split(/\n(?=\{)/)) {
    const report = JSON.parse(part);
    if (report.jev !== "available") { console.log(part); continue; }
    console.log(`${report.component} (${report.model}, ${report.inputTokens} input tokens)`);
    for (const r of report.results) {
      console.log(`  ${r.verdict.padEnd(13)} ${String(r.worst ?? "-").padEnd(5)} ${r.rule}`);
      for (const c of r.cases)
        if (r.verdict !== "yes" || (c.known && c.same < 0.8))
          console.log(`      ${c.case}${c.known ? " (known difference)" : ""}: same ${c.same}, exercised ${c.exercised}`);
    }
  }
});
