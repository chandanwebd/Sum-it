/* Sum-IT blog CMS — /admin/blogs/ (overview).
 * Search, status filter (URL state ?q=&status=), publish / unpublish /
 * delete per row, draft preview. Requires admin.js and store.js.
 */
(function (window, document) {
  "use strict";

  var Store = window.SumitBlogStore;
  var I18N = window.SumitAdminI18n;
  function t(k, v) { return I18N ? I18N.t(k, v) : k; }
  var S = { sb: null, rows: [], status: "all", q: "", loading: false, error: null, busy: {} };

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
  function fmt(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    try { return new Intl.DateTimeFormat(I18N ? I18N.locale() : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  function safeImg(u) {
    u = String(u || "").trim();
    return /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) ? u : "";
  }

  /* ---------- URL state ---------- */

  function readUrl() {
    var p = new URLSearchParams(location.search);
    S.q = p.get("q") || "";
    S.status = ["published", "draft"].indexOf(p.get("status")) >= 0 ? p.get("status") : "all";
    $("bl-q").value = S.q;
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (S.q) p.set("q", S.q);
    if (S.status !== "all") p.set("status", S.status);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }
  function flashFromUrl() {
    var p = new URLSearchParams(location.search);
    var msg = { deleted: t("list.deleted") }[p.get("done")];
    if (msg) window.SumitAdmin.toast(msg);
    p.delete("done");
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  /* ---------- rendering ---------- */

  function filtered() {
    var q = S.q.trim().toLowerCase();
    return S.rows.filter(function (r) {
      if (S.status === "published" && !r.published) return false;
      if (S.status === "draft" && r.published) return false;
      if (q && (r.title + " " + r.slug).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderCounts() {
    var pub = S.rows.filter(function (r) { return r.published; }).length;
    var counts = { all: S.rows.length, published: pub, draft: S.rows.length - pub };
    document.querySelectorAll("[data-count]").forEach(function (n) {
      n.textContent = S.loading || S.error ? "" : counts[n.getAttribute("data-count")];
    });
    document.querySelectorAll(".bl-filter button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-status") === S.status));
    });
  }

  function skeleton() {
    var body = $("bl-rows");
    body.textContent = "";
    for (var i = 0; i < 4; i++) {
      var tr = h("tr", { class: "bl-skel", "aria-hidden": "true" });
      [72, 260, 50, 70, 70, 70, 140].forEach(function (w) { tr.appendChild(h("td", null, [h("div", { style: "width:" + w + "px;max-width:100%" })])); });
      body.appendChild(tr);
    }
  }

  function state(title, text, action) {
    var box = $("bl-state");
    box.textContent = "";
    if (!title) return;
    box.appendChild(h("div", { class: "bl-empty" }, [h("h2", { text: title }), h("p", { text: text }), action || null]));
  }

  function row(r) {
    var busy = !!S.busy[r.slug];
    var img = safeImg(r.cover_image);
    var editHref = "/admin/blogs/edit/?slug=" + encodeURIComponent(r.slug);
    var actions = [
      h("a", { class: "mini", href: editHref, text: t("list.edit") }),
      r.published
        ? h("a", { class: "mini", href: Store.publicUrl(r.slug), target: "_blank", rel: "noopener", text: t("list.view") })
        : h("button", { class: "mini", type: "button", text: t("list.preview"), disabled: busy, onclick: function () { preview(r); } }),
      r.published
        ? h("button", { class: "mini", type: "button", text: t("list.unpublish"), disabled: busy, onclick: function () { toggle(r, false); } })
        : h("button", { class: "mini", type: "button", text: t("list.publish"), disabled: busy, onclick: function () { toggle(r, true); } }),
      h("button", { class: "mini danger", type: "button", text: t("list.delete"), disabled: busy, onclick: function () { del(r); } })
    ];
    var title = h("td", { class: "c-title" }, [
      h("a", { class: "bl-title", href: editHref, text: r.title || t("list.untitled") }),
      h("span", { class: "bl-slug", text: "/" + r.slug })
    ]);
    var status = h("td", { class: "c-status" }, [h("div", { class: "bl-pills" }, [
      h("span", { class: "pill " + (r.published ? "ok" : "pend"), text: r.published ? t("list.pillLive") : t("list.pillDraft") }),
      r.is_featured ? h("span", { class: "pill feat", text: t("list.pillFeatured") }) : null
    ])
    ]);
    return h("tr", { "data-slug": r.slug }, [
      h("td", { class: "c-thumb" }, [h("span", { class: "bl-thumb" }, [img ? h("img", { src: img, alt: "", loading: "lazy" }) : h("span", { text: t("list.noImage") })])]),
      title,
      status,
      h("td", { class: "c-date bl-date", "data-label": t("list.colCreated"), text: fmt(r.created_at) }),
      h("td", { class: "c-date bl-date", "data-label": t("list.colPublished"), text: r.published ? fmt(r.published_at || r.created_at) : "—" }),
      h("td", { class: "c-date bl-date", "data-label": t("list.colUpdated"), text: fmt(r.updated_at) }),
      h("td", { class: "c-actions" }, [h("div", { class: "bl-actions" }, actions)])
    ]);
  }

  function render() {
    renderCounts();
    var body = $("bl-rows");
    if (S.loading) { skeleton(); state(); return; }
    body.textContent = "";
    if (S.error) {
      state(t(S.errorCode === "SCHEMA_MISMATCH" ? "ed.schemaTitle" : "list.loadFail"), S.error, h("button", { class: "btn sec", type: "button", text: t("gate.retry"), onclick: load }));
      return;
    }
    if (!S.rows.length) {
      state(t("list.emptyTitle"), t("list.emptyText"), h("a", { class: "btn", href: "/admin/blogs/new/", text: t("list.new") }));
      return;
    }
    var list = filtered();
    list.forEach(function (r) { body.appendChild(row(r)); });
    state(list.length ? "" : t("list.noResults"), t("list.noResultsText"));
    $("bl-live").textContent = t("list.count", { shown: list.length, total: S.rows.length });
  }

  /* ---------- actions ---------- */

  function load() {
    S.loading = true;
    S.error = null;
    render();
    Store.list(S.sb).then(function (r) {
      if (r.error) throw r.error;
      S.rows = r.data || [];
      var lvl = Store.level();
      var banner = $("bl-schema");
      banner.hidden = Store.atLeast("v7");
      banner.textContent = lvl === "legacy" ? t("schema.legacy") : lvl === "v6" ? t("schema.v6") : t("schema.v5");
    }).catch(function (err) {
      var why = Store.reason(err);
      S.errorCode = err && err.code;
      S.error = why.charAt(0).toUpperCase() + why.slice(1) + ".";
    }).then(function () {
      S.loading = false;
      render();
    });
  }

  function setBusy(slug, on) { S.busy[slug] = on; render(); }

  function toggle(r, on) {
    if (on && !String(r.description || "").trim()) {
      window.SumitAdmin.toast(t("list.needDesc"), true);
      return;
    }
    setBusy(r.slug, true);
    Store.setPublished(S.sb, r, on).then(function (res) {
      if (res.error) throw res.error;
      Object.assign(r, res.data || { published: on });
      window.SumitAdmin.toast(t(on ? "list.published.toast" : "list.unpublished.toast", { title: r.title }));
    }).catch(function (err) {
      window.SumitAdmin.toast(Store.message(err, on ? "act.publish" : "act.unpublish"), true);
    }).then(function () { setBusy(r.slug, false); });
  }

  function del(r) {
    if (!window.confirm(t("list.confirmDelete", { title: r.title || r.slug }))) return;
    setBusy(r.slug, true);
    Store.remove(S.sb, r.slug).then(function (res) {
      if (res.error) throw res.error;
      S.rows = S.rows.filter(function (x) { return x.slug !== r.slug; });
      window.SumitAdmin.toast(t("list.deleted"));
    }).catch(function (err) {
      window.SumitAdmin.toast(Store.message(err, "act.delete"), true);
    }).then(function () { delete S.busy[r.slug]; render(); });
  }

  /* Drafts aren't publicly readable, so preview renders the full row from this browser. */
  function preview(r) {
    var w = window.open("", "_blank");
    Store.get(S.sb, r.slug).then(function (res) {
      if (res.error || !res.data) throw res.error || new Error("not found");
      localStorage.setItem("sumit_blog_preview", JSON.stringify(res.data));
      if (w) w.location.href = "/blog/post.html?preview=1";
    }).catch(function (err) {
      if (w) w.close();
      window.SumitAdmin.toast(Store.message(err, "act.preview"), true);
    });
  }

  /* ---------- boot ---------- */

  window.SumitAdmin.ready.then(function (ctx) {
    S.sb = ctx.sb;
    flashFromUrl();
    readUrl();
    var timer = null;
    $("bl-q").addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { S.q = $("bl-q").value; writeUrl(); render(); }, 200);
    });
    document.querySelectorAll(".bl-filter button").forEach(function (b) {
      b.addEventListener("click", function () { S.status = b.getAttribute("data-status"); writeUrl(); render(); });
    });
    load();
  });
})(window, document);
