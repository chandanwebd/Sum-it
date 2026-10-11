// Internal link check: every internal href/src on the public pages must point
// at a real file without relying on clean-URL rewriting, so links work on any
// static host (GitHub Pages, Vercel without cleanUrls, Cloudflare Pages).
// Also guards against links to the staging app. Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const SKIP_DIRS = new Set([".git", ".claude", "node_modules", "docs", "functions", "tests"]);
const SKIP_FILES = /(^|\/)(index copy\.html|indexv1\.html|google[0-9a-f]+\.html)$/;

function pages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(name)) pages(p, out); }
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function resolves(url, fromFile) {
  let path = url.split("#")[0].split("?")[0];
  if (!path) return true; // pure anchor / query
  if (!path.startsWith("/")) path = "/" + relative(root, join(fromFile, "..", path)).split(sep).join("/");
  const target = join(root, decodeURIComponent(path));
  if (path.endsWith("/")) return existsSync(join(target, "index.html"));
  return existsSync(target) && statSync(target).isFile();
}

const files = pages(root).filter((f) => !SKIP_FILES.test(relative(root, f).split(sep).join("/")));

test("internal links resolve to real files", () => {
  const broken = [];
  for (const f of files) {
    const html = readFileSync(f, "utf8");
    for (const m of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|tel:|data:|javascript:|#|\$\{|\{)/.test(url) || url.includes("'+") || url.includes("\"+")) continue;
      if (!resolves(url, f)) broken.push(relative(root, f) + " -> " + url);
    }
  }
  assert.deepEqual(broken, []);
});

test("no links to the staging app", () => {
  const hits = files.filter((f) => readFileSync(f, "utf8").includes("stg.sum-it.eu")).map((f) => relative(root, f));
  assert.deepEqual(hits, []);
});

test("sitemap URLs point at real files", () => {
  const xml = readFileSync(join(root, "sitemap.xml"), "utf8");
  const bad = [...xml.matchAll(/<loc>https:\/\/sum-it\.eu([^<]*)<\/loc>/g)]
    .map((m) => m[1] || "/")
    .filter((p) => !resolves(p, join(root, "index.html")));
  assert.deepEqual(bad, []);
});

test("every footer has the social links from config.js", async () => {
  const vm = await import("node:vm");
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(join(root, "config.js"), "utf8"), sandbox);
  const urls = Object.values(sandbox.window.SITE_CFG.socials).filter(Boolean);
  const missing = [];
  for (const f of files) {
    const html = readFileSync(f, "utf8");
    if (!/<footer|class="foot"/.test(html)) continue;
    for (const u of urls) if (!html.includes(`href="${u}"`)) missing.push(relative(root, f) + " -> " + u);
  }
  assert.deepEqual(missing, []);
});
