# Sum-IT — UI/UX Audit (Step 1, Phase A/B)

Date: 2026-09-19 · Scope: presentation layer only · No code changed during the audit.

## 1. Current architecture

- **Stack:** static multi-page HTML + vanilla JS, hosted on Cloudflare Pages. Pages Functions in `functions/api/*` (`signup`, `stats/public`, `laposta-webhook`). Supabase (auth, CMS overrides, blog posts, admin RPCs). No `package.json`, no build step, no lint, no TypeScript.
- **Homepage:** `index.html` + `css/index.css` (9,926 lines) + `js/index.js` (1,835 lines, contains the `I18N` dictionary) + `components/header/*` (a header loaded with fetch, **used only by the homepage**). Bootstrap 5.3.8 CSS also loads, after the site CSS.
- **Every other page:** its own inline `<style>` (Poppins) and its own hand-written header. `i18n.js` handles EN/NL on most marketing pages.
- **Uncommitted work in progress:** changes to `index.html`, `css/index.css`, `js/index.js`, `blog/index.html` and `demo/app.html`, plus the new `components/` folder.
- **Backups served publicly:** `index copy.html`, `indexv1.html`, `community/index copy.html`.

## 2. Pages and template groups

| Group | Pages | Styling |
|---|---|---|
| Homepage | `index.html` | `css/index.css` + header component + Bootstrap. Font: DM Sans |
| Community | `community/index.html` | Bootstrap + all of `css/index.css` + a 1,600-line inline style. **Two headers.** Font falls back to the system font |
| Article template (A) | 78 blog articles, moneybird-alternatief, e-boekhouden-alternatief, bonnetjes-scannen | Identical inline CSS block (hash `e11ba66d`) |
| A, older variant | 4 articles + `blog/post.html` | No `article h3` rule |
| A + extras | prijzen, over-ons, functies/*, voor/*, tools/*, privacy, blog/index | Base block plus small page-specific modules |
| Auth cards (B) | login, wachtwoord, portal, beheer | Dark indigo card layout; `--slate` has a different value here |
| Signup funnel (C) | aanmelden, aanmelden-gelukt | Narrow 460px column |
| Off-brand | admin.html (Inter, other greens), demo/app.html (phone-frame app) | Separate design systems |

## 3. What the JavaScript depends on (must keep)

- **Homepage.** Do not rename any of these ids, classes, data attributes or handlers:
  - ids: `#waitlist-form`, `#rol-on`/`#rol-bk`, `#naam`, `#email`, `#biz-fields`, `#type`, `#hp-website`, `#taalfield`, `#reffield`, `#submitbtn`, `#form-state`/`#thanks-state`, `#reflink`/`#reflink2`, `#copyRefBtn`, `#sh-*`/`#shr-*`, `#livedemo`/`#demoframe`/`#demostart`/`#demoexit`, `.scr#s0-3`, `#caption`, `#dots`, `#nav0-4`, `#pd-*`, `#pdc0-2`, `#sd-*`, `#dg/#db/#dr`, `#bc*`/`#bizcard`, `#fsoc`, `#v24Top`, `#v24MobileCta`, `#mobmenu`, `#burger`, `#lang-en`/`#lang-nl`
  - classes: `.reveal`/`.in`, `.brchip b`, `.netband .demotag`
  - data attributes: `data-i18n`, `data-i18n-ph`, `data-src`, `data-soc`, `data-nav`, `data-page`
  - inline handlers: `startDemo`, `stopDemo`, `pdTab`, `pdTog`, `pdOpen`, `pdBack`, `sdTab`, `bcUpdate`, `bcTheme`, `bcLogo`, `bcDownload`, `bcShare`, `copyRef`, `copyRef2`, `chooseRole`, `applyRole`, `setLang`, `toggleMenu`, `closeMenu`
- **Other pages:**
  - blog search: `#blog-search`, `main .card`, `.is-filtered`, `.search-empty`
  - Supabase CMS cards: `#basis .cardgrid`
  - tools: calculator ids (`#s1-3`, `#vakopts` … `#tarief`; `#winst` … `#pct`)
  - auth: login/portal/wachtwoord/beheer/admin ids
  - `i18n.js`: `.topin`/`.top` (where the language toggle is mounted), `.langs`
- **API calls:**
  - `POST {API_BASE}/api/signup`
  - `GET {API_BASE}/api/stats/public`
  - Supabase REST: `content_overrides`, `blog_posts`
  - Supabase RPCs: `is_admin`, `portal_me`, `portal_set_city`, `admin_*`
  - localStorage keys: `sumit_lang`, `sumit_demo_signed`

## 4. UI problems

- **No shared design system:**
  - `css/index.css` has four overlapping `:root` token sets, 169 hex colours, 61 font sizes, 35 border radii, 81 box-shadows and 190 `!important`s.
  - Roughly 17% of it is dead CSS (for example the `[data-sumit-inline-style]` block, about 500 lines).
  - Selectors are redefined up to 8 times.
- **Fonts are split:**
  - The homepage uses DM Sans; subpages use Poppins.
  - A global `* {font-family:"DM Sans"}` rule leaks into community, where DM Sans is not loaded.
  - The Poppins `@import` in the middle of `index.css` is ignored by browsers.
- **Bootstrap overrides the site's own styles.** It loads last and changes `.btn`, `.row`, `.small`, `.lead` and `.badge`. The homepage only needs it for the team grid.
- **Navigation is inconsistent across pages.** There are six different nav sets. Only the homepage has Log in and a burger menu, and "Prijzen" links to `/prijzen/` on some pages and `/#pricing` on others.
- **Header hack.** The header uses `margin-bottom:-90px` / `-66px`, magic numbers tied to its height. If the fetch fails the page has no nav at all, and there is no static fallback.
- **Text sizes.** Many labels are 7.5–10px, which is below legible size.
- **Widths differ everywhere:** 760, 820, 860, 1080, 1160 and 1240px.

## 5. Responsive problems (measured in the browser)

- `body{overflow-x:hidden}` hides real overflow.
  - At 320px, the homepage `.qcard` sticks out by about 14px.
  - Several decorative glows and orbits are 500–620px wide.
- Community hero decorations extend past the viewport at 320px.
- Blog index at 320px:
  - The search field overlaps the intro paragraph.
  - Below 620px every nav link except the CTA is hidden.
- Article template: no mobile nav. The links wrap onto several rows as small (about 22px tall) tap targets.
- Blog tables (in 76 articles) have no styles and no scroll wrapper, so wide tables push the page sideways on mobile. `privacy.html` has the same table problem.
- Scroll-reveal hides content until `.in` is added by JavaScript, so a slow or failed script leaves sections blank.

## 6. Accessibility problems

- **Contrast:**
  - White on `#00BC7D` CTAs is about 2.5:1, which fails AA.
  - `#009966` links on `#F1F5F9` are about 3.4:1.
  - `#64748B` small text is about 4.3:1.
- **Focus:** there are no `:focus-visible` styles on subpages, and the homepage replaces `outline:none` with a glow at 10% opacity.
- **Clickable elements that aren't buttons:** `div`/`span` elements with `onclick` (project mockup, carousel dots, portal tabs) can't be focused and have no role.
- **Mobile menu:** no Escape to close, no focus management, and the panel background is translucent.
- **Headings:** the order skips levels (an h4 without an h3; the trust section has only an h3), and related-article cards use `h2`.
- **Forms:**
  - Labels are not tied to inputs on login, wachtwoord, portal, beheer and the business-card builder.
  - Radio groups have no `fieldset`/`legend`.
  - Results and errors have no `aria-live`.
- **Reduced motion:** `scroll-behavior:smooth` is redeclared after the reduced-motion rule, and the hero carousel auto-advances with no pause control.
- **Logo:** `alt="Sum-IT"` next to the visible text "Sum-IT" makes screen readers read the name twice.

## 7. Functional bugs found (NOT UI — need a decision before touching)

1. `login.html` never loads supabase-js, so every login attempt fails and "Wachtwoord vergeten?" throws an error.
2. Homepage signup shows "thanks" even when the request fails (`js/index.js:1641-1652`). `aanmelden.html` does the same.
3. `#copyRefBtn` has `data-i18n`, so `setLang` overwrites its inner markup and the "Copied!" state breaks.
4. `copyRef` is defined twice; the second definition hardcodes `JOU4F2`.
5. `admin.html` `loadDefaults()` looks for `I18N` in `index.html`, but the dictionary now lives in `js/index.js`. It also shows the editor to any logged-in user, with no admin check.
6. Community page: two headers, dead `#capture`/`#pricing` anchors, and a non-working `?lang=en` toggle.
7. `js/index.js` V24 block runs before the header is fetched, so its nav logic has no effect.
8. The hidden `source` field says `v8` while the JS sends `v22`, and the form `action` is still a placeholder.

## 8. SEO notes for Step 2 (no changes now)

- **Public backups:** `index copy.html`, `indexv1.html` and `community/index copy.html` are served publicly, with canonicals pointing at live pages.
- **Mixed URL forms:** internal links mix `.html` and extensionless URLs (`/privacy` vs `/privacy.html`, `/moneybird-alternatief.html`).
- **`blog/post.html`:** placeholder description, no canonical, `?slug=` URLs are not in the sitemap, and the page is rendered by JavaScript only.
- **Sitemap:** `/privacy` is missing.
- **Homepage language:** `<html lang="nl">` with an English title.
- **Overlap:** `/bonnetjes-scannen` and `/functies/bonnetjes-scannen/` cover the same topic.
- **Blog index titles:** `&amp;#x27;` is double-escaped in the HTML source.
- **Demo page:** `demo/app.html` has no description and no noindex.

## 9. Regression risks

- `setLang` sets `innerHTML` on every `[data-i18n]`. Wrapping translated text in new markup gets wiped, so new markup must go *around* `data-i18n` elements, never inside them.
- Changing the header markup affects `i18n.js` `mountToggle` (it depends on `.topin`) and homepage JS (`#burger`, `#mobmenu`, `#lang-*`).
- Removing Bootstrap changes the team grid and any rule that currently relies on Bootstrap's reboot.
- The homepage mockups are built at a fixed 292–310px, and the phone/iframe is scaled by `fitDemo`. Resizing them needs care.
- The 83 static articles share CSS by copy-paste, so any change needs a scripted, verified bulk edit.

## 10. Recommended approach

1. **Checkpoint.** Commit the current work in progress so every later step can be diffed and reverted.
2. **Shared foundation.** Create `css/tokens.css` (colour, type, spacing, radius, shadow, container and breakpoint tokens) and `css/site.css` (base, buttons, cards, forms, header/footer, article typography, tables, focus, reduced motion). Load both on all pages.
3. **One header and footer everywhere.** Roll out the existing `components/header` with a static fallback markup, no negative-margin hack, and an accessible drawer (Escape key, focus return, solid panel). The same link set goes on every page, with no routes changed.
4. **Homepage.** Map the existing tokens onto the new ones, remove the dead layers, scope Bootstrap to the team grid (or replace it with CSS grid), fix overflow at the source, then remove `overflow-x:hidden`.
5. **Subpages.** Replace the duplicated inline `<style>` blocks with the shared stylesheet plus small page modules. Use scripted edits, verified by diff.
6. **Test.** Run a responsive pass at 320–1920px, an interaction pass over every item in §3, and an accessibility pass.

Validation note: the project has no lint, typecheck or build scripts. Validation will be done in the browser: a console-error sweep, an overflow scan at each breakpoint, and interaction checks.

---

## 11. Status after Step 1 (2026-09-19)

**Done**
- **Design tokens:** `css/tokens.css` defines colour, type scale, spacing, containers, radii, elevation, motion, focus ring, skip link and reduced motion.
- **Shared header** on every public page:
  - The markup is written into each page's HTML and kept in sync with `components/header/sync.mjs`.
  - Mobile drawer: Escape closes it, focus returns to the menu button, clicking outside closes it, links are 48px tall.
  - The language toggle reports its state (`aria-pressed`) and hides itself on Dutch-only pages.
- **97 content pages** (articles, features, audiences, pricing, tools, alternatives, privacy) moved from copy-pasted inline CSS to `css/site.css`.
- **Blog landing** (`blog/index.html`) redesigned:
  - The search box no longer overlaps the intro text on mobile.
  - Category chips moved into the hero.
  - The double arrow on cards is removed.
- **Homepage:**
  - Bootstrap removed.
  - Leftover font rules removed and `overflow-x:hidden` removed (there was no real overflow underneath it).
  - About 880 unused CSS lines deleted.
  - Buttons meet AA contrast; buttons and form fields have visible focus rings.
  - Controls in the product mockup work with the keyboard.
  - Heading order fixed.
- **Community page:** a single shared header; `css/index.css` and Bootstrap removed; brand tokens applied; footer contrast fixed.
- **Auth and signup pages:** DM Sans font, tokens applied, AA contrast, labels tied to their inputs.
- **Fixes the user approved:**
  - `login.html` loads supabase-js.
  - The Copy button's "copied" state survives a language switch.
  - The community page no longer shows two headers.
  - Long Dutch words no longer break the layout at 320px.

**Checked**
- **Horizontal overflow:** none at 320/375/390/414/480/768/820/1024/1280/1440/1920px on 16 page templates, measured with no overflow masking.
- **Console:** no errors on any page template.
- **Interactions checked in the browser:** navigation and drawer, language switch, blog search and empty state, both calculators, signup role switch and form validation (not submitted), business-card preview, hero carousel, project and invoice tabs, live demo start/stop, share links, Copy button state, login client setup.

**Not done yet / open**
- `admin.html`, `beheer.html` and `demo/app.html` (internal tools) are not restyled.
- `css/index.css` still contains stacked redesign layers (about 9,100 lines, many `!important`s). The next consolidation step is to map its old variables onto the new tokens.
- Functional issues not fixed (they need a decision, see §7):
  - Signup forms show success even when the request fails.
  - `admin.html` can't read the homepage texts and has no admin check.
  - The referral link is hardcoded as `JOU4F2`.
- The hero carousel keeps auto-advancing even when the user prefers reduced motion (JS change).
- The SEO items in §8 are left for Step 2.
