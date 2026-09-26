/* Sum-IT blog landing: search, category filter, sorting, URL state, sticky
 * category bar and CMS articles. The static cards in blog/index.html work
 * without this script; it only enhances them.
 *
 * URL state: /blog/?category=<id>&sort=oldest&search=<text>
 */
(function () {
  "use strict";

  /* The blog may run on its own Supabase project (sb-config.js: BLOG_SB_URL / BLOG_SB_ANON). */
  var BLOG_URL = window.BLOG_SB_URL || window.SB_URL;
  var BLOG_KEY = window.BLOG_SB_URL ? window.BLOG_SB_ANON : window.SB_ANON;

  var CATS = ["belasting", "projecten", "samenwerken", "basis", "sum-it"];
  var FILTERS = CATS.concat(["tools"]);
  var PREVIEW = 6;
  var DEBOUNCE = 250;

  var doc = document.documentElement;
  var main = document.getElementById("main");
  var toolbar = document.getElementById("blog-toolbar");
  var catNav = document.getElementById("blog-cats");
  var sortSel = document.getElementById("blog-sort");
  var input = document.getElementById("blog-search");
  var statusEl = document.getElementById("blog-status");
  var emptyEl = document.getElementById("blog-empty");
  var latest = document.getElementById("latest");
  var tools = document.getElementById("tools");
  if (!main || !toolbar || !catNav) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var state = { category: "", sort: "newest", search: "" };
  var sections = {};
  var cmsStatus = "idle";

  function T(nl, en) { return window.SUMIT_LANG === "en" ? en : nl; }
  function lang() { return window.SUMIT_LANG === "en" ? "en" : "nl"; }
  function plural(n) { return n + " " + (n === 1 ? T("artikel", "article") : T("artikelen", "articles")); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^https?:\/\//i.test(u) || /^\/(?!\/)/.test(u) ? u : "";
  }
  function catLabel(id) {
    var chip = catNav.querySelector('.bt-chip[data-cat="' + id + '"]');
    return chip ? chip.textContent.trim() : id;
  }

  /* ---------- setup ---------- */

  CATS.forEach(function (id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    sections[id] = {
      el: sec,
      grid: sec.querySelector(".cardgrid"),
      cnt: sec.querySelector(".cnt"),
      more: sec.querySelector(".sec-more"),
      heading: sec.querySelector("h2")
    };
    if (sections[id].heading) sections[id].heading.setAttribute("tabindex", "-1");
  });
  if (tools && tools.querySelector("h2")) tools.querySelector("h2").setAttribute("tabindex", "-1");

  function categoryCards(id) {
    var s = sections[id];
    return s ? Array.prototype.slice.call(s.grid.querySelectorAll(":scope > .card")) : [];
  }
  function allCategoryCards() {
    return CATS.reduce(function (acc, id) { return acc.concat(categoryCards(id)); }, []);
  }
  allCategoryCards().forEach(function (c, i) { c.dataset.idx = String(i); });

  function haystack(card) {
    return [
      card.querySelector("h3") ? card.querySelector("h3").textContent : "",
      card.querySelector("p") ? card.querySelector("p").textContent : "",
      card.dataset.cat ? catLabel(card.dataset.cat) : "",
      card.dataset.tags || "",
      card.dataset.author || "",
      /* Both languages, so a search matches whichever language is shown. */
      card.dataset.titleNl || "", card.dataset.descNl || "",
      card.dataset.titleEn || "", card.dataset.descEn || ""
    ].join(" ").toLocaleLowerCase("nl-NL");
  }

  function matches(card, terms) {
    if (!terms.length) return true;
    if (!card._hay) card._hay = haystack(card);
    return terms.every(function (t) { return card._hay.indexOf(t) !== -1; });
  }

  /* ---------- sorting ---------- */

  function compare(a, b) {
    var da = a.dataset.date || "", db = b.dataset.date || "";
    if (da !== db) {
      if (!da) return 1; /* undated pages always last */
      if (!db) return -1;
      return state.sort === "oldest" ? (da < db ? -1 : 1) : (da > db ? -1 : 1);
    }
    return (+a.dataset.idx || 0) - (+b.dataset.idx || 0);
  }

  function sortAll() {
    CATS.forEach(function (id) {
      var s = sections[id];
      if (!s) return;
      categoryCards(id).sort(compare).forEach(function (c) { s.grid.appendChild(c); });
    });
  }

  function rebuildLatest() {
    if (!latest) return;
    var grid = latest.querySelector(".cardgrid");
    var newest = allCategoryCards()
      .filter(function (c) { return c.dataset.date; })
      .sort(function (a, b) {
        /* CMS posts marked "uitgelicht" (featured) come first. */
        var fa = a.dataset.featured === "1", fb = b.dataset.featured === "1";
        if (fa !== fb) return fa ? -1 : 1;
        return a.dataset.date === b.dataset.date ? (+a.dataset.idx || 0) - (+b.dataset.idx || 0) : (a.dataset.date > b.dataset.date ? -1 : 1);
      })
      .slice(0, 3);
    grid.textContent = "";
    newest.forEach(function (c) {
      var clone = c.cloneNode(true);
      clone.classList.remove("is-filtered");
      grid.appendChild(clone);
    });
  }

  /* ---------- rendering ---------- */

  function apply() {
    var terms = state.search.toLocaleLowerCase("nl-NL").split(/\s+/).filter(Boolean);
    var searching = terms.length > 0;
    var cat = state.category;
    var total = 0;

    if (latest) latest.hidden = searching || !!cat;

    if (tools) {
      var toolHits = 0;
      tools.querySelectorAll(".card").forEach(function (c) {
        var ok = matches(c, terms);
        c.classList.toggle("is-filtered", !ok);
        if (ok) toolHits++;
      });
      tools.hidden = (cat && cat !== "tools") || (searching && !toolHits);
      if (!tools.hidden && (searching || cat === "tools")) total += toolHits;
    }

    CATS.forEach(function (id) {
      var s = sections[id];
      if (!s) return;
      var cards = categoryCards(id);
      var hits = 0;
      cards.forEach(function (c) {
        var ok = matches(c, terms);
        c.classList.toggle("is-filtered", !ok);
        if (ok) hits++;
      });
      var inScope = !cat || cat === id;
      s.el.hidden = !inScope || (searching && !hits) || (!searching && !cards.length && !cat);
      var preview = !cat && !searching;
      s.el.classList.toggle("is-preview", preview);
      if (s.more) s.more.hidden = !(preview && cards.length > PREVIEW);
      if (inScope) total += hits;
    });

    if (sortSel) sortSel.classList.toggle("is-changed", state.sort !== "newest");
    catNav.querySelectorAll(".bt-chip").forEach(function (chip) {
      var on = (chip.dataset.cat || "") === cat;
      if (on) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
    });

    renderStatus(total, searching);
    renderEmpty(total, searching);
  }

  function renderStatus(total, searching) {
    if (!statusEl) return;
    var cat = state.category;
    if (!searching && !cat) { statusEl.hidden = true; statusEl.textContent = ""; return; }
    statusEl.hidden = false;
    statusEl.textContent = "";
    var p = el("p");
    p.appendChild(el("strong", "", plural(total)));
    if (searching) {
      p.appendChild(document.createTextNode(" " + T("voor", "for") + " "));
      p.appendChild(el("strong", "", "“" + state.search.trim() + "”"));
    }
    if (cat) p.appendChild(document.createTextNode(" " + T("in", "in") + " " + catLabel(cat)));
    statusEl.appendChild(p);
    var clear = el("button", "link-btn", T("Alles tonen", "Show everything"));
    clear.type = "button";
    clear.addEventListener("click", function () { reset(true); });
    statusEl.appendChild(clear);
  }

  function renderEmpty(total, searching) {
    if (!emptyEl) return;
    var show = total === 0 && (searching || !!state.category);
    emptyEl.hidden = !show;
    if (!show) return;
    emptyEl.textContent = "";
    var actions = el("div", "actions");
    if (searching) {
      emptyEl.appendChild(el("h2", "", T("Geen artikelen gevonden", "No articles found")));
      emptyEl.appendChild(el("p", "", T(
        "We vonden niets voor “" + state.search.trim() + "”. Probeer een ander woord, zoals btw, offerte of uurtarief.",
        "Nothing matched “" + state.search.trim() + "”. Try another word, such as VAT, quote or hourly rate.")));
      var clearSearch = el("button", "blog-btn primary", T("Zoekopdracht wissen", "Clear search"));
      clearSearch.type = "button";
      clearSearch.addEventListener("click", function () { setSearch(""); input && input.focus(); });
      actions.appendChild(clearSearch);
    } else {
      emptyEl.appendChild(el("h2", "", T("Nog geen artikelen in deze categorie", "No articles in this category yet")));
      emptyEl.appendChild(el("p", "", T("Bekijk de andere onderwerpen; er komen regelmatig nieuwe artikelen bij.", "Browse the other topics; new articles are added regularly.")));
    }
    if (state.category) {
      var all = el("button", "blog-btn", T("Alle categorieën", "All categories"));
      all.type = "button";
      all.addEventListener("click", function () { setCategory("", true); });
      actions.appendChild(all);
    }
    emptyEl.appendChild(actions);
  }

  /* Texts that depend on the active language or on counts. */
  function refreshTexts() {
    var fmt;
    try { fmt = new Intl.DateTimeFormat(lang() === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { fmt = null; }
    var en = lang() === "en";
    document.querySelectorAll(".post-card").forEach(function (c) {
      /* Card title + description: Dutch is in the HTML, English in data-title-en / data-desc-en. */
      [["pc-title", "title"], ["pc-desc", "desc"]].forEach(function (f) {
        var node = c.querySelector("." + f[0]);
        if (!node) return;
        var nlKey = f[1] + "Nl", enKey = f[1] + "En";
        if (c.dataset[nlKey] === undefined) c.dataset[nlKey] = node.textContent;
        var text = en && c.dataset[enKey] ? c.dataset[enKey] : c.dataset[nlKey];
        if (node.textContent !== text) node.textContent = text;
        if (en && c.dataset[enKey]) node.setAttribute("lang", "en"); else node.removeAttribute("lang");
      });
      var t = c.querySelector("time[datetime]");
      if (t && fmt) t.textContent = fmt.format(new Date(t.getAttribute("datetime") + "T12:00:00"));
      var r = c.querySelector(".pc-read[data-min]");
      if (r) r.textContent = r.dataset.min + " " + T("min leestijd", "min read");
      var lbl = c.querySelector(".pc-cat");
      if (lbl && c.dataset.cat) lbl.textContent = catLabel(c.dataset.cat);
      c._hay = null;
    });
    CATS.forEach(function (id) {
      var s = sections[id];
      if (!s) return;
      var n = categoryCards(id).length;
      if (s.cnt) s.cnt.textContent = plural(n);
      var link = s.more && s.more.querySelector(".more-link");
      if (link) link.textContent = T("Bekijk alle " + n + " artikelen →", "View all " + n + " articles →");
    });
    if (input) input.setAttribute("aria-label", T("Zoek in de blog", "Search the blog"));
    apply();
    renderCmsNote();
  }

  /* ---------- state changes ---------- */

  function url() {
    var p = new URLSearchParams();
    if (state.category) p.set("category", state.category);
    if (state.sort !== "newest") p.set("sort", state.sort);
    if (state.search.trim()) p.set("search", state.search.trim());
    var q = p.toString();
    return location.pathname + (q ? "?" + q : "") + (!q && location.hash && location.hash !== "#main" ? location.hash : "");
  }
  function syncURL(push) {
    var next = url();
    if (next === location.pathname + location.search + location.hash) return;
    try { history[push ? "pushState" : "replaceState"]({ blog: true }, "", next); } catch (e) {}
  }

  function readURL() {
    var p = new URLSearchParams(location.search);
    var c = p.get("category") || "";
    state.category = FILTERS.indexOf(c) !== -1 ? c : "";
    state.sort = p.get("sort") === "oldest" ? "oldest" : "newest";
    state.search = (p.get("search") || "").slice(0, 80);
  }

  function isStuck() {
    return toolbar.getBoundingClientRect().top <= (parseFloat(getComputedStyle(toolbar).top) || 0) + 1;
  }

  function scrollToTarget(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function focusHeading(sec) {
    var h = sec && sec.querySelector("h2[tabindex]");
    if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
  }

  function setCategory(cat, push) {
    state.category = FILTERS.indexOf(cat) !== -1 ? cat : "";
    apply();
    syncURL(push);
    centerChip();
    var target = state.category === "tools" ? tools : state.category ? sections[state.category] && sections[state.category].el : null;
    /* Filtered view: the status line (count + "show everything") sits directly above the section. */
    if (target) { scrollToTarget(main); focusHeading(target); }
    else if (isStuck()) scrollToTarget(main);
  }

  function setSearch(value) {
    state.search = value;
    if (input && input.value !== value) input.value = value;
    apply();
    syncURL(false);
  }

  function reset(scroll) {
    state.category = "";
    setSearch("");
    centerChip();
    if (scroll && isStuck()) scrollToTarget(main);
  }

  function centerChip(instant) {
    var chip = catNav.querySelector('.bt-chip[aria-current="true"]');
    if (!chip) return;
    var left = chip.offsetLeft - (catNav.clientWidth - chip.offsetWidth) / 2;
    try { catNav.scrollTo({ left: Math.max(0, left), behavior: instant || reduceMotion ? "auto" : "smooth" }); } catch (e) { catNav.scrollLeft = left; }
  }

  /* ---------- events ---------- */

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".bt-chip, .more-link");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    setCategory(link.dataset.cat || "", true);
  });

  if (sortSel) {
    sortSel.addEventListener("change", function () {
      state.sort = sortSel.value === "oldest" ? "oldest" : "newest";
      sortAll();
      apply();
      syncURL(true);
    });
  }

  if (input) {
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { setSearch(input.value); }, DEBOUNCE);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(timer);
        setSearch(input.value);
        scrollToTarget(main);
      } else if (e.key === "Escape" && input.value) {
        clearTimeout(timer);
        setSearch("");
      }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); input.select(); }
    });
  }

  window.addEventListener("popstate", function () {
    readURL();
    if (input) input.value = state.search;
    if (sortSel) sortSel.value = state.sort;
    sortAll();
    apply();
    centerChip(true);
  });

  document.addEventListener("langchange", refreshTexts);

  /* Sticky bar: expose its height for scroll offsets; shadow once stuck; edge fade. */
  function measure() { doc.style.setProperty("--blog-bar-h", toolbar.offsetHeight + "px"); }
  if (window.ResizeObserver) new ResizeObserver(measure).observe(toolbar);
  measure();
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; toolbar.classList.toggle("is-stuck", isStuck() && window.scrollY > 0); });
  }, { passive: true });
  function edge() { catNav.classList.toggle("has-more", catNav.scrollLeft + catNav.clientWidth < catNav.scrollWidth - 4); }
  catNav.addEventListener("scroll", edge, { passive: true });
  window.addEventListener("resize", edge);

  /* ---------- CMS articles (Supabase) ---------- */

  function cmsCard(p) {
    var cat = CATS.indexOf(p.category) !== -1 ? p.category : "basis";
    var date = String(p.published_at || p.created_at || "").slice(0, 10);
    var a = el("a", "card post-card");
    a.href = "/blog/post.html?slug=" + encodeURIComponent(p.slug);
    a.dataset.cat = cat;
    a.dataset.date = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
    a.dataset.author = p.author_name || "Sum-IT";
    a.dataset.tags = (p.tags || []).join(",");
    a.dataset.idx = "-1";
    if (p.is_featured) a.dataset.featured = "1";
    if (p.title_en) a.dataset.titleEn = p.title_en;
    if (p.description_en) a.dataset.descEn = p.description_en;
    var cover = safeUrl(p.cover_image);
    if (cover) {
      var media = el("span", "pc-media");
      var img = el("img");
      img.src = cover;
      img.alt = p.cover_alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
      a.appendChild(media);
    }
    a.appendChild(el("span", "pc-cat", catLabel(cat)));
    a.appendChild(el("h3", "pc-title", p.title || ""));
    if (p.description) a.appendChild(el("p", "pc-desc", p.description));
    var meta = el("span", "pc-meta");
    meta.appendChild(el("span", "pc-author", a.dataset.author));
    if (a.dataset.date) {
      meta.appendChild(el("span", "pc-dot", "·")).setAttribute("aria-hidden", "true");
      var t = el("time");
      t.setAttribute("datetime", a.dataset.date);
      t.textContent = a.dataset.date;
      meta.appendChild(t);
    }
    a.appendChild(meta);
    return a;
  }

  function renderCmsNote() {
    if (!latest) return;
    var old = latest.querySelector(".blog-note");
    if (old) old.remove();
    if (cmsStatus !== "error") return;
    var note = el("p", "blog-note", T("Nieuwe artikelen konden niet worden geladen.", "New articles could not be loaded."));
    var retry = el("button", "link-btn", T("Opnieuw proberen", "Try again"));
    retry.type = "button";
    retry.addEventListener("click", loadCms);
    note.appendChild(retry);
    latest.appendChild(note);
  }

  function fetchPosts(columns) {
    return fetch(BLOG_URL + "/rest/v1/blog_posts?select=" + columns + "&published=eq.true&order=created_at.desc&limit=100", {
      headers: { apikey: BLOG_KEY, Authorization: "Bearer " + BLOG_KEY }
    }).then(function (r) {
      return r.json().then(function (body) { return { ok: r.ok, body: body }; });
    });
  }

  function loadCms() {
    if (!BLOG_URL || String(BLOG_URL).indexOf("http") !== 0) return;
    cmsStatus = "loading";
    if (latest) latest.setAttribute("aria-busy", "true");
    renderCmsNote();
    var LEGACY = "slug,title,description,created_at";
    var V5 = LEGACY + ",published_at,category,cover_image,cover_alt,tags,author_name";
    /* Newest column set first; step down while the migrations (v5, v6) haven't run. */
    var levels = [["v7", V5 + ",is_featured,title_en,description_en"], ["v6", V5 + ",is_featured"], ["v5", V5], ["legacy", LEGACY]];
    var start = 0;
    try {
      var known = sessionStorage.getItem("sumit_blog_schema:" + BLOG_URL);
      levels.forEach(function (l, i) { if (l[0] === known) start = i; });
    } catch (e) {}
    function attempt(i) {
      return fetchPosts(levels[i][1]).then(function (res) {
        if (!res.ok && res.body && res.body.code === "42703" && i < levels.length - 1) {
          try { sessionStorage.setItem("sumit_blog_schema:" + BLOG_URL, levels[i + 1][0]); } catch (e) {}
          return attempt(i + 1);
        }
        return res;
      });
    }
    attempt(start)
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.body)) throw new Error("CMS request failed");
        document.querySelectorAll('.post-card[data-idx="-1"]').forEach(function (c) { c.remove(); });
        res.body.forEach(function (p) {
          if (!p || !/^[a-z0-9-]{3,80}$/.test(p.slug || "")) return;
          var card = cmsCard(p);
          var s = sections[card.dataset.cat];
          if (s) s.grid.insertBefore(card, s.grid.firstChild);
        });
        cmsStatus = "done";
        sortAll();
        rebuildLatest();
        refreshTexts();
      })
      .catch(function () {
        cmsStatus = "error";
        renderCmsNote();
      })
      .then(function () { if (latest) latest.removeAttribute("aria-busy"); });
  }

  /* ---------- boot ---------- */

  readURL();
  if (input && state.search) input.value = state.search;
  if (sortSel) sortSel.value = state.sort;
  sortAll();
  rebuildLatest();
  refreshTexts();
  edge();
  if (state.category) {
    centerChip(true);
    var initial = state.category === "tools" ? tools : sections[state.category] && sections[state.category].el;
    if (initial) main.scrollIntoView({ block: "start" });
  }
  loadCms();
})();
