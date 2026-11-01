// SEO checks for every page listed in sitemap.xml (the pages meant for search):
// metadata present and unique, canonical = its own production URL, no noindex,
// valid JSON-LD with production URLs, one <h1>. Plus: the homepage HTML is
// Dutch before JavaScript runs (scripts/prerender-home-i18n.mjs).
// Run: node --test tests/seo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadI18N, prerender } from "../scripts/prerender-home-i18n.mjs";

const root = join(fileURLToPath(import.meta.url), "../..");
const ORIGIN = "https://sum-it.eu";

const urls = [...readFileSync(join(root, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
function fileFor(url) {
  const path = url.slice(ORIGIN.length) || "/";
  return join(root, path.endsWith("/") ? path + "index.html" : path);
}
const pages = urls.map((url) => {
  const html = readFileSync(fileFor(url), "utf8");
  const head = html.split("</head>")[0];
  const get = (re) => (head.match(re) || [])[1];
  return {
    url, html, head,
    title: get(/<title>([^<]*)<\/title>/),
    desc: get(/<meta\s+name="description"\s+content="([^"]*)"/),
    canonical: get(/<link\s+rel="canonical"\s+href="([^"]*)"/),
    robots: get(/<meta\s+name="robots"\s+content="([^"]*)"/) || "",
  };
});

test("sitemap only lists production URLs of existing pages", () => {
  assert.ok(urls.length > 50);
  assert.deepEqual(urls.filter((u) => !u.startsWith(ORIGIN + "/") || !existsSync(fileFor(u))), []);
});

test("every sitemap page is indexable and self-canonical", () => {
  assert.deepEqual(pages.filter((p) => /noindex/i.test(p.robots)).map((p) => p.url), []);
  assert.deepEqual(pages.filter((p) => p.canonical !== p.url).map((p) => `${p.url} -> ${p.canonical}`), []);
});

test("title, description and Open Graph tags are present", () => {
  const missing = [];
  for (const p of pages) {
    if (!p.title) missing.push(p.url + " title");
    if (!p.desc) missing.push(p.url + " description");
    for (const prop of ["og:title", "og:description", "og:url", "og:image"])
      if (!p.head.includes(`property="${prop}"`)) missing.push(p.url + " " + prop);
  }
  assert.deepEqual(missing, []);
});

test("titles and descriptions are unique", () => {
  const dupes = (key) => {
    const seen = new Map();
    for (const p of pages) seen.set(p[key], [...(seen.get(p[key]) || []), p.url]);
    return [...seen.values()].filter((v) => v.length > 1);
  };
  assert.deepEqual(dupes("title"), []);
  assert.deepEqual(dupes("desc"), []);
});

test("one <h1> per page", () => {
  assert.deepEqual(pages.filter((p) => (p.html.match(/<h1[\s>]/g) || []).length !== 1).map((p) => p.url), []);
});

test("JSON-LD parses and only uses production URLs that exist", () => {
  const bad = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let data;
      try { data = JSON.parse(m[1]); } catch (e) { bad.push(`${p.url} invalid JSON-LD`); continue; }
      for (const u of JSON.stringify(data).match(/https:\/\/sum-it\.eu[^"]*/g) || []) {
        const clean = u.split("#")[0];
        if (/\.(png|svg|jpg|webp)$/.test(clean) ? !existsSync(join(root, clean.slice(ORIGIN.length))) : !existsSync(fileFor(clean)))
          bad.push(`${p.url} -> ${u}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("homepage HTML is already in Dutch (prerendered from I18N.nl)", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const again = prerender(html, loadI18N().nl).html;
  assert.equal(again, html, "run: node scripts/prerender-home-i18n.mjs");
});
