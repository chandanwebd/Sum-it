/* Sum-IT CMS article page: /blog/post.html?slug=<slug>
 * Also renders an unsaved editor draft with ?preview=1 (from the /admin/blogs/ editor,
 * stored in this browser's localStorage only).
 * Requires /blog/blocks.js and the blog Supabase settings in sb-config.js.
 */
(function () {
  "use strict";

  /* The blog may run on its own Supabase project (sb-config.js: BLOG_SB_URL / BLOG_SB_ANON). */
  var BLOG_URL = window.BLOG_SB_URL || window.SB_URL;
  var BLOG_KEY = window.BLOG_SB_URL ? window.BLOG_SB_ANON : window.SB_ANON;

  var CATS = {
    belasting: "Belasting & geld",
    projecten: "Projecten, offertes & geld",
    samenwerken: "Samenwerken & netwerk",
    basis: "Starten & administratie",
    "sum-it": "Sum-IT & vergelijken"
  };
  var SITE = "https://sum-it.eu";
  var COLS_LEGACY = "slug,title,description,body_html,created_at,updated_at";
  var COLS_V5 = COLS_LEGACY + ",blocks,category,cover_image,cover_alt,tags,author_name,published_at,meta_title,meta_description,og_image";
  var COLS_V6 = COLS_V5 + ",canonical_url";
  /* Which columns exist depends on the SQL migrations that have been run. */
  var LEVELS = [["v6", COLS_V6], ["v5", COLS_V5], ["legacy", COLS_LEGACY]];

  var params = new URLSearchParams(location.search);
  var slug = params.get("slug") || "";
  var isPreview = params.get("preview") === "1";
  var art = document.getElementById("art");
  var crumbCat = document.getElementById("crumb-cat");
  var related = document.getElementById("related");
  if (!art) return;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function fmtDate(iso) {
    var d = new Date(String(iso).slice(0, 10) + "T12:00:00");
    if (isNaN(d)) return "";
    try { return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(d); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  /* Create or update <meta name|property="…">. */
  function setMeta(key, value, attr) {
    if (!value) return;
    attr = attr || "name";
    var m = document.head.querySelector("meta[" + attr + '="' + key + '"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
    m.setAttribute("content", value);
  }
  function setLink(rel, href) {
    var l = document.head.querySelector('link[rel="' + rel + '"]');
    if (!l) { l = document.createElement("link"); l.rel = rel; document.head.appendChild(l); }
    l.href = href;
  }
  function absolute(url) {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : SITE + (url.charAt(0) === "/" ? url : "/" + url);
  }

  /* Metadata for search engines and social previews, built from the CMS fields. */
  function seo(p) {
    var desc = p.meta_description || p.description || "";
    var own = SITE + "/blog/post.html?slug=" + encodeURIComponent(p.slug);
    var canonical = /^https:\/\/\S+$/.test(p.canonical_url || "") ? p.canonical_url : own;
    var image = absolute(window.SumitBlocks ? SumitBlocks.safeUrl(p.og_image || p.cover_image, true) : "");
    document.title = (p.meta_title || p.title) + " · Sum-IT Blog";
    setMeta("description", desc);
    if (p.tags && p.tags.length) setMeta("keywords", p.tags.join(", "));
    setLink("canonical", canonical);
    setMeta("og:type", "article", "property");
    setMeta("og:site_name", "Sum-IT", "property");
    setMeta("og:locale", "nl_NL", "property");
    setMeta("og:title", p.meta_title || p.title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:image", image || SITE + "/og-image.png", "property");
    if (image && p.cover_alt) setMeta("og:image:alt", p.cover_alt, "property");
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("article:published_time", p.published_at || p.created_at, "property");
    setMeta("article:modified_time", p.updated_at, "property");

    var ld = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: desc,
      mainEntityOfPage: canonical,
      datePublished: p.published_at || p.created_at,
      dateModified: p.updated_at || p.published_at || p.created_at,
      author: { "@type": p.author_name ? "Person" : "Organization", name: p.author_name || "Sum-IT" },
      publisher: { "@type": "Organization", name: "Sum-IT", logo: { "@type": "ImageObject", url: SITE + "/sum-it-logo-mark.png" } },
      inLanguage: "nl-NL"
    };
    if (image) ld.image = image;
    if (p.tags && p.tags.length) ld.keywords = p.tags.join(", ");
    var script = document.getElementById("post-ld") || document.createElement("script");
    script.type = "application/ld+json";
    script.id = "post-ld";
    script.textContent = JSON.stringify(ld).replace(/</g, "\\u003c");
    document.head.appendChild(script);
  }

  /* ---------- states ---------- */

  function showState(title, text, retry) {
    setMeta("robots", "noindex");
    art.removeAttribute("aria-busy");
    art.textContent = "";
    var box = el("div", "blog-empty");
    box.appendChild(el("h1", "", title));
    box.appendChild(el("p", "", text));
    var actions = el("div", "actions");
    if (retry) {
      var b = el("button", "blog-btn primary", "Opnieuw proberen");
      b.type = "button";
      b.addEventListener("click", function () { skeleton(); load(); });
      actions.appendChild(b);
    }
    var back = el("a", "blog-btn", "Naar het blogoverzicht");
    back.href = "/blog/";
    actions.appendChild(back);
    box.appendChild(actions);
    art.appendChild(box);
  }

  function skeleton() {
    art.setAttribute("aria-busy", "true");
    art.textContent = "";
    var s = el("div", "art-skel");
    s.setAttribute("aria-hidden", "true");
    [["18%", 14], ["85%", 40], ["60%", 40], ["100%", 18], ["92%", 18], ["40%", 14]].forEach(function (r) {
      var line = el("div", "skel");
      line.style.width = r[0];
      line.style.height = r[1] + "px";
      line.style.marginBottom = "16px";
      s.appendChild(line);
    });
    art.appendChild(s);
    art.appendChild(el("p", "sr-only", "Artikel laden…"));
  }

  /* ---------- article ---------- */

  function readingMinutes(p) {
    var text = p.blocks && window.SumitBlocks ? SumitBlocks.text(p.blocks) : "";
    if (!text.trim() && p.body_html) {
      /* Parse in an inert document: a live element would load images and run their handlers. */
      text = new DOMParser().parseFromString(p.body_html, "text/html").body.textContent || "";
    }
    var words = (text.match(/\S+/g) || []).length;
    return words ? Math.max(1, Math.round(words / 200)) : 0;
  }

  function render(p) {
    art.removeAttribute("aria-busy");
    art.textContent = "";
    var cat = CATS[p.category] ? p.category : "";

    if (!isPreview) seo(p);
    else document.title = "Voorbeeld: " + (p.title || "artikel") + " · Sum-IT Blog";

    if (crumbCat && cat) {
      crumbCat.textContent = "";
      crumbCat.appendChild(document.createTextNode(" · "));
      var ca = el("a", "", CATS[cat]);
      ca.href = "/blog/?category=" + cat;
      crumbCat.appendChild(ca);
    }

    var head = el("header", "article-head");
    if (cat) {
      var eyebrow = el("a", "article-cat", CATS[cat]);
      eyebrow.href = "/blog/?category=" + cat;
      head.appendChild(eyebrow);
    }
    head.appendChild(el("h1", "", p.title));
    if (p.description) head.appendChild(el("p", "article-lead", p.description));

    var byline = el("div", "article-byline");
    byline.appendChild(el("span", "by", p.author_name || "Sum-IT"));
    var date = p.published_at || p.created_at;
    if (date) {
      var t = el("time", "", fmtDate(date));
      t.setAttribute("datetime", String(date).slice(0, 10));
      byline.appendChild(el("span", "", "·")).setAttribute("aria-hidden", "true");
      byline.appendChild(t);
    }
    var min = readingMinutes(p);
    if (min) {
      byline.appendChild(el("span", "", "·")).setAttribute("aria-hidden", "true");
      byline.appendChild(el("span", "", min + " min leestijd"));
    }
    head.appendChild(byline);
    if (p.tags && p.tags.length) {
      var tags = el("div", "article-tags");
      tags.setAttribute("aria-label", "Tags");
      p.tags.forEach(function (tg) { tags.appendChild(el("span", "pc-tag", tg)); });
      head.appendChild(tags);
    }
    art.appendChild(head);

    var cover = window.SumitBlocks ? SumitBlocks.safeUrl(p.cover_image, true) : "";
    if (cover) {
      var fig = el("figure", "article-cover");
      var img = el("img");
      img.src = cover;
      img.alt = p.cover_alt || "";
      img.decoding = "async";
      img.setAttribute("fetchpriority", "high");
      fig.appendChild(img);
      art.appendChild(fig);
    }

    var body = el("div", "article-body");
    var blocks = window.SumitBlocks ? SumitBlocks.normalize(p.blocks) : [];
    if (blocks.length) {
      SumitBlocks.render(p.blocks, body);
    } else if (p.body_html) {
      /* Legacy posts: admin-authored HTML, reduced to an allow-list of tags first. */
      var legacy = el("div", "b-rich");
      legacy.innerHTML = window.SumitBlocks ? SumitBlocks.sanitizeHTML(p.body_html) : "";
      body.appendChild(legacy);
    }
    art.appendChild(body);

    loadRelated(cat);
  }

  /* ---------- related articles (static manifest) ---------- */

  function relatedCard(a) {
    var card = el("a", "card post-card");
    card.href = a.href;
    card.appendChild(el("span", "pc-cat", CATS[a.category] || ""));
    card.appendChild(el("h3", "pc-title", a.title));
    card.appendChild(el("p", "pc-desc", a.desc));
    var meta = el("span", "pc-meta");
    meta.appendChild(el("span", "pc-author", "Sum-IT"));
    if (a.date) {
      meta.appendChild(el("span", "", "·")).setAttribute("aria-hidden", "true");
      var t = el("time", "", fmtDate(a.date));
      t.setAttribute("datetime", a.date);
      meta.appendChild(t);
    }
    card.appendChild(meta);
    return card;
  }

  function loadRelated(cat) {
    if (!related) return;
    fetch("/blog/index.json")
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        var pool = (data.articles || []).filter(function (a) { return a.href.indexOf("/blog/") === 0; });
        var same = pool.filter(function (a) { return a.category === cat; });
        var list = (same.length >= 3 ? same : same.concat(pool.filter(function (a) { return a.category !== cat; })))
          .slice()
          .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
          .slice(0, 3);
        if (!list.length) return;
        var grid = related.querySelector(".cardgrid");
        grid.textContent = "";
        list.forEach(function (a) { grid.appendChild(relatedCard(a)); });
        related.hidden = false;
      })
      .catch(function () { /* related articles are optional */ });
  }

  /* ---------- data ---------- */

  function request(cols) {
    return fetch(BLOG_URL + "/rest/v1/blog_posts?slug=eq." + encodeURIComponent(slug) + "&select=" + cols, {
      headers: { apikey: BLOG_KEY, Authorization: "Bearer " + BLOG_KEY }
    }).then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); });
  }

  /* Try the newest column set first and step down on "column does not exist" (42703). */
  function requestBest(i) {
    return request(LEVELS[i][1]).then(function (res) {
      if (!res.ok && res.body && res.body.code === "42703" && i < LEVELS.length - 1) {
        try { sessionStorage.setItem("sumit_post_schema:" + BLOG_URL, LEVELS[i + 1][0]); } catch (e) {}
        return requestBest(i + 1);
      }
      return res;
    });
  }

  function load() {
    var start = 0;
    try {
      var known = sessionStorage.getItem("sumit_post_schema:" + BLOG_URL);
      LEVELS.forEach(function (l, i) { if (l[0] === known) start = i; });
    } catch (e) {}
    requestBest(start)
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.body)) throw new Error("request failed");
        var p = res.body[0];
        if (!p) { showState("Artikel niet gevonden", "Dit artikel bestaat niet (meer) of is nog niet gepubliceerd.", false); return; }
        render(p);
      })
      .catch(function () {
        showState("Er ging iets mis", "Het artikel kon niet worden geladen. Controleer je verbinding en probeer het opnieuw.", true);
      });
  }

  /* ---------- boot ---------- */

  if (isPreview) {
    var draft = null;
    try { draft = JSON.parse(localStorage.getItem("sumit_blog_preview") || "null"); } catch (e) {}
    if (!draft) { showState("Geen voorbeeld beschikbaar", "Open het voorbeeld opnieuw vanuit de blog-editor.", false); return; }
    var meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    var banner = el("p", "preview-banner", "Voorbeeld — dit artikel is niet opgeslagen of gepubliceerd.");
    art.parentNode.insertBefore(banner, art);
    render(draft);
    return;
  }

  if (!/^[a-z0-9-]{3,80}$/.test(slug) || !BLOG_URL) {
    showState("Artikel niet gevonden", "Deze link klopt niet. Bekijk alle artikelen in het blogoverzicht.", false);
    return;
  }
  skeleton();
  load();
})();
