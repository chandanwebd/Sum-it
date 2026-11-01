// Writes the Dutch homepage texts from js/index.js (I18N.nl) into index.html,
// so the HTML that crawlers and link previews read is the same Dutch page
// visitors see (the page is lang="nl"; without this the static HTML was the
// English copy until JavaScript ran). setLang() still swaps the text at
// runtime for EN, so behaviour in the browser is unchanged.
//
// Run after editing homepage texts in js/index.js (from the repo root):
//   node scripts/prerender-home-i18n.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(fileURLToPath(import.meta.url), "../..");

/* The I18N object literal is the first statement of js/index.js and ends at
   the first line that is exactly "};". Evaluate only that part. */
export function loadI18N() {
  const src = readFileSync(join(root, "js/index.js"), "utf8").split(/\r?\n/);
  const start = src.findIndex((l) => /^const I18N = \{/.test(l));
  const end = src.findIndex((l, i) => i > start && l === "};");
  if (start === -1 || end === -1) throw new Error("I18N object not found in js/index.js");
  return vm.runInNewContext("(" + src.slice(start, end + 1).join("\n").replace(/^const I18N = /, "").replace(/;$/, "") + ")");
}

const VOID = new Set(["input", "img", "br", "hr", "meta", "link", "source"]);

/* Replace the inner HTML of every element carrying data-i18n="key" with
   dict[key], matching the element's own closing tag (same-name nesting is
   counted). Keys missing from dict are left alone, like setLang() does. */
export function prerender(html, dict) {
  const open = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;
  let out = "", pos = 0, m, count = 0;
  while ((m = open.exec(html))) {
    const tag = m[1].toLowerCase(), key = m[2];
    const innerStart = m.index + m[0].length;
    if (VOID.has(tag) || !(key in dict)) continue;
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    re.lastIndex = innerStart;
    let depth = 1, t, innerEnd = -1;
    while ((t = re.exec(html))) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) { innerEnd = t.index; break; }
    }
    if (innerEnd === -1) throw new Error(`No closing </${tag}> for data-i18n="${key}"`);
    out += html.slice(pos, innerStart) + dict[key];
    pos = innerEnd;
    open.lastIndex = innerEnd;
    count++;
  }
  out += html.slice(pos);
  /* Placeholders */
  out = out.replace(/(<[^>]*\sdata-i18n-ph="([^"]+)"[^>]*>)/g, (tagHtml, _t, key) =>
    key in dict ? tagHtml.replace(/\splaceholder="[^"]*"/, ` placeholder="${dict[key].replace(/"/g, "&quot;")}"`) : tagHtml);
  return { html: out, count };
}

if (process.argv[1] && process.argv[1].endsWith("prerender-home-i18n.mjs")) {
  const file = join(root, "index.html");
  const { html, count } = prerender(readFileSync(file, "utf8"), loadI18N().nl);
  writeFileSync(file, html);
  console.log(`index.html: ${count} texts written in Dutch`);
}
