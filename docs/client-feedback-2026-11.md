# Client feedback round, November 2026: implementation report

Branch: `chandan`. Nothing committed or deployed yet.

## 1. Changes completed

| # | Request | What changed |
|---|---------|--------------|
| 2 | Remove the business card builder | Removed the builder block (`.bcgen`) from the homepage community section, the "own business card with QR" perk from the signup list, and the portal tip that sent members to download a card. The `bc*` functions in `js/index.js` are kept but no longer run: they were guarded and only called from the removed markup. |
| 3 | Simplify homepage invoicing | `#invoicing` is now a short overview: kicker, heading, two-line summary, three points (own logo, own brand colour, 32 designs), a CTA to `/functies/facturen/` and three real designs (Kantoor, Kleurband, Notaris), each in a different accent colour. Clicking one still opens the full-size preview. The series/document/colour controls and the 10-design grid were removed from the homepage only. |
| 4 | Shorter homepage | 14 → 11 sections, 2,468 → 1,342 lines of HTML. Removed: the interactive projects phone demo (`#control`), the tax section (`#certainty`, which repeated the third feature card), the demo-data region map and "Build your crew" band, and the referral demo with its hard-coded `JOU4F2` link (members still get their real link after signing up). Added links to the feature pages under the feature cards. |
| 5 | Team section higher | `#team` moved from 13th to 5th place, right after invoicing. Ian, Sebastian, Abhishek and the 24M / 1.2M / 1 Goal stats are unchanged. Added a "Maak kennis met het team →" link to `/team/`. |
| 6 | Free promotion | A prominent banner in the homepage pricing card and at the top of `/prijzen/`, plus a badge under €11 on the Boekhouden card and a chip in the signup list. Removed every "first 150 users" mention (homepage chips, pricing card bullet, NL+EN strings). |
| 7 | Boekhouders in the navigation | A "Boekhouders" (EN "Bookkeepers") item between Prijzen and Team, pointing to the existing `/voor/boekhouders/`, synced into all 103 pages. That page now highlights its menu item. A "Meer voor boekhouders →" link was also added to the homepage bookkeeper band. |
| 8 | Testimonial font | Joost, Piet and "Klus geklaard" quotes now use DM Sans (500, italic) instead of Satisfy. The Satisfy font is no longer loaded. The Community page does not contain these testimonials, so nothing changed there. |

Navigation side effect: with eight items the desktop menu no longer fit next to the logo and buttons. To fix that, the header container is now 80px wider than the content container, link padding is a little smaller, and the burger menu takes over at ≤1240px instead of ≤1080px.

### Promotion wording is configurable

The text is set in `config.js` → `SITE_CFG.offer.promo` (`nl` and `en`, simple `<s>`/`<strong>` allowed) and rendered by `js/promo.js`. Set `promoActive: false` to hide it on every page. The HTML holds the Dutch text as a fallback for no-JS visitors and crawlers.

## 2. Files modified

- `index.html`: section order, invoicing, removals, promo, links
- `js/index.js`: new `inv_*`, `cap_l*`, `tm_more`, `bk_more`, `promo_tag`, `m_bk` keys (NL+EN). Removed `of_150` / `fb150`, emptied `fb3`, role-aware chip handling.
- `components/invoice/gallery.js`: "featured" mode (`data-featured`); controls are optional
- `components/invoice/invoice.css`: compact invoicing layout
- `css/index.css`: testimonial font, feature links, team/bookkeeper links
- `css/promo.css`, `js/promo.js` (new): promotion banner
- `config.js`: promotion settings
- `prijzen/index.html`: promo banner + badge, "first 150" bullet removed
- `components/header/header.html`, `header.css`, `header.js`, `i18n.js`: Boekhouders item, header fit
- `voor/boekhouders/index.html`: `data-page="bookkeepers"`
- `portal.html`: QR tip no longer mentions the business card
- ~100 other pages: only the two synced header lines (`node components/header/sync.mjs`)

## 3. Preserved

