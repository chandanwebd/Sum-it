/* Sum-IT blog editor (beheer.html → Blog tab).
 *
 * Keeps the existing contract with beheer.html: boot() calls loadPosts();
 * uses the page globals SB (Supabase client), MYEMAIL and esc() at call time.
 * Requires Quill 2 (window.Quill) and /blog/blocks.js (window.SumitBlocks).
 *
 * Saving writes the structured blocks AND a generated body_html, so existing
 * readers of body_html keep working. Before supabase-setup-v5.sql has been run
 * the new columns are missing: the editor then saves only the legacy columns.
 */
(function (window, document) {
  "use strict";

  var CATEGORIES = [
    ["belasting", "Belasting & geld"],
    ["projecten", "Projecten, offertes & geld"],
    ["samenwerken", "Samenwerken & netwerk"],
    ["basis", "Starten & administratie"],
    ["sum-it", "Sum-IT & vergelijken"]
  ];
  var CAT_LABEL = {};
  CATEGORIES.forEach(function (c) { CAT_LABEL[c[0]] = c[1]; });
  var MAX_UPLOAD = 5 * 1024 * 1024;
  var QUILL_FORMATS = ["bold", "italic", "underline", "link", "header", "list", "indent", "blockquote", "align"];
  var TOOLBAR = [[{ header: [2, 3, false] }], ["bold", "italic", "underline"], ["link"], [{ list: "ordered" }, { list: "bullet" }], ["blockquote"], [{ align: [] }], ["clean"]];
  var TOOL_LABELS = {
    bold: "Vet", italic: "Cursief", underline: "Onderstrepen", link: "Link", blockquote: "Citaat",
    clean: "Opmaak wissen", "list:ordered": "Genummerde lijst", "list:bullet": "Opsomming"
  };

  var S = {
    editSlug: null,     /* slug of the post being edited (null = new) */
    original: null,     /* row as loaded */
    blocks: [],         /* [{id, type, data}] */
    quills: {},         /* block id -> Quill */
    legacySchema: false,
    dirty: false,
    previewTimer: null,
    dragId: null
  };

  function $(id) { return document.getElementById(id); }
  function h(tag, props, children) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function uid() { return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function slugify(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function setMsg(kind, text) {
    $("b-err").textContent = kind === "err" ? text : "";
    $("b-ok").textContent = kind === "ok" ? text : "";
  }
  function markDirty() {
    S.dirty = true;
    schedulePreview();
  }

  /* ---------- field helpers ---------- */

  var fieldSeq = 0;
  function field(label, input, hint) {
    var id = input.id || ("bf" + (++fieldSeq));
    input.id = id;
    return h("div", { class: "be-field" }, [
      h("label", { for: id, text: label }),
      input,
      hint ? h("small", { class: "be-hint", text: hint }) : null
    ]);
  }
  function textInput(value, onChange, attrs) {
    var i = h("input", Object.assign({ type: "text", value: value || "" }, attrs || {}));
    i.addEventListener("input", function () { onChange(i.value); markDirty(); });
    return i;
  }
  function textArea(value, onChange, rows) {
    var t = h("textarea", { rows: rows || 3 });
    t.value = value || "";
    t.addEventListener("input", function () { onChange(t.value); markDirty(); });
    return t;
  }
  function select(options, value, onChange) {
    var s = h("select");
    options.forEach(function (o) {
      var opt = h("option", { value: o[0], text: o[1] });
      if (String(o[0]) === String(value)) opt.selected = true;
      s.appendChild(opt);
    });
    s.addEventListener("change", function () { onChange(s.value); markDirty(); });
    return s;
  }

  /* Image picker: URL field + upload to Supabase Storage + alt (+ optional caption). */
  function imagePicker(obj, keys, opts) {
    keys = keys || { url: "url", alt: "alt", caption: "caption" };
    opts = opts || {};
    var changed = opts.onChange || function () {};
    var thumb = h("div", { class: "be-thumb" });
    function refreshThumb() {
      thumb.textContent = "";
      var src = SumitBlocks.safeUrl(obj[keys.url], true);
      if (src) thumb.appendChild(h("img", { src: src, alt: "" }));
      else thumb.appendChild(h("span", { text: "Geen afbeelding" }));
    }
    var url = textInput(obj[keys.url], function (v) { obj[keys.url] = v.trim(); refreshThumb(); changed(); }, { type: "url", placeholder: "https://… of /pad/naar/afbeelding.jpg", inputmode: "url" });
    var file = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif,image/avif", class: "sr-only", tabindex: "-1" });
    var status = h("small", { class: "be-hint", role: "status" });
    var upBtn = h("button", { type: "button", class: "mini", text: "Uploaden…", onclick: function () { file.click(); } });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      upBtn.disabled = true;
      status.textContent = "Bezig met uploaden…";
      upload(f).then(function (publicUrl) {
        obj[keys.url] = publicUrl;
        url.value = publicUrl;
        refreshThumb();
        changed();
        markDirty();
        status.textContent = "Geüpload.";
      }, function (err) {
        status.textContent = err.message;
      }).then(function () { upBtn.disabled = false; });
    });
    var alt = textInput(obj[keys.alt], function (v) { obj[keys.alt] = v; changed(); }, { placeholder: "Wat is er te zien?" });
    var parts = [
      field(opts.urlLabel || "Afbeelding", url),
      h("div", { class: "be-row" }, [upBtn, status]),
      file,
      field("Alt-tekst", alt, "Beschrijf de afbeelding voor wie hem niet kan zien. Verplicht.")
    ];
    if (keys.caption) parts.push(field("Onderschrift (optioneel)", textInput(obj[keys.caption], function (v) { obj[keys.caption] = v; })));
    refreshThumb();
    return h("div", { class: "be-img" }, [thumb, h("div", { class: "be-img-fields" }, parts)]);
  }

  function upload(f) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(f.type)) return reject(new Error("Alleen JPG, PNG, WebP, GIF of AVIF."));
      if (f.size > MAX_UPLOAD) return reject(new Error("Bestand is groter dan 5 MB."));
      var ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      var d = new Date();
      var base = slugify($("p-slug").value || $("p-title").value || "concept") || "concept";
      var path = d.getFullYear() + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + base + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      window.SB.storage.from("blog-images").upload(path, f, { cacheControl: "31536000", upsert: false, contentType: f.type })
        .then(function (r) {
          if (r.error) {
            var m = r.error.message || "";
            if (/bucket/i.test(m) && /not found/i.test(m)) m = "De opslagmap 'blog-images' bestaat nog niet. Voer supabase-setup-v5.sql uit.";
            return reject(new Error("Uploaden mislukt: " + m));
          }
          resolve(window.SB.storage.from("blog-images").getPublicUrl(path).data.publicUrl);
        }, function (e) { reject(new Error("Uploaden mislukt: " + (e && e.message || "netwerkfout"))); });
    });
  }

  /* ---------- block bodies ---------- */

  function richText(block) {
    var host = h("div", { class: "be-quill" });
    var wrap = h("div", { class: "be-rich" }, [host]);
    /* Quill needs to be in the document before it measures anything. */
    setTimeout(function () {
      var q = new window.Quill(host, {
        theme: "snow",
        formats: QUILL_FORMATS,
        placeholder: "Schrijf hier… (kopjes, lijstjes, links en citaten via de werkbalk)",
        modules: { toolbar: TOOLBAR }
      });
      if (block.data.ops && block.data.ops.length) q.setContents(block.data.ops, "silent");
      q.on("text-change", function () {
        block.data = { format: "quill-delta", ops: q.getContents().ops };
        markDirty();
      });
      var tb = wrap.querySelector(".ql-toolbar");
      if (tb) {
        tb.setAttribute("role", "toolbar");
        tb.setAttribute("aria-label", "Opmaak");
        tb.querySelectorAll("button").forEach(function (b) {
          var fmt = (b.className.match(/ql-([a-z]+)/) || [])[1];
          var key = b.value ? fmt + ":" + b.value : fmt;
          if (TOOL_LABELS[key]) b.setAttribute("aria-label", TOOL_LABELS[key]);
        });
      }
      q.root.setAttribute("aria-label", "Tekst van dit blok");
      S.quills[block.id] = q;
    }, 0);
    return wrap;
  }

  var BODIES = {
    rich_text: richText,
    heading: function (b) {
      return h("div", { class: "be-grid2" }, [
        field("Niveau", select([[2, "H2 — tussenkop"], [3, "H3 — subkop"]], b.data.level || 2, function (v) { b.data.level = +v; })),
        field("Tekst", textInput(b.data.text, function (v) { b.data.text = v; }))
      ]);
    },
    image: function (b) {
      return h("div", null, [
        imagePicker(b.data),
        field("Breedte", select([["default", "Tekstbreedte"], ["wide", "Breed"]], b.data.align || "default", function (v) { b.data.align = v; }))
      ]);
    },
    two_images: function (b) {
      b.data.images = b.data.images || [{}, {}];
      while (b.data.images.length < 2) b.data.images.push({ url: "", alt: "", caption: "" });
      return h("div", { class: "be-grid2" }, [
        h("div", null, [h("p", { class: "be-sub", text: "Afbeelding 1" }), imagePicker(b.data.images[0])]),
        h("div", null, [h("p", { class: "be-sub", text: "Afbeelding 2" }), imagePicker(b.data.images[1])])
      ]);
    },
    quote: function (b) {
      return h("div", null, [
        field("Citaat", textArea(b.data.text, function (v) { b.data.text = v; }, 3)),
        field("Bron / naam (optioneel)", textInput(b.data.author, function (v) { b.data.author = v; }))
      ]);
    },
    image_text: function (b) {
      return h("div", null, [
        imagePicker(b.data, { url: "url", alt: "alt" }),
        field("Titel", textInput(b.data.title, function (v) { b.data.title = v; })),
        field("Tekst", textArea(b.data.text, function (v) { b.data.text = v; }, 4), "Lege regel = nieuwe alinea."),
        field("Afbeelding staat", select([["left", "Links"], ["right", "Rechts"]], b.data.position || "left", function (v) { b.data.position = v; }))
      ]);
    }
  };

  /* ---------- block list ---------- */

  function indexOf(id) {
    for (var i = 0; i < S.blocks.length; i++) if (S.blocks[i].id === id) return i;
    return -1;
  }
  function labelOf(type) {
    var t = SumitBlocks.types().filter(function (x) { return x.type === type; })[0];
    return t ? t.label : type;
  }

  function buildBlock(block) {
    var li = h("li", { class: "be-block", "data-id": block.id });
    var body = BODIES[block.type];
    var grip = h("span", { class: "be-grip", title: "Sleep om te verplaatsen", "aria-hidden": "true", text: "⋮⋮" });
    grip.addEventListener("mousedown", function () { li.draggable = true; });
    var head = h("div", { class: "be-bhead" }, [
      grip,
      h("strong", { class: "be-btype", text: labelOf(block.type) }),
      h("span", { class: "be-pos" }),
      h("span", { class: "sp" }),
      h("button", { type: "button", class: "icon", "aria-label": "Blok omhoog", title: "Omhoog", text: "↑", onclick: function () { move(block.id, -1); } }),
      h("button", { type: "button", class: "icon", "aria-label": "Blok omlaag", title: "Omlaag", text: "↓", onclick: function () { move(block.id, 1); } }),
      h("button", { type: "button", class: "icon", "aria-label": "Blok dupliceren", title: "Dupliceren", text: "⧉", onclick: function () { duplicate(block.id); } }),
      h("button", { type: "button", class: "icon danger", "aria-label": "Blok verwijderen", title: "Verwijderen", text: "✕", onclick: function () { remove(block.id); } })
    ]);
    li.appendChild(head);
    li.appendChild(h("div", { class: "be-bbody" }, [body ? body(block) : h("p", { class: "be-hint", text: "Dit bloktype wordt nog niet ondersteund in de editor; het blijft ongewijzigd bewaard." })]));

    li.addEventListener("dragstart", function (e) {
      S.dragId = block.id;
      li.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", block.id); } catch (err) {}
    });
    li.addEventListener("dragend", function () {
      li.draggable = false;
      li.classList.remove("is-dragging");
      S.dragId = null;
      document.querySelectorAll(".be-block.drop-before,.be-block.drop-after").forEach(function (n) { n.classList.remove("drop-before", "drop-after"); });
    });
    li.addEventListener("dragover", function (e) {
      if (!S.dragId || S.dragId === block.id) return;
      e.preventDefault();
      var r = li.getBoundingClientRect();
      var after = e.clientY > r.top + r.height / 2;
      li.classList.toggle("drop-after", after);
      li.classList.toggle("drop-before", !after);
    });
    li.addEventListener("dragleave", function () { li.classList.remove("drop-before", "drop-after"); });
    li.addEventListener("drop", function (e) {
      if (!S.dragId || S.dragId === block.id) return;
      e.preventDefault();
      var after = li.classList.contains("drop-after");
      li.classList.remove("drop-before", "drop-after");
      var from = indexOf(S.dragId);
      var moved = S.blocks.splice(from, 1)[0];
      var to = indexOf(block.id) + (after ? 1 : 0);
      S.blocks.splice(to, 0, moved);
      var node = document.querySelector('.be-block[data-id="' + moved.id + '"]');
      $("be-blocks").insertBefore(node, after ? li.nextSibling : li);
      afterStructureChange();
    });
    return li;
  }

  function afterStructureChange() {
    var list = $("be-blocks");
    var items = list.querySelectorAll(":scope > .be-block");
    items.forEach(function (li, i) {
      li.querySelector(".be-pos").textContent = "blok " + (i + 1) + " van " + items.length;
      li.querySelector('[aria-label="Blok omhoog"]').disabled = i === 0;
      li.querySelector('[aria-label="Blok omlaag"]').disabled = i === items.length - 1;
    });
    $("be-empty").hidden = items.length > 0;
    markDirty();
  }

  function renderBlocks() {
    var list = $("be-blocks");
    list.textContent = "";
    S.quills = {};
    S.blocks.forEach(function (b) { list.appendChild(buildBlock(b)); });
    afterStructureChange();
    S.dirty = false;
  }

  function insertBlock(block, index) {
    var list = $("be-blocks");
    S.blocks.splice(index, 0, block);
    var node = buildBlock(block);
    list.insertBefore(node, list.children[index] || null);
    afterStructureChange();
    return node;
  }

  function add(type) {
    var node = insertBlock(SumitBlocks.create(type), S.blocks.length);
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(function () {
      var q = S.quills[node.dataset.id];
      if (q) q.focus();
      else { var f = node.querySelector(".be-bbody input, .be-bbody textarea, .be-bbody select"); if (f) f.focus(); }
    }, 60);
  }

  function duplicate(id) {
    var i = indexOf(id);
    var copy = { id: uid(), type: S.blocks[i].type, data: clone(S.blocks[i].data) };
    var node = insertBlock(copy, i + 1);
    node.querySelector('[aria-label="Blok dupliceren"]').focus();
  }

  function move(id, dir) {
    var i = indexOf(id), j = i + dir;
    if (j < 0 || j >= S.blocks.length) return;
    var b = S.blocks.splice(i, 1)[0];
    S.blocks.splice(j, 0, b);
    var list = $("be-blocks");
    var node = list.querySelector('.be-block[data-id="' + id + '"]');
    var ref = list.children[j + (dir > 0 ? 1 : 0)];
    list.insertBefore(node, dir > 0 ? (ref || null) : list.children[j]);
    afterStructureChange();
    var btn = node.querySelector(dir < 0 ? '[aria-label="Blok omhoog"]' : '[aria-label="Blok omlaag"]');
    (btn.disabled ? node.querySelector(dir < 0 ? '[aria-label="Blok omlaag"]' : '[aria-label="Blok omhoog"]') : btn).focus();
  }

  function hasContent(b) {
    return SumitBlocks.text({ blocks: [b] }).trim() || (b.data && (b.data.url || (b.data.images || []).some(function (x) { return x.url; })));
  }

  function remove(id) {
    var i = indexOf(id);
    if (hasContent(S.blocks[i]) && !window.confirm("Dit blok en de inhoud ervan verwijderen?")) return;
    S.blocks.splice(i, 1);
    delete S.quills[id];
    var node = document.querySelector('.be-block[data-id="' + id + '"]');
    var next = node.nextElementSibling || node.previousElementSibling;
    node.remove();
    afterStructureChange();
    var focusTarget = next ? next.querySelector(".be-bhead button") : $("be-add-btn");
    if (focusTarget) focusTarget.focus();
  }

  /* ---------- add-block menu ---------- */

  function buildAddMenu() {
    var menu = $("be-add-menu");
    menu.textContent = "";
    SumitBlocks.types().forEach(function (t) {
      menu.appendChild(h("button", { type: "button", role: "menuitem", class: "be-menuitem", "data-type": t.type, onclick: function () { closeMenu(); add(t.type); } }, [
        h("strong", { text: t.label }), h("small", { text: t.hint || "" })
      ]));
    });
  }
  function openMenu() {
    var menu = $("be-add-menu"), btn = $("be-add-btn");
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    var first = menu.querySelector("button");
    if (first) first.focus();
  }
  function closeMenu(focusBtn) {
    var menu = $("be-add-menu"), btn = $("be-add-btn");
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (focusBtn) btn.focus();
  }

  /* ---------- preview ---------- */

  function content() {
    return { version: SumitBlocks.VERSION, blocks: S.blocks.map(function (b) { return { id: b.id, type: b.type, data: b.data }; }) };
  }

  function schedulePreview() {
    clearTimeout(S.previewTimer);
    S.previewTimer = setTimeout(renderPreview, 200);
  }
  function renderPreview() {
    var pv = $("pv");
    if (!pv) return;
    pv.textContent = "";
    var cover = SumitBlocks.safeUrl($("p-cover").value, true);
    if (cover) pv.appendChild(h("img", { class: "be-pv-cover", src: cover, alt: $("p-cover-alt").value || "" }));
    pv.appendChild(h("h1", { class: "be-pv-title", text: $("p-title").value || "Titel" }));
    if ($("p-desc").value) pv.appendChild(h("p", { class: "article-lead", text: $("p-desc").value }));
    var body = h("div", { class: "article-body" });
    SumitBlocks.render(content(), body);
    pv.appendChild(body);
  }

  function openPreviewTab() {
    try {
      localStorage.setItem("sumit_blog_preview", JSON.stringify(row(true, true)));
    } catch (e) { setMsg("err", "Voorbeeld openen lukt niet in deze browser."); return; }
    window.open("/blog/post.html?preview=1", "_blank", "noopener");
  }

  /* ---------- load / new / save / delete ---------- */

  function readTags() {
    return $("p-tags").value.split(",").map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean)
      .filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 10);
  }

  function row(pub, forPreview) {
    var c = content();
    var r = {
      slug: $("p-slug").value.trim(),
      title: $("p-title").value.trim(),
      description: $("p-desc").value.trim(),
      body_html: SumitBlocks.toHTML(c),
      published: pub,
      author: window.MYEMAIL
    };
    if (!S.legacySchema || forPreview) {
      var dateVal = $("p-date").value;
      var existing = S.original && S.original.published_at;
      r.blocks = c;
      r.category = $("p-cat").value || null;
      r.cover_image = $("p-cover").value.trim() || null;
      r.cover_alt = $("p-cover-alt").value.trim();
      r.tags = readTags();
      r.author_name = $("p-author").value.trim() || null;
      r.published_at = dateVal ? new Date(dateVal + "T09:00:00").toISOString() : (existing || (pub ? new Date().toISOString() : null));
      r.meta_title = $("p-mtitle").value.trim() || null;
      r.meta_description = $("p-mdesc").value.trim() || null;
    }
    return r;
  }

  function validate(r) {
    if (!r.slug || !r.title) return "Titel en slug zijn verplicht.";
    if (!/^[a-z0-9-]{3,80}$/.test(r.slug)) return "Slug mag alleen kleine letters, cijfers en streepjes bevatten (3–80 tekens).";
    if ($("p-cover").value.trim() && !$("p-cover-alt").value.trim()) return "Geef de omslagafbeelding een alt-tekst.";
    for (var i = 0; i < S.blocks.length; i++) {
      var b = S.blocks[i], d = b.data || {};
      var imgs = b.type === "two_images" ? (d.images || []) : (d.url !== undefined ? [d] : []);
      for (var k = 0; k < imgs.length; k++) {
        if (imgs[k].url && !SumitBlocks.safeUrl(imgs[k].url, true)) return "Blok " + (i + 1) + ": de afbeeldings-URL moet met https:// of / beginnen.";
        if (imgs[k].url && !String(imgs[k].alt || "").trim()) return "Blok " + (i + 1) + " (" + labelOf(b.type) + "): alt-tekst ontbreekt.";
      }
    }
    return "";
  }

  function fillForm(p) {
    $("p-title").value = p.title || "";
    $("p-slug").value = p.slug || "";
    $("p-slug").readOnly = !!S.editSlug;
    $("p-slug-hint").textContent = S.editSlug ? "De URL ligt vast zodra een post bestaat, zodat links blijven werken." : "Wordt automatisch gevuld vanuit de titel.";
    $("p-desc").value = p.description || "";
    $("p-cat").value = p.category || "";
    $("p-author").value = p.author_name || "";
    $("p-tags").value = (p.tags || []).join(", ");
    $("p-date").value = p.published_at ? String(p.published_at).slice(0, 10) : "";
    $("p-cover").value = p.cover_image || "";
    $("p-cover-alt").value = p.cover_alt || "";
    $("p-mtitle").value = p.meta_title || "";
    $("p-mdesc").value = p.meta_description || "";
    coverPicker();
    counters();
    $("p-status").textContent = S.editSlug ? (p.published ? "Live" : "Concept") : "Nieuw";
    $("p-status").className = "pill " + (S.editSlug ? (p.published ? "ok" : "pend") : "pend");
  }

  function confirmDiscard() {
    return !S.dirty || window.confirm("Je hebt niet-opgeslagen wijzigingen. Doorgaan zonder op te slaan?");
  }

  function openEditor() {
    $("editor").classList.remove("hide");
    $("p-del").classList.toggle("hide", !S.editSlug);
    setMsg();
    renderPreview();
  }

  function newPost() {
    if (!confirmDiscard()) return;
    S.editSlug = null;
    S.original = null;
    S.blocks = [SumitBlocks.create("rich_text")];
    fillForm({});
    renderBlocks();
    openEditor();
    $("editor").scrollIntoView({ behavior: "smooth", block: "start" });
    $("p-title").focus({ preventScroll: true });
  }

  function editPost(slug) {
    if (!confirmDiscard()) return;
    window.SB.from("blog_posts").select("*").eq("slug", slug).single().then(function (r) {
      if (r.error) { setMsg("err", "Laden mislukt: " + r.error.message); return; }
      var p = r.data;
      S.editSlug = slug;
      S.original = p;
      var existing = SumitBlocks.normalize(p.blocks);
      var note = "";
      if (existing.length) {
        S.blocks = clone(existing);
      } else if (p.body_html && p.body_html.trim()) {
        /* Legacy HTML post: convert once into a rich-text block (only supported formats survive). */
        var tmp = new window.Quill(document.createElement("div"), { formats: QUILL_FORMATS });
        var html = p.body_html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, "");
        S.blocks = [{ id: uid(), type: "rich_text", data: { format: "quill-delta", ops: tmp.clipboard.convert({ html: html }).ops } }];
        note = "Deze post had nog HTML-inhoud en is omgezet naar een tekstblok. Controleer de inhoud voordat je opslaat.";
      } else {
        S.blocks = [SumitBlocks.create("rich_text")];
      }
      fillForm(p);
      renderBlocks();
      openEditor();
      if (note) setMsg("ok", note);
      $("editor").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function savePost(pub) {
    setMsg();
    var r = row(pub, false);
    var problem = validate(r);
    if (problem) { setMsg("err", problem); return; }
    var buttons = document.querySelectorAll("#be-actions button");
    buttons.forEach(function (b) { b.disabled = true; });
    var q = S.editSlug
      ? window.SB.from("blog_posts").update(r).eq("slug", S.editSlug).select().single()
      : window.SB.from("blog_posts").insert(r).select().single();
    q.then(function (res) {
      if (res.error) {
        var m = res.error.message;
        if (res.error.code === "23505") m = "Er bestaat al een post met deze slug. Kies een andere.";
        setMsg("err", "Opslaan mislukt: " + m);
        return;
      }
      S.editSlug = r.slug;
      S.original = res.data || r;
      S.dirty = false;
      fillForm(S.original);
      $("p-del").classList.remove("hide");
      var extra = S.legacySchema ? " (Let op: alleen titel, omschrijving en inhoud zijn bewaard; voer supabase-setup-v5.sql uit voor categorie, afbeeldingen en tags.)" : "";
      setMsg("ok", (pub ? "Opgeslagen en live!" : "Opgeslagen als concept.") + extra);
      loadPosts();
    }).then(function () { buttons.forEach(function (b) { b.disabled = false; }); });
  }

  function delPost() {
    if (!S.editSlug) return;
    if (!window.confirm('Post "' + S.editSlug + '" definitief verwijderen?')) return;
    window.SB.from("blog_posts").delete().eq("slug", S.editSlug).then(function (r) {
      if (r.error) { setMsg("err", r.error.message); return; }
      S.editSlug = null;
      S.dirty = false;
      $("editor").classList.add("hide");
      loadPosts();
    });
  }

  function loadPosts() {
    var el = $("postlist");
    function query(cols) { return window.SB.from("blog_posts").select(cols).order("updated_at", { ascending: false }); }
    query("slug,title,published,updated_at,category").then(function (r) {
      if (r.error && r.error.code === "42703") {
        S.legacySchema = true;
        return query("slug,title,published,updated_at");
      }
      S.legacySchema = false;
      return r;
    }).then(function (r) {
      $("be-schema").classList.toggle("hide", !S.legacySchema);
      document.querySelectorAll(".be-needs-v5").forEach(function (n) { n.classList.toggle("is-disabled", S.legacySchema); });
      if (r.error) { el.innerHTML = '<div class="err">Laden mislukt: ' + window.esc(r.error.message) + "</div>"; return; }
      el.textContent = "";
      if (!r.data || !r.data.length) {
        el.appendChild(h("div", { class: "be-hint", text: "Nog geen CMS-posts. De vaste artikelen op /blog/ blijven gewoon bestaan." }));
        return;
      }
      r.data.forEach(function (p) {
        el.appendChild(h("div", { class: "postrow" }, [
          h("b", { text: p.title }),
          h("small", { text: (p.category ? CAT_LABEL[p.category] + " · " : "") + "/blog/post.html?slug=" + p.slug }),
          h("span", { class: "pill " + (p.published ? "ok" : "pend"), text: p.published ? "live" : "concept" }),
          h("span", { class: "sp" }),
          h("a", { class: "mini", target: "_blank", rel: "noopener", href: "/blog/post.html?slug=" + encodeURIComponent(p.slug), text: "Bekijk" }),
          h("button", { class: "mini", type: "button", text: "Bewerk", onclick: function () { editPost(p.slug); } })
        ]));
      });
    });
  }

  /* ---------- form wiring ---------- */

  function coverPicker() {
    var holder = $("p-cover-picker");
    holder.textContent = "";
    var proxy = { url: $("p-cover").value, alt: $("p-cover-alt").value };
    /* The picker edits a proxy object; mirror it into the hidden fields read by row(). */
    holder.appendChild(imagePicker(proxy, { url: "url", alt: "alt" }, {
      urlLabel: "Omslagafbeelding",
      onChange: function () { $("p-cover").value = proxy.url || ""; $("p-cover-alt").value = proxy.alt || ""; }
    }));
  }

  function counters() {
    [["p-desc", 180], ["p-mtitle", 60], ["p-mdesc", 160]].forEach(function (c) {
      var i = $(c[0]), out = $(c[0] + "-count");
      if (out) out.textContent = i.value.length + " / " + c[1];
    });
  }

  function wire() {
    var cat = $("p-cat");
    cat.appendChild(h("option", { value: "", text: "— Kies een categorie —" }));
    CATEGORIES.forEach(function (c) { cat.appendChild(h("option", { value: c[0], text: c[1] })); });

    ["p-title", "p-slug", "p-desc", "p-cat", "p-author", "p-tags", "p-date", "p-mtitle", "p-mdesc"].forEach(function (id) {
      $(id).addEventListener("input", function () { counters(); markDirty(); });
      $(id).addEventListener("change", markDirty);
    });
    $("p-title").addEventListener("input", function () { if (!S.editSlug) $("p-slug").value = slugify($("p-title").value); });

    $("be-new").addEventListener("click", newPost);
    $("be-save").addEventListener("click", function () { savePost(false); });
    $("be-publish").addEventListener("click", function () { savePost(true); });
    $("be-preview").addEventListener("click", openPreviewTab);
    $("p-del").addEventListener("click", delPost);

    buildAddMenu();
    $("be-add-btn").addEventListener("click", function () { $("be-add-menu").hidden ? openMenu() : closeMenu(true); });
    $("be-add-menu").addEventListener("keydown", function (e) {
      var items = Array.prototype.slice.call(this.querySelectorAll("button"));
      var i = items.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
      else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest || !e.target.closest(".be-add")) closeMenu(false);
    });

    window.addEventListener("beforeunload", function (e) {
      if (S.dirty && !$("editor").classList.contains("hide")) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  window.loadPosts = loadPosts;
  window.newPost = newPost;
  window.editPost = editPost;
  window.BlogEditor = { state: S, add: add, move: move, duplicate: duplicate, remove: remove, content: content, row: row, validate: validate };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})(window, document);
