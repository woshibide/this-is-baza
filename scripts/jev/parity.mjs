#!/usr/bin/env node
// Optional Jev review of the vanilla port: for each behavior rule of a component, does the vanilla recording
// follow the rule the same way the Vue recording does, and do the recordings exercise the rule at all?
// Reads the light-theme recordings that scripts/parity/run.mjs wrote to scripts/parity/out/.
// Usage: node scripts/jev/parity.mjs <Component> [...]
// A "yes" is not proof and a "no" is a lead; the deterministic parity checks stay the gate.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL, THRESHOLDS } from "./config.mjs";
import { readKey, request } from "./decide.mjs";
import { RULES } from "./parity-rules.mjs";
import { cases as SETUPS } from "../parity/cases.js";

const here = dirname(fileURLToPath(import.meta.url));
const recordings = resolve(here, "../parity/out");
const MAX_DOM_LINES = 12;
const MAX_INITIAL_DOM_LINES = 80;

const describe = (step) => (typeof step === "string" ? step : JSON.stringify(step));

// The props, models, and slots a case renders with; functions are dropped.
const setupOf = (name) => {
  const { component, props, models, slots } = SETUPS[name] ?? {};
  return JSON.parse(JSON.stringify({ component, props, models, slots }));
};

// One entry per step: the initial markup, then the action and only what changed: emitted values, model state, focus, DOM lines.
export function condense(records) {
  let previous = null;
  return records.map((record) => {
    const entry = { action: describe(record.step) };
    if (record.log.length) entry.emitted = record.log;
    if (!previous || JSON.stringify(record.models) !== JSON.stringify(previous.models)) entry.models = record.models;
    if (!previous || record.focus !== previous.focus) entry.focus = record.focus;
    if (!previous || record.html !== previous.html) entry.html = record.html || "(none)";
    if (!previous) entry.dom = record.dom.split("\n").slice(0, MAX_INITIAL_DOM_LINES);
    else {
      const before = new Set(previous.dom.split("\n"));
      const after = new Set(record.dom.split("\n"));
      const added = [...after].filter((line) => !before.has(line)).map((line) => line.trim());
      const removed = [...before].filter((line) => !after.has(line)).map((line) => line.trim());
      if (added.length) entry.domAdded = added.slice(0, MAX_DOM_LINES);
      if (removed.length) entry.domRemoved = removed.slice(0, MAX_DOM_LINES);
    }
    previous = record;
    return entry;
  });
}

export function questionsFor(rules) {
  return Object.fromEntries(
    rules.flatMap((rule, i) => [
      [`same_${i}`, {
        type: "noul",
        instructions: {
          rule,
          question: "Does `vanilla` follow `rule` the same way `vue` does, step for step?",
        },
        criteria: {
          true: "At every step where the rule applies, `vanilla` shows the same emitted values, model state, focus, and markup changes as `vue`.",
          false: "At some step where the rule applies, `vanilla` differs from `vue`: a different or missing emitted value, model state, focus, or markup change.",
        },
      }],
      [`exercised_${i}`, {
        type: "noul",
        instructions: {
          rule,
          question: "Does `vue`, including its initial render, show the markup, state, or interaction that `rule` is about?",
        },
        criteria: {
          true: "The initial render or a later step shows what the rule describes, such as the markup it names, the props or slots it depends on, or the interaction it covers.",
          false: "Nothing in the recording involves what the rule describes, so it cannot show whether the rule holds.",
        },
      }],
    ]),
  );
}

export function verdict(p) {
  return p >= THRESHOLDS.noulYes ? "yes" : p <= THRESHOLDS.noulNo ? "no" : "review";
}

export function loadRecordings(component, dir = recordings) {
  if (!existsSync(dir)) throw new Error(`No recordings in ${dir}; run node scripts/parity/run.mjs ${component} first.`);
  const files = readdirSync(dir).filter((file) => file.startsWith(`${component}.`) && file.endsWith(".light.json"));
  if (!files.length) throw new Error(`No light-theme recordings for ${component} in ${dir}.`);
  return files.map((file) => {
    const { vue, vanilla } = JSON.parse(readFileSync(join(dir, file), "utf8"));
    return { case: file.replace(/\.light\.json$/, ""), vue: condense(vue), vanilla: condense(vanilla) };
  });
}

export async function review(component, options) {
  const rules = RULES[component];
  if (!rules?.length) throw new Error(`No parity rules for ${component} in parity-rules.mjs.`);
  const cases = loadRecordings(component, options.dir);
  // One request per case: every rule is judged against the same pair of recordings.
  const replies = await Promise.all(
    cases.map((recording) =>
      request(
        {
          model: MODEL,
          state: { component, case: recording.case, setup: setupOf(recording.case), vue: recording.vue, vanilla: recording.vanilla },
          questions: questionsFor(rules),
        },
        `${component} ${recording.case}`,
        options,
      ).then((reply) => ({ recording, reply })),
    ),
  );
  const results = rules.map((rule, i) => {
    const perCase = replies.map(({ recording, reply }) => ({
      case: recording.case,
      same: Math.round(reply.answers[`same_${i}`].noul * 1000) / 1000,
      exercised: Math.round(reply.answers[`exercised_${i}`].noul * 1000) / 1000,
    }));
    // A rule is judged on the cases that exercise it; none exercising it is itself a lead.
    const relevant = perCase.filter((c) => verdict(c.exercised) !== "no");
    const worst = relevant.length ? Math.min(...relevant.map((c) => c.same)) : null;
    return {
      rule,
      verdict: worst === null ? "not exercised" : verdict(worst),
      worst,
      cases: perCase,
    };
  });
  return {
    jev: "available",
    model: replies[0]?.reply.model ?? MODEL,
    component,
    thresholds: { noulYes: THRESHOLDS.noulYes, noulNo: THRESHOLDS.noulNo },
    leads: results.filter((r) => r.verdict !== "yes").map((r) => r.rule),
    inputTokens: replies.reduce((sum, { reply }) => sum + (reply.usage?.input_tokens ?? 0), 0),
    results,
  };
}

async function main() {
  const components = process.argv.slice(2);
  if (!components.length) {
    console.error("Usage: node scripts/jev/parity.mjs <Component> [...]");
    process.exit(2);
  }
  const key = readKey();
  if (!key) {
    console.log(JSON.stringify({ jev: "unavailable" }));
    return;
  }
  for (const component of components) console.log(JSON.stringify(await review(component, { key }), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
