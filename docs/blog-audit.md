# Blog: audit and plan (blog redesign phase)

Date: 2026-09-19

## How the blog works today

| Part | Where | How it works |
|---|---|---|
| Stack | Static HTML, plain JS, Cloudflare Pages, Supabase | No framework, no package.json, no build step, no TypeScript. |
| `/blog/` landing | `blog/index.html` | Hand-written static cards in 6 `<section>`s: `tools`, `belasting`, `projecten`, `samenwerken`, `basis`, `sum-it`. Client-side search (`#blog-search`) hides non-matching `.card`s. |
| Static articles | `blog/*.html` (83) | SEO pages with canonical URLs, JSON-LD (Article, FAQ) and `datePublished`. The category label and reading time live in `.meta`. |
| CMS articles | `blog/post.html?slug=` | Fetches `blog_posts` (title, description, body_html, created_at) and **injects `body_html` unescaped**. |
| CMS list on landing | inline script in `blog/index.html` | `GET blog_posts?published=eq.true` → cards prepended to `#basis`. |
| Editor | `beheer.html` → Blog tab | Admins only (`rpc('is_admin')`). Fields: title, slug, description, raw HTML textarea. Buttons: "Opslaan als concept" (draft) / "publiceren" (publish) (`published` boolean), delete. |
| Database | `supabase-setup-v3.sql` | `blog_posts(slug pk, title, description, body_html, author, published, created_at, updated_at)`. RLS: public reads published rows; admins can do everything. |
| Categories | Landing sections only | No category column. CMS posts always land in "Starten & administratie". |
| Translation (EN/NL) | `/i18n.js` + `window.PAGE_I18N` | Headings and UI strings are translated; article cards and articles are Dutch only. |
| Images | none | No image upload, no cover images, no storage bucket. |
| Sorting / pagination / tags | none | Only 3 distinct publish dates across the static articles. |

Live database check (read-only, anon key): 0 published CMS posts; the `blocks` column does not exist.

## Problems

- **Page length:** the landing page shows all 86 cards at once, and there is no "latest" entry point.
- **Cards:** no date, author, reading time or category on the cards. Titles are double-escaped in the source (`&amp;#x27;`) and only look right because JS repairs them at runtime.
- **Category chips:** they only jump to anchors (no filter, no active state) and aren't sticky, so after scrolling the reader loses them.
- **Search:** no result count, no clearing, no URL state.
- **No sorting.**
- **CMS posts:** the category is hard-coded, and the post page is a bare title + HTML.
- **Unsafe HTML:** `body_html` is stored and rendered as unsanitised HTML.
- **Privacy:** `beheer.html` writes the admin's **e-mail** into `author`, and the public RLS policy exposes every column. Anyone can read these e-mails through the REST API.

## Plan (smallest compatible change)

- **Landing page:** keep the server-rendered static cards (SEO) and enrich them with data attributes, generated from each article's own metadata. JavaScript adds search, filtering, sorting, URL state, the sticky category bar and scroll offsets. CMS posts are merged in using the same card template.
- **Database, additive only:** `supabase-setup-v5.sql` adds nullable columns: `blocks jsonb`, `category`, `cover_image`, `cover_alt`, `tags`, `author_name`, `published_at`, `meta_title`, `meta_description`, `og_image`. It also adds a public-read `blog-images` storage bucket that only admins can write to.
  - Nothing is renamed or removed; `published` stays the draft/publish switch.
- **Blocks:** stored as an ordered JSON array, `{ "type", "id", "data" }` per block, wrapped as `{ "version": 1, "blocks": [...] }`.
  - Rich text is saved as a Quill Delta (structured, not HTML).
  - One renderer, `blog/blocks.js`, serves the article page and the editor preview. It builds DOM nodes with escaped text and never injects HTML; unknown block types are skipped.
  - `body_html` is still written on every save (generated from the blocks), so older consumers keep working.
- **Editor:** stays in `beheer.html`. Adds block editing (add / edit / duplicate / move / delete / drag), image upload, category, tags, cover image and SEO fields. Rich text uses Quill 2, loaded from a CDN in the admin page only.
  - If the migration hasn't been run, the editor warns and saves only the legacy columns (with `body_html` generated from the blocks).

## For the SEO phase (not changed now)

- The `?slug=` CMS pages are rendered by JavaScript only, aren't in the sitemap, and have no canonical.
- Card titles are double-escaped in the landing page's HTML source (fixed as part of the card regeneration).
- There are no dedicated category URLs; filtering is a query parameter on `/blog/`.

## Status (2026-09-19)

**Done:**
- **Landing page (`/blog/`):**
  - Hero with search.
  - Sticky category bar that also works as a filter, with smooth scrolling to the chosen category.
  - Newest/Oldest sort, and URL state that survives back/forward and reloads.
  - "Latest" section, and a 6-card preview per category with "view all".
  - 1/2/3-column grid; empty and error states; EN/NL.
- **Article page (`post.html`):** block renderer with 6 block types, editorial layout, related articles, loading/not-found/error states, and full-page draft preview.
- **Editor (`beheer.html`):** block editor with metadata, image upload and validation.

**Checked in the browser:**
- No horizontal overflow at 320–1920px on the landing page (overview, filtered, search) and the article page (preview, not found).
- Editor tested against a mocked Supabase client, with both the old and the v5 schema.

**Needs action by the site owner:**
1. **Run `supabase-setup-v5.sql`** in the Supabase SQL editor.
   - Until then, category, cover image, tags, author name, SEO fields and image uploads are unavailable. The editor says so and saves only the old columns.
   - Visitors' browsers log one harmless 400 per session while the site checks for the new columns.
2. **Optional:** the privacy hardening at the bottom of that file. It hides editor e-mail addresses in `author` from the public API.
3. **After adding or re-categorising static articles:** edit `blog/index.json` and run `node scripts/build-blog-index.mjs`.

**Not tested live:** a real sign-in, a real save and a real upload against Supabase. That needs an admin account and would write to production data.