- No changes to `functions/api/*`, Supabase schema, `sb-config.js`, the signup form, form fields, validation or submission.
- `/functies/facturen/` keeps the full 32-design gallery: series, document and colour controls, and the preview. Checked in the browser.
- Prices and `SoftwareApplication` / `FAQPage` JSON-LD on `/prijzen/` are unchanged (€0 / €11). No billing or checkout logic exists in this repo.
- Titles, meta descriptions, canonicals, OG tags and the sitemap are unchanged. No URL was added, removed or redirected.
- Removed homepage sections had no inbound anchor links (`#control` / `#certainty` were not in the menu). The link test passes.

## 4. Tests run

- `node --test tests/links.test.mjs tests/invoice-calc.test.mjs`: **14/14 pass**, before and after the changes. (`node --test tests/` fails on Node 22 for every revision, because Node 22 doesn't accept a directory argument.)
- The project has no build step, linter or type checker (see `docs/HANDOFF.md`).
- Browser checks on the local preview (`scripts/serve.mjs`):
  - Homepage at 375 / 1201 / 1241 / 1280 / 1440px: no horizontal overflow, header items don't overlap.
  - NL ↔ EN switch: menu, promo and invoice design names all follow.
  - Signup role toggle: bookkeeper chips are intact, and the promo is hidden for bookkeepers as before.
  - Homepage design preview: next/previous cycles through the three designs.
  - `/prijzen/` and `/voor/boekhouders/`: active menu item and canonical are correct. `/functies/facturen/`: controls and preview work.
  - Console: no JS errors. The only errors are external hosts (Google Fonts, Flaticon, Supabase, `sum-it-app.pages.dev`) failing DNS in the offline sandbox, the same as before.
- Not tested live: signup submission and Supabase calls, which were not exercised to avoid writing to production.

## 5. Needs client confirmation before publishing

1. **Promotion duration.** The old copy said "first 150 users: three months free", and the latest feedback says "Normally €11, FREE if you sign up right now!" with no duration. As instructed, no duration is shown, but "GRATIS" with no end date could read as free forever. Please confirm the duration (e.g. three months); it can then be added in `config.js` without code changes.
2. **Dutch promo wording.** The client text is English. The Dutch version used is "Normaal €11, GRATIS als je je nu aanmeldt!".
3. **New Dutch copy (approval needed):**
   - the invoicing summary and its three points (`inv_sum`, `inv_pt*` in `js/index.js`);
   - the link labels ("Bonnetjes scannen →", "Maak kennis met het team →", "Meer voor boekhouders →");
   - the portal QR tip.
4. **Removed homepage blocks:** the projects demo, the tax section, the region map, "Build your crew" and the referral demo. Any of these can be put back, or moved to `/functies/projecten/` or `/community/`, if the client wants to keep it.
5. `SITE_CFG.offer.showRemaining` ("X of 150 places left") stays `false` and should stay off, given the "no first-customers limit" instruction.

## 6. Blog CMS / database handover (no changes made)

Current setup, from `sb-config.js` and `admin/blogs/store.js`:

- **Main Supabase project** (`SB_URL`): signups, portal, `beheer.html`, `content_overrides`, `admin_users`, RPC `is_admin()`.
- **Blog Supabase project** (`BLOG_SB_URL` / `BLOG_SB_ANON`): table `blog_posts` (schema: `supabase-blog-setup.sql` + `supabase-blog-en.sql`), storage bucket `blog-images`. It is used by `/blog/`, `blog/post.js`, the homepage "Nieuwste artikelen" and `/admin/blogs/`.
- `BLOG_ADMIN_EMAIL` is currently set to the developer's address (password-only admin sign-in).
- Only the anon/publishable keys are in the repo. No service-role key is committed.

Needed from the client's technical contact before migrating:

1. The destination Supabase organisation/project (or a decision to keep the current one and transfer ownership), plus region.
2. Owner or admin access to that project, to run the SQL setup, create the `blog-images` bucket and set its policies.
3. The admin e-mail address(es) for `/admin/blogs/` and `BLOG_ADMIN_EMAIL`.
4. Whether blog data should stay in a separate project or merge into the main one (leaving `BLOG_SB_*` empty falls back to the main project).
5. Who exports and imports the existing `blog_posts` rows and images. Plan: dump the table, copy the bucket, run the setup SQL on the target, import, switch the URL/keys in `sb-config.js`, then check `/blog/`, CMS posts, images, canonicals and SEO fields.
6. Who owns Cloudflare Pages / Vercel, where `API_BASE` and the config files are deployed.
