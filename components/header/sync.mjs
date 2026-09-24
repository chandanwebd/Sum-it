// Copies components/header/header.html into every page between the
// <!-- site-header:start --> and <!-- site-header:end --> markers, so the
// navigation is part of each page's HTML (works without JS, crawlable).
// Usage (from the repo root): node components/header/sync.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const partial = readFileSync(join(root, "components/header/header.html"), "utf8").trim();
const START = "<!-- site-header:start -->";
const END = "<!-- site-header:end -->";
const SKIP_DIRS = new Set([".git", ".claude", "node_modules", "components", "functions"]);

function indent(text, pad) {
  return text.split("\n").map((l) => (l ? pad + l : l)).join("\n");
}

// Homepage links point at in-page sections instead of other pages.
function homeVariant(html) {
  return html
    .replace(/href="[^"]*"(\s+data-home-href="([^"]*)")/g, 'href="$2"$1')
    .replace(/href="\/#/g, 'href="#');
}

export function render(file) {
  const home = relative(root, file).split(sep).join("/") === "index.html";
  const body = home ? homeVariant(partial) : partial;
  return `${START}\n<header id="site-header" class="site-header">\n${indent(body, "  ")}\n</header>\n${END}`;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("sync.mjs")) {
  let changed = 0;
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const a = src.indexOf(START);
    const b = src.indexOf(END);
    if (a === -1 || b === -1) continue;
    const next = src.slice(0, a) + render(file) + src.slice(b + END.length);
    if (next !== src) { writeFileSync(file, next); changed++; }
  }
  console.log(`site-header synced into ${changed} file(s)`);
}
