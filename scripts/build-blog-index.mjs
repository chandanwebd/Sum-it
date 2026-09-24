// Builds the static article cards on /blog/ from blog/index.json.
//
//   node scripts/build-blog-index.mjs                # rebuild cards from blog/index.json
//   node scripts/build-blog-index.mjs --from-legacy  # one-off: create index.json from the old hand-written cards
//
// index.json holds the editorial data (category, card title, card text) per URL.
// Publish date and reading time are read from each article's own HTML so they
// never drift. The cards stay server-rendered HTML (crawlable, work without JS);
// /blog/blog.js adds search, filtering, sorting and the CMS articles on top.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const INDEX = join(root, "blog/index.html");
const MANIFEST = join(root, "blog/index.json");
const START = "<!-- blog-index:start -->";
const END = "<!-- blog-index:end -->";

// Category order, ids (kept from the old page: /blog/#belasting etc. still work) and i18n keys.
export const CATEGORIES = [
  { id: "belasting", i18n: "bl9", desc_i18n: "bl10", label: "Belasting & geld", desc: "Inkomstenbelasting, btw, aftrekposten en alles rond de Belastingdienst.", chip: "b_cat_tax" },
  { id: "projecten", i18n: "bl61", desc_i18n: "bl62", label: "Projecten, offertes & geld", desc: "Uurtarief, offertes, facturen, winst per klus en betaald krijgen.", chip: "b_cat_proj" },
  { id: "samenwerken", i18n: "bl93", desc_i18n: "bl94", label: "Samenwerken & netwerk", desc: "Uitbesteden, onderaannemen, Wet DBA, personeel en samen ondernemen.", chip: "b_cat_net" },
  { id: "basis", i18n: "bl125", desc_i18n: "bl126", label: "Starten & administratie", desc: "Je onderneming starten, rechtsvorm kiezen en je boekhouding op orde.", chip: "b_cat_start" },
  { id: "sum-it", i18n: "bl181", desc_i18n: "bl182", label: "Sum-IT & vergelijken", desc: "Wat Sum-IT doet en voor wie het gemaakt is.", chip: "bx_cat_sumit" },
];

