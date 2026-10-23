import test from "node:test";
import assert from "node:assert/strict";
import { condense, questionsFor, verdict } from "../scripts/jev/parity.mjs";

const record = (step, dom, extra = {}) => ({ step, dom, focus: "outside", html: "", log: [], models: { value: 1 }, ...extra });

test("condensed recordings keep the initial markup, then only what changed", () => {
  const steps = condense([
    record("initial", "<div>\n  \"1\""),
    record({ click: "button" }, "<div>\n  \"2\"", { log: [{ type: "model", name: "value", value: 2 }], models: { value: 2 }, focus: "button@0" }),
    record({ shot: "after" }, "<div>\n  \"2\"", { models: { value: 2 }, focus: "button@0" }),
  ]);
  assert.deepEqual(steps[0], { action: "initial", models: { value: 1 }, focus: "outside", html: "(none)", dom: ["<div>", "  \"1\""] });
  assert.deepEqual(steps[1], {
    action: '{"click":"button"}',
    emitted: [{ type: "model", name: "value", value: 2 }],
    models: { value: 2 },
    focus: "button@0",
    domAdded: ['"2"'],
    domRemoved: ['"1"'],
  });
  assert.deepEqual(steps[2], { action: '{"shot":"after"}' });
});

test("each rule gets a same-behavior and a coverage question", () => {
  const questions = questionsFor(["rule a", "rule b"]);
  assert.deepEqual(Object.keys(questions), ["same_0", "exercised_0", "same_1", "exercised_1"]);
  assert.equal(questions.same_1.type, "noul");
  assert.equal(questions.same_1.instructions.rule, "rule b");
});

test("verdicts use the shared Noul thresholds", () => {
  assert.equal(verdict(0.8), "yes");
  assert.equal(verdict(0.5), "review");
  assert.equal(verdict(0.2), "no");
});
