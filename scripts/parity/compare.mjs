// Shared by the parity runners: a markup normalizer that runs in the page, and a pixel comparison.

// Pixels count as different when any channel differs by more than 10%; a case passes up to 0.05% such pixels.
export const PIXEL_THRESHOLD = 0.1;
export const MAX_DIFF_RATIO = 0.0005;

// Serializes nodes to comparable lines; self-contained so it can run in the page from its source.
// Ids from Vue's useId (v-0) and the port's uid (baza-0) become #1, #2 by first appearance;
// classes starting with "baza-" are the port's scoping hooks (except baza-theme) and are ignored.
export function normalize(nodes) {
  const ids = new Map();
  const canon = (value) =>
    value.replace(/\b(?:v|baza)-\d+(?:-\d+)*/g, (id) => {
      if (!ids.has(id)) ids.set(id, `#${ids.size + 1}`);
      return ids.get(id);
    });
  const lines = [];
  function walk(node, depth) {
    const pad = "  ".repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, " ");
      if (text === " ") lines.push(`${pad}#whitespace`);
      else if (text) lines.push(`${pad}"${text}"`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const attrs = [];
    for (const { name, value } of node.attributes) {
      if (name.startsWith("data-v-")) continue;
      if (name === "class") {
        // A class list is a set: Vue may write a class twice when a parent passes one the root already has.
        const classes = [...new Set(value.split(/\s+/))].filter((c) => c && (!c.startsWith("baza-") || c === "baza-theme")).sort();
        if (classes.length) attrs.push(`class="${classes.join(" ")}"`);
      } else if (name === "style") {
        const parts = value.split(";").map((p) => p.trim().replace(/\s*:\s*/, ": ")).filter(Boolean).sort();
        if (parts.length) attrs.push(`style="${parts.join("; ")}"`);
      } else attrs.push(`${name}="${canon(value)}"`);
    }
    if (["INPUT", "SELECT", "TEXTAREA"].includes(node.tagName)) {
      attrs.push(`:value="${node.value}"`);
      if (node.type === "checkbox" || node.type === "radio") attrs.push(`:checked=${node.checked}`);
    }
    if (node.tagName === "DETAILS") attrs.push(`:open=${node.open}`);
    attrs.sort();
    lines.push(`${pad}<${node.tagName.toLowerCase()}${attrs.length ? " " + attrs.join(" ") : ""}>`);
    for (const child of node.childNodes) walk(child, depth + 1);
  }
  for (const node of nodes) walk(node, 0);
  return lines.join("\n");
}

export async function pixelDiff(page, a, b) {
  return page.evaluate(async ([a, b, threshold]) => {
    const load = async (base64) => createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const width = Math.max(ia.width, ib.width), height = Math.max(ia.height, ib.height);
    const read = (image) => {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, width, height).data;
    };
    const da = read(ia), db = read(ib);
    const diff = new OffscreenCanvas(width, height);
    const dctx = diff.getContext("2d");
    const out = dctx.createImageData(width, height);
    let count = 0;
    for (let i = 0; i < da.length; i += 4) {
      const delta = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(da[i + c] - db[i + c]))) / 255;
      const bad = delta > threshold;
      if (bad) count++;
      out.data.set(bad ? [255, 0, 0, 255] : [da[i], da[i + 1], da[i + 2], 40], i);
    }
    dctx.putImageData(out, 0, 0);
    const blob = await diff.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { sameSize: ia.width === ib.width && ia.height === ib.height, size: [ia.width, ia.height, ib.width, ib.height], count, total: width * height, diff: btoa(binary) };
  }, [a.toString("base64"), b.toString("base64"), PIXEL_THRESHOLD]);
}

