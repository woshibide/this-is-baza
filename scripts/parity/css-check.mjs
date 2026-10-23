#!/usr/bin/env node
// Compares each component section of vanilla/components.css with the Vue component's compiled scoped CSS:
// rule for rule, the same at-rule context, the same declarations, and the same selector specificity.
// Matching specificity, with the same load order, gives the same cascade against src/styles.css.
// Usage: node scripts/parity/css-check.mjs [Component ...]

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { compileStyle, parse } from "@vue/compiler-sfc";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Splits a selector list on top-level commas.
function splitList(selector) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(selector.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selector.slice(start).trim());
  return parts;
}

// [ids, classes/attributes/pseudo-classes, types/pseudo-elements] for one complex selector.
export function specificity(selector) {
  let a = 0, b = 0, c = 0;
  let i = 0;
  const s = selector;
  const readName = () => {
    const start = i;
    while (i < s.length && /[\w\-\\]/.test(s[i])) i += s[i] === "\\" ? 2 : 1;
    return s.slice(start, i);
  };
  const readParens = () => {
    let depth = 0, start = i;
    for (; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")" && --depth === 0) { i++; break; }
    }
    return s.slice(start + 1, i - 1);
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === "#") { i++; readName(); a++; }
    else if (ch === ".") { i++; readName(); b++; }
    else if (ch === "[") { while (s[i] !== "]") i++; i++; b++; }
    else if (ch === ":") {
      const element = s[i + 1] === ":";
      i += element ? 2 : 1;
      const name = readName().toLowerCase();
      const args = s[i] === "(" ? readParens() : null;
      if (element || ["before", "after", "first-line", "first-letter"].includes(name)) c++;
      else if (name === "where") {}
      else if (["not", "is", "has"].includes(name)) {
        const best = splitList(args).map(specificity).sort(compare).at(-1);
        a += best[0]; b += best[1]; c += best[2];
      } else b++;
    } else if (/[\w-]/.test(ch)) { readName(); c++; }
    else if (ch === "*") i++;
    else i++;
  }
  return [a, b, c];
}
const compare = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

function rules(css) {
  const list = [];
  postcss.parse(css).walkRules((rule) => {
    const context = [];
    for (let p = rule.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule") context.unshift(`@${p.name} ${p.params}`);
    const declarations = rule.nodes.filter((n) => n.type === "decl").map((d) => `${d.prop}: ${d.value.replace(/\s+/g, " ")}${d.important ? " !important" : ""}`);
    list.push({ selectors: splitList(rule.selector), context: context.join(" "), declarations });
  });
  return list;
}

function vueRules(component) {
  const file = resolve(root, `src/components/${component}.vue`);
  const { descriptor } = parse(readFileSync(file, "utf8"), { filename: file });
  const css = descriptor.styles
    .map((style) => compileStyle({ source: style.content, filename: file, id: "data-v-x", scoped: style.scoped }).code)
    .join("\n");
  return rules(css);
}

function vanillaSections() {
  const text = readFileSync(resolve(root, "vanilla/components.css"), "utf8");
  const sections = new Map();
  const pattern = /^\/\* ([A-Z]\w+) \*\/$/gm;
  const marks = [...text.matchAll(pattern)];
  marks.forEach((mark, i) => sections.set(mark[1], text.slice(mark.index + mark[0].length, marks[i + 1]?.index ?? text.length)));
  return sections;
}

const sections = vanillaSections();
const components = process.argv.slice(2).length ? process.argv.slice(2) : [...sections.keys()];
let failures = 0;
for (const component of components) {
  const problems = [];
  if (!sections.has(component)) problems.push("no section in vanilla/components.css");
  else {
    const vue = vueRules(component);
    const vanilla = rules(sections.get(component));
    if (vue.length !== vanilla.length) problems.push(`${vue.length} Vue rules, ${vanilla.length} vanilla rules`);
    for (let i = 0; i < Math.min(vue.length, vanilla.length); i++) {
      const v = vue[i], w = vanilla[i];
      const where = `rule ${i + 1} (${w.selectors.join(", ")})`;
      if (v.context !== w.context) problems.push(`${where}: context "${v.context}" vs "${w.context}"`);
      if (v.declarations.join("; ") !== w.declarations.join("; ")) problems.push(`${where}: declarations differ\n      vue:     ${v.declarations.join("; ")}\n      vanilla: ${w.declarations.join("; ")}`);
      if (v.selectors.length !== w.selectors.length) problems.push(`${where}: ${v.selectors.length} vs ${w.selectors.length} selectors`);
      else v.selectors.forEach((selector, j) => {
        const sv = specificity(selector), sw = specificity(w.selectors[j]);
        if (compare(sv, sw)) problems.push(`${where}: "${w.selectors[j]}" is (${sw}) but Vue's "${selector}" is (${sv})`);
      });
    }
  }
  if (problems.length) {
    failures++;
    console.log(`FAIL ${component}\n  ${problems.join("\n  ")}`);
  } else console.log(`pass ${component}`);
}
process.exit(failures ? 1 : 0);
