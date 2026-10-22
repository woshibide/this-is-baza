#!/usr/bin/env node
// Optional Jev decisions for a sketch's interface: whether each value gets a control, which one, where, and whether it is saved.
// Usage: node scripts/jev/decide.mjs <candidates.json>
// Without a TypeSafe key it prints {"jev":"unavailable"} and exits 0, so the skill falls back to the references.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { ENDPOINT, MODEL, QUESTIONS, THRESHOLDS } from "./config.mjs";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RETRY_STATUSES = new Set([429, 529]);
const RETRY_DELAYS_MS = [500, 1000, 2000, 4000];

// The environment wins over <skill-folder>/.env; an empty value counts as no key.
export function readKey(env = process.env, envFile = join(skillDir, ".env")) {
  const fromEnv = env.TYPESAFE_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (!existsSync(envFile)) return null;
  return parseEnv(readFileSync(envFile, "utf8")).TYPESAFE_API_KEY?.trim() || null;
}

export async function ask(candidate, { key, fetchImpl = fetch, sleep = delay } = {}) {
  const { gold, ...value } = candidate.value;
  const body = JSON.stringify({
    model: MODEL,
    state: { sketch: candidate.sketch, value },
    questions: QUESTIONS,
  });
  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body,
    });
    if (response.ok) {
      const json = await response.json();
      return { ...json, latencyMs: Math.round(performance.now() - started) };
    }
    if (RETRY_STATUSES.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    throw new Error(`TypeSafe ${response.status} for "${value.name}": ${await response.text()}`);
  }
}

const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const round = (n) => Math.round(n * 1000) / 1000;

function choiceDecision(answer) {
  const ranked = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
  return {
    value: answer.choice,
    confidence: round(answer.confidence),
    status: answer.confidence >= THRESHOLDS.choice ? "ok" : "review",
    ...(answer.confidence < THRESHOLDS.choice && { runnerUp: ranked[1]?.[0] ?? null }),
  };
}

function noulDecision(answer) {
  const p = answer.noul;
  const status = p >= THRESHOLDS.noulYes || p <= THRESHOLDS.noulNo ? "ok" : "review";
  return { value: p >= 0.5, probability: round(p), status };
}

// Only answers that apply are kept: a hidden value gets no control, region, section, or saving; section is only for the left panel.
export function interpret(answers) {
  const decision = { expose: noulDecision(answers.expose) };
  if (decision.expose.status === "ok" && !decision.expose.value) return decision;
  decision.control = choiceDecision(answers.control);
  decision.region = choiceDecision(answers.region);
  if (decision.region.value === "left_panel") decision.section = choiceDecision(answers.section);
  decision.persist = noulDecision(answers.persist);
  return decision;
}

// Gold labels are optional and used only to measure agreement.
export function disagreements(gold = {}, decision) {
  return Object.entries(gold)
    .filter(([question, expected]) => decision[question] && decision[question].value !== expected)
    .map(([question, expected]) => ({ question, expected, got: decision[question].value, status: decision[question].status }));
}

export async function decideAll(file, options) {
  const { sketch, values } = file;
  if (typeof sketch !== "string" || !Array.isArray(values) || !values.length)
    throw new Error('Candidates file needs { "sketch": string, "values": [ { name, label, type, example, usage } ] }.');
  const results = await Promise.all(
    values.map(async (value) => {
      const reply = await ask({ sketch, value }, options);
      const decision = interpret(reply.answers);
      const missed = disagreements(value.gold, decision);
      return {
        name: value.name,
        decision,
        ...(value.gold && { disagreements: missed }),
        model: reply.model,
        inputTokens: reply.usage?.input_tokens ?? null,
        latencyMs: reply.latencyMs,
      };
    }),
  );
  const graded = results.filter((r) => r.disagreements);
  return {
    jev: "available",
    model: results[0]?.model ?? MODEL,
    thresholds: THRESHOLDS,
    review: results.filter((r) => Object.values(r.decision).some((d) => d.status === "review")).map((r) => r.name),
    ...(graded.length && {
      agreement: `${graded.filter((r) => !r.disagreements.length).length}/${graded.length} values fully match gold`,
    }),
    inputTokens: results.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
    results,
  };
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/jev/decide.mjs <candidates.json>");
    process.exit(2);
  }
  const key = readKey();
  if (!key) {
    console.log(JSON.stringify({ jev: "unavailable", reason: `No TYPESAFE_API_KEY in the environment or ${join(skillDir, ".env")}` }));
    return;
  }
  const report = await decideAll(JSON.parse(readFileSync(resolve(path), "utf8")), { key });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
