/* Sum-IT invoice designs gallery (/functies/facturen/).
 * Renders every style from components/invoice/styles.js as a scaled A4
 * thumbnail; click opens a full-size preview with previous / next.
 * Controls: series, document (invoice / quote) and accent colour. The
 * document language follows the site language switch (EN / NL).
 */
(function (window, document) {
  "use strict";

  var API = window.SumitInvoiceStyles;
  var grid = document.getElementById("ig-grid");
  if (!API || !grid) return;

  var A4_W = 794, A4_H = 1123;
  var SERIES = { a: { nl: "Zakelijk", en: "Business" }, b: { nl: "Speels", en: "Playful" }, c: { nl: "Modern", en: "Modern" } };
  var NAMES_EN = {
    kantoor: "Office", blauwdruk: "Blueprint", notaris: "Notary", bouwbon: "Site slip", zacht: "Soft", marge: "Margin",
    inkt: "Ink", raster: "Grid", vakwerk: "Craftwork", compact: "Compact", citrus: "Citrus", sticker: "Sticker",
    terminal: "Terminal", ticket: "Ticket", memo: "Memo", neon: "Neon", blokken: "Blocks", duotone: "Duotone",
    bubbel: "Bubble", krant: "Newspaper", stripe: "Minimal", kleurband: "Colour band", grootbedrag: "Big amount",
    haarlijn: "Hairline", tweekleur: "Two-tone", enkelekolom: "Single column", actie: "Action first", luxe: "Luxe",
    venster: "Window envelope", zegel: "Status seal", gegroepeerd: "Grouped", corporate: "Corporate"
  };
  var TAGS_EN = {
    "Neutraal": "Neutral", "Technisch": "Technical", "Klassiek": "Classic", "Vakmensen": "Trades", "Rustig": "Calm",
    "Asymmetrisch": "Asymmetric", "Statement": "Statement", "Zwitsers": "Swiss", "Ambacht": "Craft", "Veel regels": "Many lines",
    "Fris": "Fresh", "Pastel": "Pastel", "Retro": "Retro", "Stub": "Stub", "Handgeschreven": "Handwritten", "Donker": "Dark",
    "Bauhaus": "Bauhaus", "Display": "Display", "Vriendelijk": "Friendly", "Redactioneel": "Editorial", "Sober": "Plain",
    "Kopbalk": "Header bar", "Callout": "Callout", "Ingetogen": "Understated", "Kopblok": "Header block", "Studio": "Studio",
    "Betalen/tekenen": "Pay / sign first", "Editorial": "Editorial", "NL standaard": "Dutch standard", "Stempel": "Stamp", "Fases": "Phases"
  };
  var UI = {
    nl: { enlarge: "Vergroot ontwerp {name}", count: "{n} ontwerpen · serie {set} · {doc}", invoice: "factuur", offer: "offerte",
          prev: "← Vorige", next: "Volgende →", close: "Sluiten", preview: "Voorbeeld van ontwerp {name}" },
    en: { enlarge: "Enlarge design {name}", count: "{n} designs · {set} series · {doc}", invoice: "invoice", offer: "quote",
          prev: "← Previous", next: "Next →", close: "Close", preview: "Preview of design {name}" }
  };

  var state = { set: "a", doc: "invoice", accent: "#2d2d6b", open: 0 };
  var styleTag = document.createElement("style");
  document.head.appendChild(styleTag);
  var lb = document.getElementById("ig-lb");
  var stage = document.getElementById("ig-lb-stage");

  function lang() { return (window.SUMIT_LANG || document.documentElement.lang || "nl").slice(0, 2) === "en" ? "en" : "nl"; }
  function tr(key, vars) {
    var s = UI[lang()][key];
    Object.keys(vars || {}).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function skins() { return API.sets[state.set]; }
  function nameOf(skin) { return lang() === "en" ? (NAMES_EN[skin.id] || skin.name) : skin.name; }
  function tagOf(skin) { return lang() === "en" ? (TAGS_EN[skin.tag] || skin.tag) : skin.tag; }

  /* One A4 page: spine (invoice = striped, quote = solid) + the skin's HTML. */
  function page(skin, m) {
    var out = skin.render(m);
    var host = document.createElement("div");
    host.className = "ig-page skin-" + skin.id;
    var tok = API.accentTokens(state.accent);
    Object.keys(tok).forEach(function (k) { host.style.setProperty(k, tok[k]); });
    var mark = document.createElement("div");
    mark.className = "docmark " + (m.isOffer ? "offer" : "invoice");
    mark.innerHTML = '<i class="glyph"></i><span class="word">' + API.esc(m.title) + "</span>";
    var body = document.createElement("div");
    body.className = "docbody";
    body.innerHTML = out.html; /* built by the style engine from escaped sample data */
    host.appendChild(mark);
    host.appendChild(body);
    return { node: host, css: out.css.replace(/\.p(\d+)\b/g, ".skin-" + skin.id + " .p$1") };
  }

  /* A few designs run slightly taller than A4 with long content. Shrink the
     content to fit the page so the payment block and terms stay visible. */
  function shrinkToFit(pg) {
    var body = pg.querySelector(".docbody");
    var inner = body && body.firstElementChild;
    if (!inner) return;
    inner.style.zoom = "";
    var over = body.scrollHeight / body.clientHeight;
    if (over > 1.002) inner.style.zoom = String(Math.max(0.8, 1 / over));
  }

  function build() {
    var list = skins(), m = API.model(state.doc, lang()), css = [];
    grid.textContent = "";
    list.forEach(function (skin, i) {
      var li = document.createElement("li");
      li.className = "ig-item";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ig-thumb";
      btn.dataset.i = String(i);
      btn.setAttribute("aria-label", tr("enlarge", { name: nameOf(skin) }));
      var built = page(skin, m);
      built.node.setAttribute("aria-hidden", "true");
      css.push(built.css);
      btn.appendChild(built.node);
      li.appendChild(btn);
      var meta = document.createElement("div");
      meta.className = "ig-meta";
      meta.innerHTML = '<span class="no">' + String(i + 1).padStart(2, "0") + "</span>";
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = nameOf(skin);
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = tagOf(skin);
      meta.appendChild(nm);
      meta.appendChild(tag);
      li.appendChild(meta);
      grid.appendChild(li);
    });
    styleTag.textContent = css.join("\n");
    grid.querySelectorAll(".ig-page").forEach(shrinkToFit);
    document.getElementById("ig-count").textContent = tr("count", { n: list.length, set: SERIES[state.set][lang()], doc: tr(state.doc) });
    fit();
  }

  function fit() {
    grid.querySelectorAll(".ig-thumb").forEach(function (t) {
      var pg = t.querySelector(".ig-page");
      if (pg && t.clientWidth) pg.style.transform = "scale(" + (t.clientWidth / A4_W) + ")";
    });
    var pg = stage.querySelector(".ig-page");
    if (pg) {
      var s = Math.min(1, Math.min(860, window.innerWidth - 32) / A4_W);
      pg.style.transform = "scale(" + s + ")";
      stage.style.width = A4_W * s + "px";
      stage.style.height = A4_H * s + "px";
    }
  }

  /* ---------- full-size preview ---------- */

  function openLb(i) {
    var list = skins();
    state.open = ((i % list.length) + list.length) % list.length;
    var skin = list[state.open];
    var built = page(skin, API.model(state.doc, lang()));
    styleTag.textContent += "\n" + built.css;
    stage.textContent = "";
    stage.appendChild(built.node);
    shrinkToFit(built.node);
    stage.setAttribute("aria-label", tr("preview", { name: nameOf(skin) }));
    document.getElementById("ig-lb-no").textContent = String(state.open + 1).padStart(2, "0");
    document.getElementById("ig-lb-name").textContent = nameOf(skin) + " · " + tagOf(skin);
    document.getElementById("ig-lb-prev").textContent = tr("prev");
    document.getElementById("ig-lb-next").textContent = tr("next");
    document.getElementById("ig-lb-close").textContent = tr("close");
    if (!lb.open) { lb.showModal(); document.getElementById("ig-lb-close").focus(); }
    fit();
  }

  grid.addEventListener("click", function (e) {
    var t = e.target.closest(".ig-thumb");
    if (t) openLb(Number(t.dataset.i));
  });
  document.getElementById("ig-lb-close").addEventListener("click", function () { lb.close(); });
  document.getElementById("ig-lb-prev").addEventListener("click", function () { openLb(state.open - 1); });
  document.getElementById("ig-lb-next").addEventListener("click", function () { openLb(state.open + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("ig-lb-in")) lb.close(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.open) return;
    if (e.key === "ArrowLeft") openLb(state.open - 1);
    if (e.key === "ArrowRight") openLb(state.open + 1);
  });

  /* ---------- controls ---------- */

  function rebuild() { build(); if (lb.open) openLb(state.open); }

  function wireSeg(id, key) {
    var el = document.getElementById(id);
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      state[key] = b.dataset.v;
      el.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (key === "set") state.open = 0;
      rebuild();
    });
  }
  wireSeg("ig-set", "set");
  wireSeg("ig-doc", "doc");

  var sw = document.getElementById("ig-sw");
  var custom = document.getElementById("ig-sw-custom");
  function setAccent(hex, preset) {
    state.accent = hex;
    custom.value = hex;
    sw.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === preset)); });
    rebuild();
  }
  sw.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) setAccent(b.dataset.c, b);
  });
  custom.addEventListener("input", function () { setAccent(custom.value, null); });

  document.addEventListener("langchange", rebuild);
  var resizeTimer = null;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 80); });
  /* Web fonts change text metrics; refit once they are ready. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    document.querySelectorAll(".ig-page").forEach(shrinkToFit);
    fit();
  });

  build();
})(window, document);
