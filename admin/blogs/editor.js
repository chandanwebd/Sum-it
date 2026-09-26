/* Sum-IT blog editor — /admin/blogs/new/ and /admin/blogs/edit/?slug=<slug>.
 *
 * Requires: admin.js (SumitAdmin), store.js (SumitBlogStore), Quill 2
 * (window.Quill) and /blog/blocks.js (window.SumitBlocks).
 *
 * Content is stored as structured blocks ({"version":1,"blocks":[...]}), plus
 * a generated body_html so older readers keep working. Fields whose columns
 * don't exist yet (see store.js levels) are shown disabled with a note.
 */
(function (window, document) {
  "use strict";

  var Store = window.SumitBlogStore;
  var I18N = window.SumitAdminI18n;
  function t(k, v) { return I18N ? I18N.t(k, v) : k; }
  function tx(str) { return String(str).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CATEGORIES = ["belasting", "projecten", "samenwerken", "basis", "sum-it"];
  var MAX_UPLOAD = 5 * 1024 * 1024;
  var MAX_TAGS = 10;
  var QUILL_FORMATS = ["bold", "italic", "underline", "link", "header", "list", "indent", "blockquote", "align"];
  var TOOL_LABELS = {
    bold: "rt.bold", italic: "rt.italic", underline: "rt.underline", link: "rt.link", blockquote: "rt.quote",
    clean: "rt.clean", "list:ordered": "rt.ol", "list:bullet": "rt.ul", image: "rt.image", undo: "rt.undo", redo: "rt.redo"
  };
  var ICONS = {
    undo: '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="ql-stroke" fill="none" d="M5 7h7a3 3 0 010 6H8"/><path class="ql-stroke" fill="none" d="M7.5 4.5L5 7l2.5 2.5"/></svg>',
    redo: '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="ql-stroke" fill="none" d="M13 7H6a3 3 0 000 6h4"/><path class="ql-stroke" fill="none" d="M10.5 4.5L13 7l-2.5 2.5"/></svg>'
  };

  var S = {
    sb: null,
    email: "",
    editSlug: null,     /* slug of the post being edited (null = new) */
    original: null,     /* row as last loaded/saved */
    blocks: [],         /* [{id, type, data}] */
    quills: {},         /* block id -> Quill */
    tags: [],
    slugTaken: false,
    dirty: false,
    saving: false,
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
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
  }
  function setMsg(kind, text) {
    $("b-err").textContent = kind === "err" ? text : "";
    $("b-ok").textContent = kind === "ok" ? text : "";
  }
  function markDirty() {
    S.dirty = true;
    schedulePreview();
  }
  function isPublished() { return !!(S.original && S.original.published); }

  /* ---------- page markup ---------- */

  function template() {
    return '' +
      '<div class="adm-crumb"><a href="/admin/blogs/">' + tx(t("ed.back")) + '</a></div>' +
      '<div class="adm-head"><h1 id="be-title">' + tx(t("ed.new")) + '</h1><span class="pill pend" id="p-status">' + tx(t("ed.statusNew")) + '</span></div>' +
      '<div id="be-schema" class="be-banner" hidden></div>' +
      '<div class="be-layout">' +
      '<div class="be-main">' +
        '<section class="be-card" aria-labelledby="be-h-meta">' +
          '<h3 id="be-h-meta">' + tx(t("ed.article")) + '</h3>' +
          '<div class="be-field"><label for="p-title">' + tx(t("ed.title")) + ' <span aria-hidden="true">*</span></label><input type="text" id="p-title" maxlength="140" required aria-required="true"></div>' +
          '<div class="be-field"><label for="p-slug">' + tx(t("ed.slug")) + '</label><input type="text" id="p-slug" maxlength="80" autocomplete="off" spellcheck="false" aria-describedby="p-slug-hint"><small class="be-hint" id="p-slug-hint" aria-live="polite"></small></div>' +
          '<div class="be-field"><label for="p-desc">' + tx(t("ed.desc")) + ' <span class="be-count" id="p-desc-count"></span></label><textarea id="p-desc" rows="2" maxlength="180" aria-describedby="p-desc-hint"></textarea><small class="be-hint" id="p-desc-hint">' + tx(t("ed.descHint")) + '</small></div>' +
          '<div class="be-needs-v7 be-en">' +
            '<p class="be-sub">' + tx(t("ed.enSection")) + '</p>' +
            '<div class="be-field"><label for="p-title-en">' + tx(t("ed.titleEn")) + '</label><input type="text" id="p-title-en" maxlength="140" lang="en"></div>' +
            '<div class="be-field"><label for="p-desc-en">' + tx(t("ed.descEn")) + ' <span class="be-count" id="p-desc-en-count"></span></label><textarea id="p-desc-en" rows="2" maxlength="180" lang="en"></textarea><small class="be-hint">' + tx(t("ed.enHint")) + '</small></div>' +
          '</div>' +
          '<div class="be-needs-v5">' +
            '<div class="be-field"><label for="p-tags-input">' + tx(t("ed.keywords")) + '</label><div class="chips" id="p-tags"></div><small class="be-hint" id="p-tags-hint">' + tx(t("ed.keywordsHint", { max: MAX_TAGS })) + '</small></div>' +
            '<div class="be-grid2">' +
              '<div class="be-field"><label for="p-cat">' + tx(t("ed.category")) + '</label><select id="p-cat"></select></div>' +
              '<div class="be-field"><label for="p-author">' + tx(t("ed.author")) + '</label><input type="text" id="p-author" maxlength="60" placeholder="Sum-IT"></div>' +
              '<div class="be-field"><label for="p-date">' + tx(t("ed.date")) + '</label><input type="date" id="p-date"><small class="be-hint">' + tx(t("ed.dateHint")) + '</small></div>' +
            '</div>' +
          '</div>' +
          '<div class="be-needs-v6"><label class="be-toggle"><input type="checkbox" id="p-featured"> ' + tx(t("ed.featured")) + '</label></div>' +
        '</section>' +
        '<section class="be-card be-needs-v5" aria-labelledby="be-h-cover">' +
          '<h3 id="be-h-cover">' + tx(t("ed.cover")) + '</h3>' +
          '<input type="hidden" id="p-cover"><input type="hidden" id="p-cover-alt">' +
          '<div id="p-cover-picker"></div>' +
        '</section>' +
        '<section class="be-card" aria-labelledby="be-h-content">' +
          '<h3 id="be-h-content">' + tx(t("ed.content")) + '</h3>' +
          '<ol class="be-blocks" id="be-blocks" aria-label="' + tx(t("ed.blocks")) + '"></ol>' +
          '<p class="be-empty" id="be-empty" hidden>' + tx(t("ed.empty")) + '</p>' +
          '<div class="be-add">' +
            '<button type="button" class="be-add-btn" id="be-add-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="be-add-menu">' + tx(t("ed.addBlock")) + '</button>' +
            '<div class="be-add-menu" id="be-add-menu" role="menu" aria-label="' + tx(t("ed.pickBlock")) + '" hidden></div>' +
          '</div>' +
        '</section>' +
        '<details class="be-card be-needs-v5" id="be-seo">' +
          '<summary>' + tx(t("ed.seo")) + '</summary>' +
          '<div class="be-field"><label for="p-mtitle">' + tx(t("ed.seoTitle")) + ' <span class="be-count" id="p-mtitle-count"></span></label><input type="text" id="p-mtitle" maxlength="70"><small class="be-hint">' + tx(t("ed.seoTitleHint")) + '</small></div>' +
          '<div class="be-field"><label for="p-mdesc">' + tx(t("ed.seoDesc")) + ' <span class="be-count" id="p-mdesc-count"></span></label><textarea id="p-mdesc" rows="2" maxlength="170"></textarea><small class="be-hint">' + tx(t("ed.seoDescHint")) + '</small></div>' +
          '<div class="be-field be-needs-v6"><label for="p-canonical">' + tx(t("ed.canonical")) + '</label><input type="url" id="p-canonical" inputmode="url" placeholder="https://sum-it.eu/blog/…"><small class="be-hint">' + tx(t("ed.canonicalHint")) + '</small></div>' +
          '<div class="be-seo-preview" aria-label="' + tx(t("ed.googlePreview")) + '"><span class="u" id="seo-url"></span><span class="t" id="seo-title"></span><span class="d" id="seo-desc"></span></div>' +
        '</details>' +
        '<div class="be-actions" id="be-actions"></div>' +
        '<div class="err" id="b-err" role="alert"></div><div class="okmsg" id="b-ok" role="status"></div>' +
      '</div>' +
      '<aside class="be-preview" aria-label="' + tx(t("ed.preview")) + '">' +
        '<div class="be-preview-head"><strong>' + tx(t("ed.preview")) + '</strong><small class="be-hint">' + tx(t("ed.previewSub")) + '</small></div>' +
        '<div class="preview" id="pv"></div>' +
      '</aside>' +
      '</div>';
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
    var ta = h("textarea", { rows: rows || 3 });
    ta.value = value || "";
    ta.addEventListener("input", function () { onChange(ta.value); markDirty(); });
    return ta;
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

  /* Image picker: upload (Supabase Storage) or URL, preview, replace, remove, alt text. */
  function imagePicker(obj, keys, opts) {
    keys = keys || { url: "url", alt: "alt", caption: "caption" };
    opts = opts || {};
    var changed = opts.onChange || function () {};
    var thumb = h("div", { class: "be-thumb" });
    var url, upBtn, rmBtn;
    function refresh() {
      thumb.textContent = "";
      var src = SumitBlocks.safeUrl(obj[keys.url], true);
      if (src) thumb.appendChild(h("img", { src: src, alt: "" }));
      else thumb.appendChild(h("span", { text: t("img.none") }));
      upBtn.textContent = src ? t("img.replace") : t("img.upload");
      rmBtn.hidden = !obj[keys.url];
    }
    url = textInput(obj[keys.url], function (v) { obj[keys.url] = v.trim(); refresh(); changed(); }, { type: "url", placeholder: t("img.urlPh"), inputmode: "url" });
    var file = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif,image/avif", class: "sr-only", tabindex: "-1", "aria-hidden": "true" });
    var status = h("small", { class: "be-hint", role: "status" });
    upBtn = h("button", { type: "button", class: "mini", text: t("img.upload"), onclick: function () { file.click(); } });
    rmBtn = h("button", { type: "button", class: "mini danger", text: t("img.remove"), onclick: function () {
      obj[keys.url] = "";
      url.value = "";
      status.textContent = t("img.removed");
      refresh(); changed(); markDirty();
    } });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      upBtn.disabled = true;
      status.textContent = t("img.uploading");
      upload(f).then(function (publicUrl) {
        obj[keys.url] = publicUrl;
        url.value = publicUrl;
        refresh(); changed(); markDirty();
        status.textContent = t("img.uploaded");
        if (!String(obj[keys.alt] || "").trim()) alt.focus();
      }, function (err) {
        status.textContent = err.message;
      }).then(function () { upBtn.disabled = false; });
    });
    var alt = textInput(obj[keys.alt], function (v) { obj[keys.alt] = v; changed(); }, { placeholder: t("img.altPh") });
    var parts = [
      field(opts.urlLabel || t("img.url"), url),
      h("div", { class: "be-row" }, [upBtn, rmBtn, status]),
      file,
      field(t("img.alt"), alt, t("img.altHint"))
    ];
    if (keys.caption) parts.push(field(t("img.caption"), textInput(obj[keys.caption], function (v) { obj[keys.caption] = v; })));
    refresh();
    return h("div", { class: "be-img" }, [thumb, h("div", { class: "be-img-fields" }, parts)]);
  }

  function upload(f) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(f.type)) return reject(new Error(t("img.type")));
      if (f.size > MAX_UPLOAD) return reject(new Error(t("img.size")));
      var ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      var d = new Date();
      var base = slugify($("p-slug").value || $("p-title").value || "concept") || "concept";
      var path = d.getFullYear() + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + base + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var bucket = S.sb.storage.from("blog-images");
      bucket.upload(path, f, { cacheControl: "31536000", upsert: false, contentType: f.type })
        .then(function (r) {
          if (r.error) {
            var m = r.error.message || "";
            if (/bucket/i.test(m) && /not found/i.test(m)) m = t("img.noBucket");
            else if (/row-level security|unauthorized|403/i.test(m)) m = t("img.noRights");
            return reject(new Error(t("img.fail", { msg: m })));
          }
          resolve(bucket.getPublicUrl(path).data.publicUrl);
        }, function (e) { reject(new Error(t("img.fail", { msg: (e && e.message) || t("img.network") }))); });
    });
  }

  /* Keyword chips. */
  function chips() {
    var box = $("p-tags");
    box.textContent = "";
    S.tags.forEach(function (tag, i) {
      box.appendChild(h("span", { class: "chip" }, [tag, h("button", { type: "button", "aria-label": t("ed.keywordRemove", { tag: tag }), text: "×", onclick: function () {
        S.tags.splice(i, 1); chips(); markDirty(); $("p-tags-input").focus();
      } })]));
    });
    var input = h("input", { type: "text", id: "p-tags-input", maxlength: "40", autocomplete: "off", placeholder: S.tags.length >= MAX_TAGS ? "" : t("ed.keywordAdd"), "aria-describedby": "p-tags-hint" });
    input.disabled = S.tags.length >= MAX_TAGS || Store.level() === "legacy";
    function commit() {
      var added = false;
      input.value.split(",").forEach(function (raw) {
        var tag = raw.trim().toLowerCase().replace(/\s+/g, " ");
        if (tag && S.tags.indexOf(tag) < 0 && S.tags.length < MAX_TAGS) { S.tags.push(tag); added = true; }
      });
      input.value = "";
      if (added) { chips(); markDirty(); $("p-tags-input").focus(); }
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
      else if (e.key === "Backspace" && !input.value && S.tags.length) { S.tags.pop(); chips(); markDirty(); $("p-tags-input").focus(); }
    });
    input.addEventListener("paste", function () { setTimeout(function () { if (input.value.indexOf(",") >= 0) commit(); }, 0); });
    input.addEventListener("blur", function () { if (input.value.trim()) commit(); });
    box.appendChild(input);
    box.onclick = function (e) { if (e.target === box) input.focus(); };
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
        placeholder: t("rt.placeholder"),
        modules: {
          history: { delay: 800, maxStack: 200, userOnly: true },
          toolbar: {
            container: [[{ header: [1, 2, 3, false] }], ["bold", "italic", "underline"], ["link"], [{ list: "ordered" }, { list: "bullet" }], ["blockquote"], [{ align: [] }], ["image"], ["undo", "redo"], ["clean"]],
            handlers: {
              undo: function () { this.quill.history.undo(); },
              redo: function () { this.quill.history.redo(); },
              image: function () { insertImageAfter(block.id); }
            }
          }
        }
      });
      if (block.data.ops && block.data.ops.length) q.setContents(block.data.ops, "silent");
      q.history.clear();
      q.on("text-change", function () {
        block.data = { format: "quill-delta", ops: q.getContents().ops };
        markDirty();
      });
      var tb = wrap.querySelector(".ql-toolbar");
      if (tb) {
        tb.setAttribute("role", "toolbar");
        tb.setAttribute("aria-label", t("rt.toolbar"));
        tb.querySelectorAll("button").forEach(function (b) {
          var fmt = (b.className.match(/ql-([a-z]+)/) || [])[1];
          if (ICONS[fmt]) b.innerHTML = ICONS[fmt];
          var key = b.value ? fmt + ":" + b.value : fmt;
          if (TOOL_LABELS[key]) { b.setAttribute("aria-label", t(TOOL_LABELS[key])); b.title = t(TOOL_LABELS[key]); }
        });
      }
      q.root.setAttribute("aria-label", t("rt.aria"));
      S.quills[block.id] = q;
    }, 0);
    return wrap;
  }

  /* The rich-text "image" button adds an Image block below, so every image
     gets alt text, a caption and a width, and then opens the file picker. */
  function insertImageAfter(id) {
    var node = insertBlock(SumitBlocks.create("image"), indexOf(id) + 1);
    var fileInput = node.querySelector('input[type="file"]');
    if (fileInput) fileInput.click();
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  var BODIES = {
    rich_text: richText,
    heading: function (b) {
      return h("div", { class: "be-grid2" }, [
        field(t("blk.level"), select([[2, t("blk.h2")], [3, t("blk.h3")]], b.data.level || 2, function (v) { b.data.level = +v; })),
        field(t("blk.text"), textInput(b.data.text, function (v) { b.data.text = v; }))
      ]);
    },
    image: function (b) {
      return h("div", null, [
        imagePicker(b.data),
        field(t("blk.width"), select([["default", t("blk.widthDefault")], ["wide", t("blk.widthWide")]], b.data.align || "default", function (v) { b.data.align = v; }))
      ]);
    },
    two_images: function (b) {
      b.data.images = b.data.images || [{}, {}];
      while (b.data.images.length < 2) b.data.images.push({ url: "", alt: "", caption: "" });
      return h("div", { class: "be-grid2" }, [
        h("div", null, [h("p", { class: "be-sub", text: t("blk.image1") }), imagePicker(b.data.images[0])]),
        h("div", null, [h("p", { class: "be-sub", text: t("blk.image2") }), imagePicker(b.data.images[1])])
      ]);
    },
    quote: function (b) {
      return h("div", null, [
        field(t("blk.quoteText"), textArea(b.data.text, function (v) { b.data.text = v; }, 3)),
        field(t("blk.quoteBy"), textInput(b.data.author, function (v) { b.data.author = v; }))
      ]);
    },
    image_text: function (b) {
      return h("div", null, [
        imagePicker(b.data, { url: "url", alt: "alt" }),
        field(t("blk.imgTitle"), textInput(b.data.title, function (v) { b.data.title = v; })),
        field(t("blk.text"), textArea(b.data.text, function (v) { b.data.text = v; }, 4), t("blk.paraHint")),
        field(t("blk.imgPos"), select([["left", t("blk.left")], ["right", t("blk.right")]], b.data.position || "left", function (v) { b.data.position = v; }))
      ]);
    }
  };

  /* ---------- block list ---------- */

  function indexOf(id) {
    for (var i = 0; i < S.blocks.length; i++) if (S.blocks[i].id === id) return i;
    return -1;
  }
  function labelOf(type) {
    var key = "blk." + type, label = t(key);
    if (label !== key) return label;
    var def = SumitBlocks.types().filter(function (x) { return x.type === type; })[0];
    return def ? def.label : type;
  }

  function buildBlock(block) {
    var li = h("li", { class: "be-block", "data-id": block.id });
    var body = BODIES[block.type];
    var grip = h("span", { class: "be-grip", title: t("blk.drag"), "aria-hidden": "true", text: "⋮⋮" });
    grip.addEventListener("mousedown", function () { li.draggable = true; });
    var head = h("div", { class: "be-bhead" }, [
      grip,
      h("strong", { class: "be-btype", text: labelOf(block.type) }),
      h("span", { class: "be-pos" }),
      h("span", { class: "sp" }),
      h("button", { type: "button", class: "icon", "data-act": "up", "aria-label": t("blk.up"), title: t("blk.up"), text: "↑", onclick: function () { move(block.id, -1); } }),
      h("button", { type: "button", class: "icon", "data-act": "down", "aria-label": t("blk.down"), title: t("blk.down"), text: "↓", onclick: function () { move(block.id, 1); } }),
      h("button", { type: "button", class: "icon", "data-act": "dup", "aria-label": t("blk.dup"), title: t("blk.dup"), text: "⧉", onclick: function () { duplicate(block.id); } }),
      h("button", { type: "button", class: "icon danger", "data-act": "del", "aria-label": t("blk.del"), title: t("blk.del"), text: "✕", onclick: function () { remove(block.id); } })
    ]);
    li.appendChild(head);
    li.appendChild(h("div", { class: "be-bbody" }, [body ? body(block) : h("p", { class: "be-hint", text: t("blk.unsupported") })]));

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
      li.querySelector(".be-pos").textContent = t("blk.pos", { n: i + 1, total: items.length });
      li.querySelector('[data-act="up"]').disabled = i === 0;
      li.querySelector('[data-act="down"]').disabled = i === items.length - 1;
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
      else { var f = node.querySelector(".be-bbody input:not([type=file]), .be-bbody textarea, .be-bbody select"); if (f) f.focus(); }
    }, 60);
  }

  function duplicate(id) {
    var i = indexOf(id);
    var copy = { id: uid(), type: S.blocks[i].type, data: clone(S.blocks[i].data) };
    var node = insertBlock(copy, i + 1);
    node.querySelector('[data-act="dup"]').focus();
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
    var btn = node.querySelector(dir < 0 ? '[data-act="up"]' : '[data-act="down"]');
    (btn.disabled ? node.querySelector(dir < 0 ? '[data-act="down"]' : '[data-act="up"]') : btn).focus();
  }

  function hasContent(b) {
    return SumitBlocks.text({ blocks: [b] }).trim() || (b.data && (b.data.url || (b.data.images || []).some(function (x) { return x.url; })));
  }

  function remove(id) {
    var i = indexOf(id);
    if (hasContent(S.blocks[i]) && !window.confirm(t("blk.confirmDel"))) return;
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
    SumitBlocks.types().forEach(function (bt) {
      var hintKey = "blk." + bt.type + ".hint", hint = t(hintKey);
      menu.appendChild(h("button", { type: "button", role: "menuitem", class: "be-menuitem", "data-type": bt.type, onclick: function () { closeMenu(); add(bt.type); } }, [
        h("strong", { text: labelOf(bt.type) }), h("small", { text: hint !== hintKey ? hint : (bt.hint || "") })
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
    pv.appendChild(h("h1", { class: "be-pv-title", text: $("p-title").value || t("ed.previewTitle") }));
    if ($("p-desc").value) pv.appendChild(h("p", { class: "article-lead", text: $("p-desc").value }));
    var body = h("div", { class: "article-body" });
    SumitBlocks.render(content(), body);
    pv.appendChild(body);
    seoPreview();
  }
  function seoPreview() {
    var slug = $("p-slug").value || "slug";
    $("seo-url").textContent = $("p-canonical").value.trim() || ("sum-it.eu › blog › " + slug);
    $("seo-title").textContent = ($("p-mtitle").value.trim() || $("p-title").value.trim() || t("ed.previewTitle")) + " · Sum-IT Blog";
    $("seo-desc").textContent = $("p-mdesc").value.trim() || $("p-desc").value.trim() || t("ed.previewDesc");
  }

  function openPreviewTab() {
    try {
      localStorage.setItem("sumit_blog_preview", JSON.stringify(row(isPublished(), true)));
    } catch (e) { setMsg("err", t("ed.previewFail")); return; }
    window.open("/blog/post.html?preview=1", "_blank", "noopener");
  }

  /* ---------- load / new / save / delete ---------- */

  function row(pub, forPreview) {
    var c = content();
    var dateVal = $("p-date").value;
    var existing = S.original && S.original.published_at;
    var r = {
      slug: $("p-slug").value.trim(),
      title: $("p-title").value.trim(),
      description: $("p-desc").value.trim(),
      body_html: SumitBlocks.toHTML(c),
      published: pub,
      author: S.email || "Sum-IT",
      blocks: c,
      category: $("p-cat").value || null,
      cover_image: $("p-cover").value.trim() || null,
      cover_alt: $("p-cover-alt").value.trim(),
      tags: S.tags.slice(),
      author_name: $("p-author").value.trim() || null,
      published_at: dateVal ? new Date(dateVal + "T09:00:00").toISOString() : (existing || (pub ? new Date().toISOString() : null)),
      title_en: $("p-title-en").value.trim() || null,
      description_en: $("p-desc-en").value.trim() || null,
      meta_title: $("p-mtitle").value.trim() || null,
      meta_description: $("p-mdesc").value.trim() || null,
      canonical_url: $("p-canonical").value.trim() || null,
      is_featured: $("p-featured").checked
    };
    if (forPreview) r.created_at = (S.original && S.original.created_at) || new Date().toISOString();
    return r;
  }

  function validate(r) {
    if (!r.title) return { msg: t("val.title"), field: "p-title" };
    if (!/^[a-z0-9-]{3,80}$/.test(r.slug)) return { msg: t("val.slug"), field: "p-slug" };
    if (!S.editSlug && S.slugTaken) return { msg: t("val.slugTaken"), field: "p-slug" };
    if (r.published && !r.description) return { msg: t("val.desc"), field: "p-desc" };
    if (Store.level() !== "legacy") {
      if (r.cover_image && !SumitBlocks.safeUrl(r.cover_image, true)) return { msg: t("val.coverUrl"), field: "p-cover-picker" };
      if (r.cover_image && !r.cover_alt) return { msg: t("val.coverAlt"), field: "p-cover-picker" };
    }
    if (Store.atLeast("v6") && r.canonical_url && !/^https:\/\/\S+$/.test(r.canonical_url)) return { msg: t("val.canonical"), field: "p-canonical" };
    for (var i = 0; i < S.blocks.length; i++) {
      var b = S.blocks[i], d = b.data || {};
      var imgs = b.type === "two_images" ? (d.images || []) : (d.url !== undefined ? [d] : []);
      for (var k = 0; k < imgs.length; k++) {
        if (imgs[k].url && !SumitBlocks.safeUrl(imgs[k].url, true)) return { msg: t("val.imgUrl", { n: i + 1 }) };
        if (imgs[k].url && !String(imgs[k].alt || "").trim()) return { msg: t("val.imgAlt", { n: i + 1, type: labelOf(b.type) }) };
      }
    }
    return null;
  }

  function fillForm(p) {
    $("p-title").value = p.title || "";
    $("p-slug").value = p.slug || "";
    $("p-slug").readOnly = !!S.editSlug;
    $("p-slug-hint").textContent = S.editSlug ? t("ed.slugLocked") : t("ed.slugAuto");
    $("p-desc").value = p.description || "";
    $("p-cat").value = p.category || "";
    $("p-author").value = p.author_name || "";
    S.tags = (p.tags || []).slice(0, MAX_TAGS);
    chips();
    $("p-date").value = p.published_at ? String(p.published_at).slice(0, 10) : "";
    $("p-cover").value = p.cover_image || "";
    $("p-cover-alt").value = p.cover_alt || "";
    $("p-title-en").value = p.title_en || "";
    $("p-desc-en").value = p.description_en || "";
    $("p-mtitle").value = p.meta_title || "";
    $("p-mdesc").value = p.meta_description || "";
    $("p-canonical").value = p.canonical_url || "";
    $("p-featured").checked = !!p.is_featured;
    coverPicker();
    counters();
    var label = S.editSlug ? (p.published ? t("ed.statusLive") : t("ed.statusDraft")) : t("ed.statusNew");
    $("p-status").textContent = label;
    $("p-status").className = "pill " + (S.editSlug && p.published ? "ok" : "pend");
    $("be-title").textContent = S.editSlug ? t("ed.edit") : t("ed.new");
    applySchema();
    document.title = S.editSlug ? t("title.editing", { title: p.title || "Post" }) : t("title.new");
    renderActions();
  }

  function renderActions() {
    var bar = $("be-actions");
    bar.textContent = "";
    var pub = isPublished();
    var btns = pub
      ? [h("button", { class: "btn", type: "button", text: t("ed.saveChanges"), onclick: function () { save("save"); } }),
         h("button", { class: "btn sec", type: "button", text: t("ed.unpublish"), onclick: function () { save("unpublish"); } })]
      : [h("button", { class: "btn", type: "button", text: t("ed.saveDraft"), onclick: function () { save("draft"); } }),
         h("button", { class: "btn sec", type: "button", text: S.editSlug ? t("ed.publish") : t("ed.savePublish"), onclick: function () { save("publish"); } })];
    btns.push(h("button", { class: "mini", type: "button", text: t("ed.previewTab"), onclick: openPreviewTab }));
    if (pub) btns.push(h("a", { class: "mini", href: Store.publicUrl(S.editSlug), target: "_blank", rel: "noopener", text: t("ed.viewLive") }));
    btns.push(h("span", { class: "sp" }));
    if (S.editSlug) btns.push(h("button", { class: "btn warn", type: "button", text: t("ed.delete"), onclick: delPost }));
    btns.forEach(function (b) {
      if (S.saving && b.tagName === "BUTTON") b.disabled = true;
      bar.appendChild(b);
    });
  }

  function confirmDiscard() {
    return !S.dirty || window.confirm(t("ed.unsaved"));
  }

  function newPost() {
    S.editSlug = null;
    S.original = null;
    S.blocks = [SumitBlocks.create("rich_text")];
    fillForm({});
    renderBlocks();
    renderPreview();
    $("p-title").focus();
  }

  function editPost(slug) {
    Store.get(S.sb, slug).then(function (r) {
      if (r.error) throw r.error;
      var p = r.data;
      if (!p) { fatal(t("ed.notFound"), t("ed.notFoundText", { slug: slug })); return; }
      S.editSlug = slug;
      S.original = p;
      var existing = SumitBlocks.normalize(p.blocks);
      var note = "";
      if (existing.length) {
        S.blocks = clone(existing);
      } else if (p.body_html && p.body_html.trim()) {
        /* Legacy HTML post: convert once into a rich-text block (only supported formats survive). */
        var tmp = new window.Quill(document.createElement("div"), { formats: QUILL_FORMATS });
        var html = SumitBlocks.sanitizeHTML(p.body_html);
        S.blocks = [{ id: uid(), type: "rich_text", data: { format: "quill-delta", ops: tmp.clipboard.convert({ html: html }).ops } }];
        note = t("ed.converted");
      } else {
        S.blocks = [SumitBlocks.create("rich_text")];
      }
      fillForm(p);
      renderBlocks();
      renderPreview();
      if (note) setMsg("ok", note);
    }).catch(function (err) {
      fatal(t("ed.loadFail"), Store.message(err, "act.loadPost"), true);
    });
  }

  function fatal(title, text, retry) {
    var app = $("be-root");
    app.textContent = "";
    app.appendChild(h("div", { class: "panel bl-empty" }, [
      h("h2", { text: title }), h("p", { text: text }),
      h("div", { class: "be-row", style: "justify-content:center" }, [
        retry ? h("button", { class: "btn sec", type: "button", text: t("gate.retry"), onclick: function () { location.reload(); } }) : null,
        h("a", { class: "btn", href: "/admin/blogs/", text: t("ed.toList") })
      ])
    ]));
  }

  function save(mode) {
    if (S.saving) return;
    setMsg();
    var pub = mode === "publish" ? true : mode === "save" ? isPublished() : false;
    var r = row(pub, false);
    var problem = validate(r);
    if (problem) {
      setMsg("err", problem.msg);
      if (problem.field === "p-canonical" || problem.field === "p-mtitle") $("be-seo").open = true;
      var f = problem.field && $(problem.field);
      if (f) { f.scrollIntoView({ behavior: "smooth", block: "center" }); if (f.focus) f.focus({ preventScroll: true }); }
      return;
    }
    S.saving = true;
    renderActions();
    var wasNew = !S.editSlug;
    var q = S.editSlug ? Store.update(S.sb, S.editSlug, r) : Store.insert(S.sb, r);
    q.then(function (res) {
      if (res.error) throw res.error;
      S.editSlug = r.slug;
      S.original = res.data || r;
      S.dirty = false;
      if (wasNew) history.replaceState(null, "", "/admin/blogs/edit/?slug=" + encodeURIComponent(r.slug));
      fillForm(S.original);
      var extra = Store.level() === "legacy" ? t("ed.legacyNote") : "";
      var text = t({ draft: "ed.msgDraft", publish: "ed.msgPublish", save: "ed.msgSave", unpublish: "ed.msgUnpublish" }[mode]);
      setMsg("ok", text + extra);
      window.SumitAdmin.toast(text);
    }).catch(function (err) {
      var action = { draft: "act.save", publish: "act.publish", save: "act.save", unpublish: "act.unpublish" }[mode];
      setMsg("err", Store.message(err, action));
    }).then(function () {
      S.saving = false;
      renderActions();
    });
  }

  function delPost() {
    if (!S.editSlug) return;
    if (!window.confirm(t("ed.confirmDelete", { title: $("p-title").value || S.editSlug }))) return;
    S.saving = true;
    renderActions();
    Store.remove(S.sb, S.editSlug).then(function (r) {
      if (r.error) throw r.error;
      S.dirty = false;
      location.href = "/admin/blogs/?done=deleted";
    }).catch(function (err) {
      setMsg("err", Store.message(err, "act.delete"));
      S.saving = false;
      renderActions();
    });
  }

  /* ---------- form wiring ---------- */

  function coverPicker() {
    var holder = $("p-cover-picker");
    holder.textContent = "";
    var proxy = { url: $("p-cover").value, alt: $("p-cover-alt").value };
    /* The picker edits a proxy object; mirror it into the hidden fields read by row(). */
    holder.appendChild(imagePicker(proxy, { url: "url", alt: "alt" }, {
      urlLabel: t("img.url"),
      onChange: function () { $("p-cover").value = proxy.url || ""; $("p-cover-alt").value = proxy.alt || ""; schedulePreview(); }
    }));
  }

  function counters() {
    [["p-desc", 180], ["p-desc-en", 180], ["p-mtitle", 60], ["p-mdesc", 160]].forEach(function (c) {
      var i = $(c[0]), out = $(c[0] + "-count");
      if (out) out.textContent = i.value.length + " / " + c[1];
    });
  }

  function checkSlug() {
    if (S.editSlug) return;
    var slug = $("p-slug").value.trim();
    var hint = $("p-slug-hint");
    S.slugTaken = false;
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) {
      hint.textContent = slug ? t("ed.slugInvalid") : t("ed.slugAuto");
      return;
    }
    Store.slugTaken(S.sb, slug).then(function (taken) {
      if ($("p-slug").value.trim() !== slug) return;
      S.slugTaken = taken;
      hint.textContent = taken ? t("ed.slugTaken") : t("ed.slugUrl", { slug: slug });
    }).catch(function () { /* the save itself will report conflicts */ });
  }

  function applySchema() {
    var lvl = Store.level();
    var banner = $("be-schema");
    banner.hidden = Store.atLeast("v7");
    banner.textContent = lvl === "legacy" ? t("schema.legacy") : lvl === "v6" ? t("schema.v6") : t("schema.v5");
    document.querySelectorAll(".be-needs-v5").forEach(function (n) { n.setAttribute("data-note", t("ed.v5Only")); });
    document.querySelectorAll(".be-needs-v6").forEach(function (n) { n.setAttribute("data-note", t("ed.v6Only")); });
    document.querySelectorAll(".be-needs-v5").forEach(function (n) { n.classList.toggle("is-disabled", lvl === "legacy"); });
    document.querySelectorAll(".be-needs-v6").forEach(function (n) { n.classList.toggle("is-disabled", !Store.atLeast("v6")); });
    document.querySelectorAll(".be-needs-v7").forEach(function (n) { n.classList.toggle("is-disabled", !Store.atLeast("v7")); n.setAttribute("data-note", t("ed.v7Only")); });
    document.querySelectorAll(".be-needs-v5.is-disabled input, .be-needs-v5.is-disabled select, .be-needs-v5.is-disabled textarea, .be-needs-v5.is-disabled button, .be-needs-v6.is-disabled input, .be-needs-v7.is-disabled input, .be-needs-v7.is-disabled textarea")
      .forEach(function (n) { n.disabled = true; });
  }

  function wire() {
    var cat = $("p-cat");
    cat.appendChild(h("option", { value: "", text: t("ed.categoryPick") }));
    CATEGORIES.forEach(function (c) { cat.appendChild(h("option", { value: c, text: t("cat." + c) })); });

    ["p-title", "p-slug", "p-desc", "p-title-en", "p-desc-en", "p-cat", "p-author", "p-date", "p-mtitle", "p-mdesc", "p-canonical", "p-featured"].forEach(function (id) {
      $(id).addEventListener("input", function () { counters(); markDirty(); });
      $(id).addEventListener("change", markDirty);
    });
    var slugTimer = null;
    $("p-title").addEventListener("input", function () {
      if (S.editSlug) return;
      $("p-slug").value = slugify($("p-title").value);
      clearTimeout(slugTimer);
      slugTimer = setTimeout(checkSlug, 400);
    });
    $("p-slug").addEventListener("input", function () {
      clearTimeout(slugTimer);
      slugTimer = setTimeout(checkSlug, 400);
    });
    $("p-slug").addEventListener("blur", function () {
      if (S.editSlug) return;
      var clean = slugify($("p-slug").value);
      if (clean !== $("p-slug").value) { $("p-slug").value = clean; checkSlug(); }
    });

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
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(isPublished() ? "save" : "draft"); }
    });
    document.querySelectorAll('a[href^="/admin/"]').forEach(function (a) {
      a.addEventListener("click", function (e) { if (!confirmDiscard()) e.preventDefault(); else S.dirty = false; });
    });
    window.addEventListener("beforeunload", function (e) {
      if (S.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  /* ---------- boot ---------- */

  window.SumitAdmin.ready.then(function (ctx) {
    S.sb = ctx.sb;
    S.email = ctx.email;
    var root = $("be-root");
    root.innerHTML = template();
    return Store.detect(S.sb).then(function () {
      wire();
      applySchema();
      var slug = new URLSearchParams(location.search).get("slug");
      var isEdit = /\/admin\/blogs\/edit\/?$/.test(location.pathname);
      if (isEdit && !slug) { fatal(t("ed.noPost"), t("ed.noPostText")); return; }
      if (isEdit) editPost(slug); else newPost();
    });
  }).catch(function (err) {
    var root = $("be-root");
    if (root) root.innerHTML = "";
    if (err && err.code === "SCHEMA_MISMATCH") fatal(t("ed.schemaTitle"), Store.reason(err).replace(/^./, function (c) { return c.toUpperCase(); }) + ".", true);
    else fatal(t("ed.noDb"), Store.message(err, "act.load"), true);
  });

  window.BlogEditor = { state: S, add: add, move: move, duplicate: duplicate, remove: remove, content: content, row: row, validate: validate, save: save };
})(window, document);