const decode = (s) => {
  let prev;
  do {
    prev = s;
    s = s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
  } while (s !== prev);
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const nlDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

function fileFor(href) {
  const clean = href.split("#")[0].split("?")[0];
  const candidates = [clean, clean + ".html", clean.replace(/\/$/, "/index.html")];
  for (const c of candidates) { const p = join(root, c.replace(/^\//, "")); if (existsSync(p) && c !== "/") return p; }
  return null;
}

function articleMeta(href) {
  const file = fileFor(href);
  if (!file) throw new Error("Article file not found for " + href);
  const html = readFileSync(file, "utf8");
  const date = (html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
  const min = +((html.match(/<div class="meta">[^<]*?(\d+)\s*min/) || [])[1] || 0);
  return { date, min };
}

function fromLegacy() {
  const html = readFileSync(INDEX, "utf8");
  const tools = [];
  const articles = [];
  for (const sec of html.matchAll(/<section id="([^"]+)"[\s\S]*?<\/section>/g)) {
    for (const card of sec[0].matchAll(/<a class="card" href="([^"]+)">([\s\S]*?)<\/a>/g)) {
      const title = decode((card[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || "");
      const pm = card[2].match(/<p( data-i18n="([^"]+)")?>([\s\S]*?)<\/p>/) || [];
      const tm = card[2].match(/<h3 data-i18n="([^"]+)"/);
      const entry = { href: card[1], title, desc: decode(pm[3] || "") };
      if (sec[1] === "tools") tools.push({ ...entry, title_i18n: tm && tm[1], desc_i18n: pm[2] });
      else articles.push({ ...entry, category: sec[1] });
    }
  }
  return { tools, articles };
}

function card(a, catLabel) {
  const meta = articleMeta(a.href);
  const parts = ['<span class="pc-author">Sum-IT</span>'];
  if (meta.date) parts.push(`<time datetime="${meta.date}">${nlDate(meta.date)}</time>`);
  if (meta.min) parts.push(`<span class="pc-read" data-min="${meta.min}">${meta.min} min leestijd</span>`);
  return `<a class="card post-card" href="${esc(a.href)}" data-cat="${a.category}" data-date="${meta.date}" data-author="Sum-IT" data-tags="${esc((a.tags || []).join(","))}">` +
    `<span class="pc-cat">${esc(catLabel)}</span>` +
    `<h3 class="pc-title">${esc(a.title)}</h3>` +
    `<p class="pc-desc">${esc(a.desc)}</p>` +
    `<span class="pc-meta">${parts.join('<span class="pc-dot" aria-hidden="true">·</span>')}</span></a>`;
}

function toolCard(t) {
  return `<a class="card tool-card" href="${esc(t.href)}"><span class="tc-icon" aria-hidden="true">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4"/></svg></span>` +
    `<span class="tc-body"><h3${t.title_i18n ? ` data-i18n="${t.title_i18n}"` : ""}>${esc(t.title)}</h3>` +
    `<p${t.desc_i18n ? ` data-i18n="${t.desc_i18n}"` : ""}>${esc(t.desc)}</p></span>` +
    `<span class="tc-go" data-i18n="bl_tool">Open de tool →</span></a>`;
}

function build(data) {
  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c.id, []]));
  for (const a of data.articles) {
    if (!byCat[a.category]) throw new Error(`Unknown category "${a.category}" for ${a.href}`);
    byCat[a.category].push(a);
  }
  const label = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
  const dated = data.articles.map((a) => ({ a, d: articleMeta(a.href).date })).filter((x) => x.d);
  const latest = dated.sort((x, y) => (y.d > x.d ? 1 : y.d < x.d ? -1 : 0)).slice(0, 3).map((x) => x.a);

  const chips = [`<a class="bt-chip" href="/blog/" data-cat="" data-i18n="bx_all">Alles</a>`]
    .concat(CATEGORIES.map((c) => `<a class="bt-chip" href="/blog/?category=${c.id}" data-cat="${c.id}" data-i18n="${c.chip}">${esc(c.label)}</a>`))
    .concat([`<a class="bt-chip" href="/blog/#tools" data-cat="tools" data-i18n="b_cat_tools">Tools</a>`]);

  const out = [];
  out.push(`<div class="blog-toolbar" id="blog-toolbar">`,
    `  <div class="bt-in">`,
    `    <nav class="bt-cats" id="blog-cats" aria-label="Categorieën">${chips.join("")}</nav>`,
    `    <div class="bt-sort"><label for="blog-sort" data-i18n="bx_sort">Sorteren</label>`,
    `      <select id="blog-sort"><option value="newest" data-i18n="bx_newest">Nieuwste eerst</option><option value="oldest" data-i18n="bx_oldest">Oudste eerst</option></select></div>`,
    `  </div>`,
    `</div>`,
    `<main id="main" class="blog-main">`,
    `<div class="blog-status" id="blog-status" role="status" aria-live="polite" hidden></div>`,
    `<section id="latest" class="blog-sec is-latest" aria-labelledby="h-latest"><div class="shead"><h2 id="h-latest" data-i18n="bx_latest">Nieuwste artikelen</h2></div>`,
    `<div class="cardgrid">${latest.map((a) => card(a, label[a.category])).join("")}</div></section>`,
    `<section id="tools" class="blog-sec is-tools" aria-labelledby="h-tools"><div class="shead"><h2 id="h-tools" data-i18n="bl3">Gratis tools</h2></div><p class="sdesc" data-i18n="bl4">Reken direct uit wat je moet reserveren of vragen — met de officiële 2026-tarieven.</p>`,
    `<div class="toolgrid">${data.tools.map(toolCard).join("")}</div></section>`);
  for (const c of CATEGORIES) {
    const list = byCat[c.id];
    out.push(`<section id="${c.id}" class="blog-sec" data-cat="${c.id}" aria-labelledby="h-${c.id}">` +
      `<div class="shead"><h2 id="h-${c.id}" data-i18n="${c.i18n}">${esc(c.label)}</h2><span class="cnt" data-count="${list.length}">${list.length} artikelen</span></div>` +
      `<p class="sdesc" data-i18n="${c.desc_i18n}">${esc(c.desc)}</p>` +
      `<div class="cardgrid">${list.map((a) => card(a, c.label)).join("")}</div>` +
      `<div class="sec-more"><a class="more-link" href="/blog/?category=${c.id}" data-cat="${c.id}">Bekijk alle ${list.length} artikelen →</a></div></section>`);
  }
  out.push(`<div class="blog-empty" id="blog-empty" hidden></div>`, `</main>`);
  return out.join("\n");
}

const legacy = process.argv.includes("--from-legacy");
let data;
if (legacy) {
  data = fromLegacy();
  writeFileSync(MANIFEST, JSON.stringify({ tools: data.tools, articles: data.articles }, null, 2) + "\n");
  console.log(`wrote blog/index.json: ${data.tools.length} tools, ${data.articles.length} articles`);
} else {
  data = JSON.parse(readFileSync(MANIFEST, "utf8"));
}
// Derived fields (read by /blog/post.html for related articles); refreshed on every build.
data.articles = data.articles.map((a) => ({ ...a, ...articleMeta(a.href) }));
writeFileSync(MANIFEST, JSON.stringify({ tools: data.tools, articles: data.articles }, null, 2) + "\n");

let html = readFileSync(INDEX, "utf8");
const block = `${START}\n${build(data)}\n${END}`;
if (html.includes(START)) {
  html = html.slice(0, html.indexOf(START)) + block + html.slice(html.indexOf(END) + END.length);
} else {
  const re = /<main id="main">[\s\S]*?<\/main>/;
  if (!re.test(html)) throw new Error("Could not find <main> in blog/index.html");
  html = html.replace(re, block);
}
writeFileSync(INDEX, html);
console.log(`blog/index.html: ${data.articles.length} article cards in ${CATEGORIES.length} categories`);
