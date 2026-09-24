/* Sum-IT CMS article page: /blog/post.html?slug=<slug>
 * Also renders an unsaved editor draft with ?preview=1 (from beheer.html,
 * stored in this browser's localStorage only).
 * Requires /blog/blocks.js and window.SB_URL / SB_ANON (sb-config.js).
 */
(function () {
  "use strict";

  var CATS = {
    belasting: "Belasting & geld",
    projecten: "Projecten, offertes & geld",
    samenwerken: "Samenwerken & netwerk",
    basis: "Starten & administratie",
    "sum-it": "Sum-IT & vergelijken"
  };
  var COLS_LEGACY = "slug,title,description,body_html,created_at,updated_at";
  var COLS = COLS_LEGACY + ",blocks,category,cover_image,cover_alt,tags,author_name,published_at,meta_title,meta_description";

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
  function setMeta(name, value) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (m && value) m.setAttribute("content", value);
  }

  /* ---------- states ---------- */

  function showState(title, text, retry) {
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
      var tmp = document.createElement("div");
      tmp.innerHTML = p.body_html;
      text = tmp.textContent;
    }
    var words = (text.match(/\S+/g) || []).length;
    return words ? Math.max(1, Math.round(words / 200)) : 0;
  }

  function render(p) {
    art.removeAttribute("aria-busy");
    art.textContent = "";
    var cat = CATS[p.category] ? p.category : "";

    document.title = (p.meta_title || p.title) + " · Sum-IT Blog";
    setMeta("description", p.meta_description || p.description);

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
      /* Legacy posts: admin-authored HTML, rendered exactly as before. */
      var legacy = el("div", "b-rich");
      legacy.innerHTML = p.body_html;
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
    return fetch(window.SB_URL + "/rest/v1/blog_posts?slug=eq." + encodeURIComponent(slug) + "&select=" + cols, {
      headers: { apikey: window.SB_ANON, Authorization: "Bearer " + window.SB_ANON }
    }).then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); });
  }

  function load() {
    var legacyKnown = false;
    try { legacyKnown = sessionStorage.getItem("sumit_blog_schema") === "legacy"; } catch (e) {}
    request(legacyKnown ? COLS_LEGACY : COLS)
      .then(function (res) {
        if (!res.ok && res.body && res.body.code === "42703") {
          try { sessionStorage.setItem("sumit_blog_schema", "legacy"); } catch (e) {}
          return request(COLS_LEGACY);
        }
        return res;
      })
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

  if (!/^[a-z0-9-]{3,80}$/.test(slug) || !window.SB_URL) {
    showState("Artikel niet gevonden", "Deze link klopt niet. Bekijk alle artikelen in het blogoverzicht.", false);
    return;
  }
  skeleton();
  load();
})();
