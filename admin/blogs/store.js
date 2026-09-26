/* Sum-IT blog CMS: shared data access for /admin/blogs/* (list + editor).
 *
 * The database may be at one of three levels, depending on which SQL files
 * the owner has run. Features that need newer columns degrade gracefully:
 *   "legacy" — supabase-setup-v3.sql only (slug, title, description, body_html, published)
 *   "v5"     — + blocks, category, cover image, tags, author, SEO, published_at
 *   "v6"     — + id, status, canonical_url, is_featured
 *   "v7"     — + title_en, description_en (English card text; supabase-blog-en.sql)
 */
(function (window) {
  "use strict";

  var LIST_COLS = {
    legacy: "slug,title,description,published,created_at,updated_at",
    v5: "slug,title,description,published,created_at,updated_at,published_at,cover_image,cover_alt,category",
    v6: "slug,id,title,description,published,status,created_at,updated_at,published_at,cover_image,cover_alt,category,is_featured"
  };
  /* Columns that only exist from a given level; stripped before saving to an older schema. */
  var V5_ONLY = ["blocks", "category", "cover_image", "cover_alt", "tags", "author_name", "published_at", "meta_title", "meta_description", "og_image"];
  var V6_ONLY = ["canonical_url", "is_featured"];
  var V7_ONLY = ["title_en", "description_en"];
  var ORDER = ["legacy", "v5", "v6", "v7"];

  var level = null;

  function detect(sb) {
    if (level) return Promise.resolve(level);
    function probe(cols) { return sb.from("blog_posts").select(cols).limit(1); }
    return probe(LIST_COLS.v6 + ",title_en,description_en").then(function (r7) {
      if (!r7.error) return "v7";
      if (r7.error.code !== "42703") throw r7.error;
      return probe(LIST_COLS.v6);
    }).then(function (r) {
      if (typeof r === "string") return r;
      if (!r.error) return "v6";
      if (r.error.code !== "42703") throw r.error;
      return probe(LIST_COLS.v5).then(function (r5) {
        if (!r5.error) return "v5";
        if (r5.error.code !== "42703") throw r5.error;
        return probe(LIST_COLS.legacy).then(function (rl) {
          if (!rl.error) return "legacy";
          /* Not even the basic columns exist: the table was created with a different shape. */
          if (rl.error.code === "42703") throw { code: "SCHEMA_MISMATCH", message: rl.error.message };
          throw rl.error;
        });
      });
    }).then(function (l) { level = l; return l; });
  }

  function list(sb) {
    return detect(sb).then(function (l) {
      return sb.from("blog_posts").select(LIST_COLS[l === "v7" ? "v6" : l]).order("updated_at", { ascending: false });
    });
  }

  function get(sb, slug) {
    return sb.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  }

  /* Drop columns the current schema doesn't have. */
  function fit(row) {
    var out = {};
    Object.keys(row).forEach(function (k) {
      if (!atLeast("v7") && V7_ONLY.indexOf(k) >= 0) return;
      if (!atLeast("v6") && V6_ONLY.indexOf(k) >= 0) return;
      if (level === "legacy" && V5_ONLY.indexOf(k) >= 0) return;
      out[k] = row[k];
    });
    return out;
  }

  /* True when the database has at least the given level's columns. */
  function atLeast(l) { return ORDER.indexOf(level) >= ORDER.indexOf(l); }

  function insert(sb, row) { return sb.from("blog_posts").insert(fit(row)).select().single(); }
  function update(sb, slug, row) { return sb.from("blog_posts").update(fit(row)).eq("slug", slug).select().single(); }
  function remove(sb, slug) { return sb.from("blog_posts").delete().eq("slug", slug); }

  /* Publish sets published_at on first publish (v6 also does this in a trigger);
     unpublish only flips the switch, so the article and its date are kept. */
  function setPublished(sb, post, on) {
    var patch = { published: !!on };
    if (on && level !== "legacy" && !post.published_at) patch.published_at = new Date().toISOString();
    return update(sb, post.slug, patch);
  }

  function slugTaken(sb, slug) {
    return sb.from("blog_posts").select("slug").eq("slug", slug).limit(1).then(function (r) {
      if (r.error) throw r.error;
      return !!(r.data && r.data.length);
    });
  }

  function publicUrl(slug) { return "/blog/post.html?slug=" + encodeURIComponent(slug); }

  /* Friendly error text (admin language) for the most common failures. */
  function t(k, v) { return window.SumitAdminI18n ? window.SumitAdminI18n.t(k, v) : k; }
  function reason(err) {
    var m = (err && err.message) || t("err.unknown");
    if (err && err.code === "SCHEMA_MISMATCH") return t("err.schema");
    if (err && err.code === "23505") return t("err.duplicate");
    if (err && (err.code === "42501" || /row-level security|permission denied/i.test(m))) return t("err.rights");
    if (/Failed to fetch|NetworkError|network/i.test(m)) return t("err.network");
    return m;
  }
  /* actionKey: an "act.*" key, e.g. "act.save". */
  function message(err, actionKey) {
    return t("err.fail", { action: t(actionKey), reason: reason(err) });
  }

  window.SumitBlogStore = {
    detect: detect,
    level: function () { return level; },
    atLeast: atLeast,
    list: list,
    get: get,
    insert: insert,
    update: update,
    remove: remove,
    setPublished: setPublished,
    slugTaken: slugTaken,
    publicUrl: publicUrl,
    message: message,
    reason: reason
  };
})(window);
