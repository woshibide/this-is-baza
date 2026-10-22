import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ask, decideAll, disagreements, interpret, readKey } from "../scripts/jev/decide.mjs";
import { CONTROLS, QUESTIONS } from "../scripts/jev/config.mjs";

const choice = (picked, confidence, runnerUp = "other") => ({
  type: "choice",
  choice: picked,
  confidence,
  probabilities: { [picked]: 0.6, [runnerUp]: 0.3, third: 0.1 },
});
const noul = (p) => ({ type: "noul", noul: p });
const answers = (overrides = {}) => ({
  expose: noul(0.95),
  control: choice("SliderControl", 0.9),
  region: choice("left_panel", 0.92),
  section: choice("artwork", 0.85),
  persist: noul(0.97),
  ...overrides,
});

test("confident answers are ok and keep their values", () => {
  const decision = interpret(answers());
  assert.deepEqual(decision.expose, { value: true, probability: 0.95, status: "ok" });
  assert.deepEqual(decision.control, { value: "SliderControl", confidence: 0.9, status: "ok" });
  assert.equal(decision.section.value, "artwork");
  assert.equal(decision.persist.status, "ok");
});

test("answers inside the threshold band come back for review with a runner-up", () => {
  const decision = interpret(answers({ control: choice("SliderControl", 0.55, "RangeControl"), persist: noul(0.5) }));
  assert.equal(decision.control.status, "review");
  assert.equal(decision.control.runnerUp, "RangeControl");
  assert.equal(decision.persist.status, "review");
});

test("a confidently hidden value gets no control, region, section, or saving", () => {
  assert.deepEqual(Object.keys(interpret(answers({ expose: noul(0.05) }))), ["expose"]);
});

test("an uncertain hide still asks the rest so the reviewer sees them", () => {
  assert.ok(interpret(answers({ expose: noul(0.4) })).control);
});

test("section applies only to the left panel", () => {
  assert.equal(interpret(answers({ region: choice("inspector", 0.9) })).section, undefined);
});

test("disagreements compare only the questions that were answered", () => {
  const decision = interpret(answers({ control: choice("ChoiceControl", 0.9) }));
  assert.deepEqual(disagreements({ control: "SliderControl", expose: true, section: "artwork" }, decision), [
    { question: "control", expected: "SliderControl", got: "ChoiceControl", status: "ok" },
  ]);
  assert.deepEqual(disagreements({ control: "SliderControl" }, interpret(answers({ expose: noul(0.01) }))), []);
});

test("the key comes from the environment first, then the skill's .env, and empty means none", () => {
  const dir = mkdtempSync(join(tmpdir(), "jev-"));
  const file = join(dir, ".env");
  assert.equal(readKey({}, file), null);
  writeFileSync(file, "TYPESAFE_API_KEY=\n");
  assert.equal(readKey({}, file), null);
  writeFileSync(file, "TYPESAFE_API_KEY=from-file\n");
  assert.equal(readKey({}, file), "from-file");
  assert.equal(readKey({ TYPESAFE_API_KEY: " from-env " }, file), "from-env");
});

test("requests send the pinned model and questions, never gold labels, and retry on 429", async () => {
  const sent = [];
  const replies = [
    new Response("busy", { status: 429 }),
    Response.json({ model: "jev-1.13.0", answers: answers(), usage: { input_tokens: 900 } }),
  ];
  const reply = await ask(
    { sketch: "s", value: { name: "size", example: 28, gold: { control: "SliderControl" } } },
    { key: "k", fetchImpl: async (url, init) => (sent.push(init), replies.shift()), sleep: async () => {} },
  );
  assert.equal(sent.length, 2);
  const body = JSON.parse(sent[0].body);
  assert.equal(body.model, "jev-1.13.0");
  assert.deepEqual(body.state, { sketch: "s", value: { name: "size", example: 28 } });
  assert.deepEqual(Object.keys(body.questions), ["expose", "control", "region", "section", "persist"]);
  assert.equal(sent[0].headers.Authorization, "Bearer k");
  assert.equal(reply.usage.input_tokens, 900);
});

test("other HTTP errors fail with the status and value name", async () => {
  await assert.rejects(
    ask({ sketch: "s", value: { name: "size" } }, { key: "k", fetchImpl: async () => new Response("bad key", { status: 401 }) }),
    /TypeSafe 401 for "size": bad key/,
  );
});

test("a malformed candidates file fails before any request", async () => {
  await assert.rejects(decideAll({ values: [] }, { key: "k", fetchImpl: () => assert.fail("no request") }), /Candidates file needs/);
});

test("the control options cover every reference control plus none_fits", () => {
  assert.equal(QUESTIONS.control.criteria, CONTROLS);
  assert.ok(CONTROLS.none_fits);
  assert.equal(Object.keys(CONTROLS).length, 14);
});
