// Writes the Sum-IT social links (LinkedIn, Instagram, X) into the footer of
// every page, between <!-- site-socials:start --> and <!-- site-socials:end -->.
// The URLs come from /config.js (SITE_CFG.socials), the same source the homepage
// footer uses; an empty URL leaves that icon out. The links are plain HTML, so
// they work without JavaScript and are crawlable.
//
// Usage (from the repo root), after changing a URL in config.js:
//   node components/footer/sync.mjs
//
// First run: pages without markers get them just before </footer> (inside the
// footer <nav> on the community page, and in the .foot line of login/portal).
// The homepage keeps its own footer icons (#fsoc); only their hrefs are updated.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const START = "<!-- site-socials:start -->";
const END = "<!-- site-socials:end -->";
const CSS = '<link rel="stylesheet" href="/components/footer/footer.css">';
const SKIP_DIRS = new Set([".git", ".claude", "node_modules", "components", "functions", "docs", "tests", "admin"]);
const SKIP_FILES = new Set(["index copy.html", "indexv1.html", "admin.html", "beheer.html"]);

const ICONS = {
  linkedin: { name: "LinkedIn", d: "M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.5c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9z" },
  instagram: { name: "Instagram", d: "M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 4 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm6.4-8.4a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" },
  x: { name: "X", d: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.5 2H8l4.4 5.8zm-1.1 18h1.7L7 3.7H5.2z" },
};

function socials() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(join(root, "config.js"), "utf8"), sandbox);
  return (sandbox.window.SITE_CFG && sandbox.window.SITE_CFG.socials) || {};
}

export function render(urls, extraClass) {
  const links = Object.keys(ICONS)
    .filter((k) => urls[k])
    .map((k) => `<a href="${urls[k]}" target="_blank" rel="noopener" title="${ICONS[k].name}" aria-label="Sum-IT · ${ICONS[k].name}">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[k].d}"/></svg></a>`);
  if (!links.length) return `${START}${END}`;
  return `${START}<div class="site-socials${extraClass ? " " + extraClass : ""}">${links.join("")}</div>${END}`;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, out); }
    else if (name.endsWith(".html") && !SKIP_FILES.has(name)) out.push(p);
  }
  return out;
}

function insertMarkers(src, rel) {
  if (src.includes(START)) return src;
  const mark = START + END;
  if (/<div class="foot">/.test(src)) // login.html, portal.html
    return src.replace(/(<div class="foot">[\s\S]*?)(<\/div>)/, `$1${mark}$2`);
  const f = src.lastIndexOf("</footer>");
  if (f === -1) return src;
  const nav = src.lastIndexOf("</nav>", f);
  const footerStart = src.lastIndexOf("<footer", f);
  if (nav > footerStart) // footer with its own <nav> (community page)
    return src.slice(0, nav) + mark + src.slice(nav);
  return src.slice(0, f) + mark + src.slice(f);
}

if (process.argv[1] && process.argv[1].endsWith("sync.mjs")) {
  const urls = socials();
  let changed = 0;
  for (const file of walk(root)) {
    const rel = relative(root, file).split(sep).join("/");
    let src = readFileSync(file, "utf8");
    const before = src;
    if (rel === "index.html") {
      // Homepage: keep its own #fsoc markup, write the real URLs into it.
      src = src.replace(/<a href="[^"]*"( target="_blank" rel="noopener")? title="([^"]+)" data-soc="(\w+)">/g,
        (m, _t, title, key) => urls[key] ? `<a href="${urls[key]}" target="_blank" rel="noopener" title="${title}" data-soc="${key}">` : m);
    } else {
      src = insertMarkers(src, rel);
      if (src.includes(START)) {
        const a = src.indexOf(START), b = src.indexOf(END) + END.length;
        const dark = /<div class="foot">/.test(src) ? "is-dark" : "";
        src = src.slice(0, a) + render(urls, dark) + src.slice(b);
        if (!src.includes(CSS)) src = src.replace("</head>", CSS + "\n</head>");
      }
    }
    if (src !== before) { writeFileSync(file, src); changed++; }
  }
  console.log(`site-socials synced into ${changed} file(s)`);
}
