import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Marked, Renderer } from "marked";

export default defineConfig({
  plugins: [vue(), {
    name: "readme-page",
    resolveId(id) {
      if (id === "virtual:readme") return "\0virtual:readme";
    },
    load(id) {
      if (id !== "\0virtual:readme") return;
      const readmePath = fileURLToPath(new URL("./README.md", import.meta.url));
      this.addWatchFile(readmePath);
      const contents = [];
      const ids = new Set(["overview"]);
      const markdown = new Marked({
        walkTokens(token) {
          if (token.type === "link" && !/^(?:[a-z]+:|\/|#)/i.test(token.href)) {
            token.href = new URL(token.href, "https://github.com/woshibide/this-is-baza/blob/main/").href;
          }
        },
        renderer: {
          link(token) {
            const html = Renderer.prototype.link.call(this, token);
            return /^(?:https?:)?\/\//i.test(token.href)
              ? html.replace("<a ", '<a target="_blank" rel="noopener noreferrer" ')
              : html;
          },
          heading({ tokens, depth, text }) {
            const label = text.replace(/[*_`]/g, "");
            const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
            let anchor = base;
            let suffix = 2;
            while (ids.has(anchor)) anchor = `${base}-${suffix++}`;
            ids.add(anchor);
            contents.push({ id: anchor, label, example: depth > 2 });
            return `<h${depth} id="${anchor}">${this.parser.parseInline(tokens)}</h${depth}>`;
          },
        },
      });
      const tokens = markdown.lexer(readFileSync(readmePath, "utf8"));
      if (tokens[0]?.type === "heading" && tokens[0].depth === 1) tokens.shift();
      const html = markdown.parse(tokens.map(token => token.raw).join(""));
      return `export const html = ${JSON.stringify(html)}; export const contents = ${JSON.stringify(contents)};`;
    },
  }],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        examples: fileURLToPath(new URL("./examples/index.html", import.meta.url)),
      },
    },
  },
});
