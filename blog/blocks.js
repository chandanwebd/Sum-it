/* Sum-IT block renderer — shared by /blog/post.html and the editor in beheer.html.
 *
 * Content format (stored in blog_posts.blocks):
 *   { "version": 1, "blocks": [ { "id": "b1", "type": "rich_text", "data": { ... } }, ... ] }
 * Array order is the display order.
 *
 * Every block is rendered with DOM APIs and textContent; stored content is never
 * injected as HTML. URLs are restricted to http(s), site-relative, mailto and tel.
 * Unknown block types are skipped, so older pages never break when a new block
 * type is introduced.
 *
 * Adding a block type later: SumitBlocks.register("video", { label, empty, render, text }).
 */
(function (root) {
  "use strict";

  var VERSION = 1;
  var registry = {};
  var order = [];

  /* ---------- helpers ---------- */

  function h(tag, props, children) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else el.setAttribute(k, v === true ? "" : String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }

  function safeUrl(url, forImage) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/(?!\/)/.test(u)) return u;
    if (!forImage && (/^(mailto|tel):/i.test(u) || /^#[\w-]*$/.test(u))) return u;
    return "";
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url) && url.indexOf(location.origin) !== 0;
  }

  function paragraphs(text) {
    return String(text || "")
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean)
      .map(function (p) {
        var el = h("p");
        p.split("\n").forEach(function (line, i) {
          if (i) el.appendChild(h("br"));
          el.appendChild(document.createTextNode(line));
        });
        return el;
      });
  }

  function slugId(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function figure(img, cls) {
    var src = safeUrl(img && img.url, true);
    if (!src) return null;
    var children = [h("img", { src: src, alt: img.alt || "", loading: "lazy", decoding: "async" })];
    if (img.caption) children.push(h("figcaption", { text: img.caption }));
    return h("figure", { class: cls || null }, children);
  }

  /* ---------- rich text: Quill Delta -> semantic DOM ---------- */

  var ALIGN = { center: 1, right: 1, justify: 1 };

  function inline(seg) {
    var a = seg.attrs || {};
    var node = document.createTextNode(seg.text);
    if (a.code) node = h("code", null, [node]);
    if (a.strike) node = h("s", null, [node]);
    if (a.underline) node = h("u", null, [node]);
    if (a.italic) node = h("em", null, [node]);
    if (a.bold) node = h("strong", null, [node]);
    if (a.link) {
      var href = safeUrl(a.link, false);
      if (href) {
        var ext = isExternal(href);
        node = h("a", { href: href, target: ext ? "_blank" : null, rel: ext ? "noopener noreferrer" : null }, [node]);
      }
    }
    return node;
  }

  function deltaLines(ops) {
    var lines = [];
    var cur = [];
    (ops || []).forEach(function (op) {
      if (typeof op.insert !== "string") return; /* embeds are not supported */
      var parts = op.insert.split("\n");
      parts.forEach(function (part, i) {
        if (part) cur.push({ text: part, attrs: op.attributes });
        if (i < parts.length - 1) {
          lines.push({ segs: cur, attrs: op.attributes || {} });
          cur = [];
        }
      });
    });
    if (cur.length) lines.push({ segs: cur, attrs: {} });
    return lines;
  }

  function renderDelta(ops) {
    var wrap = h("div", { class: "b-rich" });
    var listStack = []; /* [{el, kind, level}] */
    var quote = null;

    function fill(el, line) {
      line.segs.forEach(function (s) { el.appendChild(inline(s)); });
      if (ALIGN[line.attrs.align]) el.classList.add("al-" + line.attrs.align);
      return el;
    }

    lines(deltaLines(ops));

    function lines(all) {
      all.forEach(function (line) {
        var a = line.attrs;
        if (a.list) {
          quote = null;
          var kind = a.list === "ordered" ? "ol" : "ul";
          var level = Math.min(+a.indent || 0, 4);
          while (listStack.length && listStack[listStack.length - 1].level > level) listStack.pop();
          var top = listStack[listStack.length - 1];
          if (!top || top.level < level || top.kind !== kind) {
            if (top && top.level === level) listStack.pop();
            var list = h(kind);
            var parent = listStack[listStack.length - 1];
            if (parent && parent.el.lastElementChild) parent.el.lastElementChild.appendChild(list);
            else wrap.appendChild(list);
            listStack.push({ el: list, kind: kind, level: level });
          }
          listStack[listStack.length - 1].el.appendChild(fill(h("li"), line));
          return;
        }
        listStack = [];
        if (!line.segs.length) { quote = null; return; } /* empty line: spacing handled by CSS */
        if (a.blockquote) {
          if (!quote) { quote = h("blockquote"); wrap.appendChild(quote); }
          quote.appendChild(fill(h("p"), line));
          return;
        }
        quote = null;
        var level = +a.header;
        var tag = level === 1 || level === 2 ? "h2" : level >= 3 ? "h3" : "p";
        var el = fill(h(tag), line);
        if (tag !== "p") el.id = slugId(el.textContent) || null;
        wrap.appendChild(el);
      });
    }
    return wrap;
  }

  function deltaText(ops) {
    return (ops || []).map(function (op) { return typeof op.insert === "string" ? op.insert : ""; }).join("");
  }

  /* ---------- block types ---------- */

  function register(type, def) {
    if (!registry[type]) order.push(type);
    registry[type] = def;
  }

  register("rich_text", {
    label: "Tekst",
    hint: "Alinea's, kopjes, lijstjes, links, citaten",
    empty: function () { return { format: "quill-delta", ops: [{ insert: "\n" }] }; },
    render: function (d) { return renderDelta(d.ops); },
    text: function (d) { return deltaText(d.ops); }
  });

  register("heading", {
    label: "Kop",
    hint: "Tussenkop H2 of H3",
    empty: function () { return { level: 2, text: "" }; },
    render: function (d) {
      if (!d.text) return null;
      var tag = +d.level === 3 ? "h3" : "h2";
      return h(tag, { class: "b-heading", id: slugId(d.text) || null, text: d.text });
    },
    text: function (d) { return d.text || ""; }
  });

  register("image", {
    label: "Afbeelding",
    hint: "Eén afbeelding met onderschrift",
    empty: function () { return { url: "", alt: "", caption: "", align: "default" }; },
    render: function (d) { return figure(d, "b-image" + (d.align === "wide" ? " is-wide" : "")); },
    text: function (d) { return d.caption || ""; }
  });

  register("two_images", {
    label: "Twee afbeeldingen",
    hint: "Naast elkaar, op mobiel onder elkaar",
    empty: function () { return { images: [{ url: "", alt: "", caption: "" }, { url: "", alt: "", caption: "" }] }; },
    render: function (d) {
      var figs = (d.images || []).slice(0, 2).map(function (img) { return figure(img); }).filter(Boolean);
      return figs.length ? h("div", { class: "b-two" }, figs) : null;
    },
    text: function (d) { return (d.images || []).map(function (i) { return i.caption || ""; }).join(" "); }
  });

  register("quote", {
    label: "Citaat",
    hint: "Uitgelicht citaat met bron",
    empty: function () { return { text: "", author: "" }; },
    render: function (d) {
      if (!d.text) return null;
      return h("figure", { class: "b-quote" }, [
        h("blockquote", null, paragraphs(d.text)),
        d.author ? h("figcaption", { text: d.author }) : null
      ]);
    },
    text: function (d) { return (d.text || "") + " " + (d.author || ""); }
  });

  register("image_text", {
    label: "Afbeelding + tekst",
    hint: "Afbeelding naast een korte tekst",
    empty: function () { return { url: "", alt: "", title: "", text: "", position: "left" }; },
    render: function (d) {
      var img = figure(d);
      if (!img && !d.title && !d.text) return null;
      return h("div", { class: "b-imgtext" + (d.position === "right" ? " is-right" : "") }, [
        img,
        h("div", { class: "b-imgtext-body" }, [d.title ? h("h3", { text: d.title }) : null].concat(paragraphs(d.text)))
      ]);
    },
    text: function (d) { return (d.title || "") + " " + (d.text || ""); }
  });

  /* ---------- public API ---------- */

  function normalize(content) {
    if (!content) return [];
    var list = Array.isArray(content) ? content : content.blocks;
    return Array.isArray(list) ? list.filter(function (b) { return b && typeof b.type === "string"; }) : [];
  }

  function render(content, target) {
    var frag = document.createDocumentFragment();
    normalize(content).forEach(function (block) {
      var def = registry[block.type];
      if (!def) { if (root.console) console.warn("[blocks] unknown block type skipped:", block.type); return; }
      try {
        var node = def.render(block.data || {});
        if (node) {
          node.classList.add("block");
          frag.appendChild(node);
        }
      } catch (e) {
        if (root.console) console.warn("[blocks] block failed to render:", block.type, e);
      }
    });
    if (target) { target.textContent = ""; target.appendChild(frag); }
    return frag;
  }

  function toHTML(content) {
    var box = document.createElement("div");
    render(content, box);
    return box.innerHTML;
  }

  function text(content) {
    return normalize(content).map(function (b) {
      var def = registry[b.type];
      return def && def.text ? def.text(b.data || {}) : "";
    }).join("\n");
  }

  function create(type) {
    var def = registry[type];
    if (!def) throw new Error("Unknown block type: " + type);
    return { id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: type, data: def.empty() };
  }

  root.SumitBlocks = {
    VERSION: VERSION,
    register: register,
    render: render,
    toHTML: toHTML,
    text: text,
    create: create,
    normalize: normalize,
    safeUrl: safeUrl,
    types: function () { return order.map(function (t) { return { type: t, label: registry[t].label, hint: registry[t].hint }; }); }
  };
})(window);
