#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(process.argv[2] || process.cwd());
const ignored = new Set([".git", "node_modules", "dist", "build", ".next", ".nuxt", "coverage"]);
const interestingExtensions = new Set([".html", ".vue", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"]);
const maxFiles = 10000;

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Project folder does not exist or is not a directory: ${root}`);
  process.exit(2);
}

function walk(directory, files = []) {
  if (files.length >= maxFiles) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
    if (files.length >= maxFiles) break;
  }
  return files;
}

function gitRoot() {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readPackage() {
  const path = join(root, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { _error: `Invalid package.json: ${error.message}` };
  }
}

function extension(path) {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

const files = walk(root);
const packageJson = readPackage();
const dependencyNames = new Set([
  ...Object.keys(packageJson?.dependencies || {}),
  ...Object.keys(packageJson?.devDependencies || {}),
]);
const sourceFiles = files.filter((path) => interestingExtensions.has(extension(path)));
const textSample = sourceFiles.slice(0, 500).map((path) => {
  try {
    return readFileSync(path, "utf8").slice(0, 200000);
  } catch {
    return "";
  }
}).join("\n");

const packageManager = existsSync(join(root, "pnpm-lock.yaml"))
  ? "pnpm"
  : existsSync(join(root, "yarn.lock"))
    ? "yarn"
    : existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))
      ? "bun"
      : existsSync(join(root, "package-lock.json"))
        ? "npm"
        : null;

const resolvedGitRoot = gitRoot();
const report = {
  project: root,
  git: { initialized: Boolean(resolvedGitRoot), root: resolvedGitRoot },
  packageManager,
  package: packageJson && {
    name: packageJson.name || null,
    type: packageJson.type || null,
    scripts: packageJson.scripts || {},
    error: packageJson._error || null,
  },
  frameworks: {
    vue: dependencyNames.has("vue") || files.some((path) => path.endsWith(".vue")),
    vite: dependencyNames.has("vite"),
    p5: dependencyNames.has("p5") || /\bnew\s+p5\b|\bcreateCanvas\s*\(/.test(textSample),
    canvas2d: /getContext\s*\(\s*["']2d["']\s*\)/.test(textSample),
  },
  entrypoints: files
    .filter((path) => basename(path) === "index.html")
    .map((path) => path.slice(root.length + 1))
    .sort(),
  persistence: {
    localStorage: /\blocalStorage\b/.test(textSample),
    sessionStorage: /\bsessionStorage\b/.test(textSample),
    urlState: /\bURLSearchParams\b|history\.(?:pushState|replaceState)/.test(textSample),
  },
  exportSignals: {
    webCodecs: /\bVideoEncoder\b|\bVideoFrame\b/.test(textSample),
    mediaRecorder: /\bMediaRecorder\b/.test(textSample),
    svg: /image\/svg\+xml|createElementNS\s*\(/.test(textSample),
    png: /image\/png|toBlob\s*\(/.test(textSample),
  },
  scannedFiles: files.length,
  truncated: files.length >= maxFiles,
};

console.log(JSON.stringify(report, null, 2));
