# SEO / GEO / AEO pass, November 2026

Branch `chandan`, on top of the client-feedback changes (`docs/client-feedback-2026-11.md`). Nothing is committed or deployed yet.
Stack: static HTML on GitHub Pages (`CNAME`), Pages Functions under `functions/api`, demo on Vercel. There is no framework metadata system, so metadata lives in each page's `<head>`. The automated test `tests/seo.test.mjs` now keeps that metadata consistent.

## 1. Audit summary (starting point)

The site was already in good shape: 103 sitemap URLs, each with a unique title and description, a self-referencing canonical, OG tags and `lang="nl"`. Most pages already had BreadcrumbList / FAQPage / Article markup, and private pages (login, portal, beheer, admin) already had `noindex`.

### Gap analysis (ranked by severity)

| Sev. | Issue | Where | Fix | Status |
|---|---|---|---|---|
| High | Homepage HTML was **English** under `lang="nl"`; Dutch only appeared after JS ran. Crawlers that don't run JS (most AI crawlers, link previews) read the wrong language and copy. | `index.html` | `scripts/prerender-home-i18n.mjs` writes `I18N.nl` into the HTML. The rendered page is identical (261 texts compared before/after). | Done |
| High | BreadcrumbList "Home" pointed to `https://sum-it.eu/nl/`, which doesn't exist. | 50 blog/feature pages | Changed to `https://sum-it.eu/` | Done |
| Med | No Organization / WebSite markup on the homepage; `/over-ons/` Organization had no `@id` or `sameAs`. | `/`, `/over-ons/` | One shared Organization (`@id https://sum-it.eu/#organization`, legal name, Breda, socials from `config.js`) + WebSite | Done |
| Med | Public backup copies were indexable, with canonicals pointing at the real pages. | `index copy.html`, `indexv1.html`, `community/index copy.html` | `noindex, follow` | Done |
| Med | The demo iframe page was indexable. | `demo/app.html` | `noindex` | Done |
| Med | The Vercel demo duplicates production. | `sum-it-five.vercel.app` | `vercel.json`: `X-Robots-Tag: noindex` **only for that host** | Done |
| Med | Homepage title had no descriptive term; description was 190 chars. | `/` | New title/description (see keyword map) | Done |
| Med | Breadcrumbs visible but not marked up | 32 articles | BreadcrumbList generated from the visible H1 + canonical | Done |
| Med | Community FAQ visible, but no markup | `/community/` | FAQPage generated from the visible Q&A | Done |
| Med | Invoicing page didn't answer the common invoicing questions | `/functies/facturen/` | Visible 5-question FAQ (NL+EN) + FAQPage + 2 contextual blog links | Done (copy needs approval) |
| Low | No `og:site_name` / `twitter:card` anywhere; privacy page had no OG tags | 103 pages | Added | Done |
| Low | 17 titles over 65 chars; 6 descriptions over 160 | blog, team, facturen, uurtarief tool | Shortened the brand suffix; condensed the descriptions | Done |
| Low | Homepage loaded unused CSS: an unused icon stylesheet, Material Symbols, 11 invoice font families (3 designs need 2) | `/` | Removed / trimmed | Done |
| Low | `lastmod` was stale for changed pages | `sitemap.xml` | `/`, `/prijzen/`, `/functies/facturen/` → 2026-11-01 | Done |
| Med | **Two pages compete for "bonnetjes scannen"** | `/bonnetjes-scannen.html` vs `/functies/bonnetjes-scannen/` | Merge into one, or point one canonical at the other. GitHub Pages can't 301, so this needs a decision. | Open: decision |
| Med | CMS blog posts (`/blog/post.html?slug=`) are JS-only and not in the sitemap | blog CMS | Generate static pages or a sitemap from Supabase at deploy time | Open: needs DB access / build step |
| Low | ~30 newer articles have only 1–2 contextual inbound links (no orphans: all are linked from `/blog/`) | blog | Add "Lees ook" links between related articles | Roadmap |
| Low | Team page: first names only, so no Person markup | `/team/` | Add Person markup once full names / LinkedIn profiles are approved | Needs info |

Checked and left as is:
- `robots.txt` (allows all crawlers, blocks only `/admin.html`, sitemap declared).
- hreflang: EN is a client-side switch on the same URL, so there are no alternate URLs to declare.
- `blog/post.js`, which already sets canonical/OG/BlogPosting and `noindex` for empty or preview states.
- No redirect chains in the repo; GitHub Pages serves files directly.

## 2. Keyword / intent map (hypotheses)

**No keyword tool data was available, so search volumes and difficulty are unknown.** Every primary term below is a hypothesis to validate in Search Console (queries/impressions) or a keyword tool before content is rewritten around it.

| URL | Intent | Primary topic (hypothesis) | Questions it should answer | Gap |
|---|---|---|---|---|
| `/` | Navigational / commercial | boekhoudapp voor zzp'ers en vakmensen | Wat is Sum-IT? Voor wie? Wat kost het? | Fixed language and entity markup |
| `/functies/` | Commercial | functies boekhoudapp zzp | Wat kan Sum-IT? | None found |
| `/functies/facturen/` | Commercial | factuur maken zzp / factuur ontwerpen | Logo/kleur? Welke ontwerpen? Wat staat op een factuur? | FAQ added; intro copy still placeholder |
| `/functies/bonnetjes-scannen/` + `/bonnetjes-scannen.html` | Commercial | bonnetjes scannen app | Hoe werkt scannen? Btw? | **Same intent on two URLs** |
| `/functies/btw-apart-zetten/` | Commercial | btw apart zetten zzp | Hoeveel opzij zetten? | None found |
| `/functies/projecten/` | Commercial | winst per klus / projectadministratie | Welke klus verdient? | None found |
| `/prijzen/` | Transactional | wat kost Sum-IT / boekhoudapp prijs | Prijs? Gratis? Opzegbaar? | Promo duration unconfirmed, so no FAQ entry for it |
| `/voor/zzp/`, `/voor/aannemers/`, `/voor/boekhouders/` | Commercial | boekhoudapp zzp / aannemers / software voor boekhouders | Fit for my role? Bookkeeper export? | None found |
| `/community/` | Informational | netwerk vakmensen / onderaannemer vinden | Is het live? Wie kan meedoen? | Markup added |
| `/team/`, `/over-ons/` | Navigational (brand) | Sum-IT team / wie zit achter Sum-IT | Wie, waar, waarom? | Person data missing |
| `/moneybird-alternatief.html`, `/e-boekhouden-alternatief.html` | Commercial (comparison) | [tool] alternatief | Verschil? Prijs? | e-boekhouden page has 1 contextual inbound link |
| `/tools/*` | Informational / tool | uurtarief berekenen zzp, belasting opzij zetten | Calculator | None found |
| `/blog/*` (85) | Informational | one topic per article (title = topic) | Article FAQ blocks already present | Internal linking |

## 3. Implemented

**SEO**
- Homepage served in Dutch without JS. New title "Sum-IT: boekhoudapp voor zzp'ers en vakmensen" and a 146-char description. `doc_title` was updated to match, because `setLang()` overwrites the title at runtime. Added `robots`, `og:site_name`, OG image size and `twitter:card`.
- Broken breadcrumb URL fixed (50 pages); 32 articles gained BreadcrumbList.
- `noindex` on backups and the demo page; host-scoped `noindex` header for the Vercel demo.
- Titles and descriptions trimmed (17 + 6); OG on privacy; site-wide `og:site_name` / `twitter:card`.
- Sitemap `lastmod` updated only where visible content changed; XML validated.

**GEO** (machine-readable facts, first-party only)
- One Organization entity reused on `/` and `/over-ons/`. It contains only facts already published on the site: Alpha Nova B.V., Breda, the logo, and the social profiles from `config.js`.
- Homepage text is readable without JS.
- No `llms.txt`: there is no documented consumer that would use it here, and the important content is now in plain HTML anyway.
- No crawler-specific robots rules. Every crawler is allowed by default, and nothing private is crawlable without sign-in.

**AEO**
- `/functies/facturen/`: visible FAQ with direct answers, plus links to the invoice-requirements and foreign-VAT articles.
- Community FAQ marked up. Existing FAQs on pricing, about and feature pages were left as they are.
- FAQPage markup is there for machine understanding. Google currently shows FAQ rich results only for a narrow set of sites, so **no rich result is expected or promised**.

**Performance** (measured in the local preview; not Lighthouse, which isn't available here)

| Homepage | Before | After |
|---|---|---|
| Render-blocking stylesheets | 11 | 9 |
| Google Font families requested | 13 | 3 |
| External requests | 14 | 12 |
| CLS | 0 | 0 |
| LCP | not reported by this embedded browser | not reported by this embedded browser |

Field data (CrUX / PageSpeed Insights on the live domain) is the right baseline; see roadmap.

**Images:** the audit found one homepage image without dimensions (footer logo) and no meaningful images missing `alt`. Decorative logo marks use `alt=""`.

## 4. Files

- **New:**
  - `scripts/prerender-home-i18n.mjs` (run after editing homepage texts in `js/index.js`; the test fails if you forget)
  - `tests/seo.test.mjs`
  - `vercel.json`
  - this report
- **Changed:**
  - `index.html`, `js/index.js` (title strings), `over-ons/index.html`, `community/index.html`
  - `functies/facturen/index.html`, `components/invoice/gallery.css`
  - `privacy.html`, `demo/app.html`, the three backup files, `sitemap.xml`
  - head-only edits on ~100 pages (breadcrumb URL, social tags, titles/descriptions)

## 5. Tests

`node --test tests/seo.test.mjs tests/links.test.mjs tests/invoice-calc.test.mjs`: **21/21 pass**. The SEO test checks every sitemap URL for:
- the file exists;
- no `noindex`;
- canonical equals its own URL;
- title, description and OG tags present;
- unique titles and descriptions;
- exactly one H1;
- JSON-LD parses and every `sum-it.eu` URL in it resolves;
- the homepage prerender is up to date.

Browser checks:
- Homepage: rendered text identical to before; EN switch works; invoice designs, promo, signup form and icons work; no JS errors.
- `/functies/facturen/`: FAQ shows in NL and EN; the gallery still has 10 designs per series.

Not done: Google's Rich Results Test / Schema.org validator. They need a public URL, so run them on the live site after deploy.

## 6. Needs the account owner

1. **Google Search Console** (domain property `sum-it.eu`; the site is verified via `google92a09bc40aa07451.html`):
   - submit `https://sum-it.eu/sitemap.xml`;
   - use URL inspection → "Request indexing" for `/`, `/prijzen/`, `/functies/facturen/`;
   - check Page indexing for the backup URLs dropping out;
   - check Enhancements for Breadcrumb errors clearing.
2. **Bing Webmaster Tools**: import the site from Search Console and submit the sitemap. IndexNow isn't worth adding without a build/deploy hook; it can be done later from Cloudflare (Crawler Hints) if hosting moves there.
3. **Cloudflare / CDN** (if in front of the site): check that "Block AI bots" / Bot Fight Mode are set as the business wants. Either can override `robots.txt` for AI crawlers.
4. **Vercel**: confirm the demo project's domain is `sum-it-five.vercel.app`. Otherwise update the host in `vercel.json`.
5. **Analytics**: no analytics script is installed in this repo, so there was nothing to extend. Measure with GSC (clicks, impressions, CTR per page, queries) plus the signup count from `/api/stats/public`. Add an analytics tool only after a consent decision; AI-assistant referrals (chatgpt.com, perplexity.ai, …) can then be segmented by referrer.

## 7. Business clarifications needed

- Which URL should own "bonnetjes scannen" (see the gap table).
- Approval of the new invoicing FAQ copy. The logo answer relies on the client's statement that invoices carry the company logo.
- Full names / roles / LinkedIn for the team, if Person markup is wanted.
- The promotion duration. Until it's known, the pricing FAQ doesn't describe the promotion.

## 8. Roadmap (in order)

1. Deploy, then run the Rich Results Test and PageSpeed Insights on `/`, `/prijzen/`, `/functies/facturen/` and one article; record the baselines here.
2. Decide on the bonnetjes-scannen duplicate.
3. Get CMS posts crawlable: build-time static pages or a sitemap generated from Supabase.
4. Internal links: add 2–3 "Lees ook" links to each of the ~30 weakly linked articles (list from the audit script in this report's history), and link `/e-boekhouden-alternatief.html` from `/prijzen/`.
5. After 4–8 weeks of GSC data, validate the keyword hypotheses above and adjust titles where impressions show a different intent.
6. Replace the placeholder intro copy on `/functies/facturen/` with approved copy.
7. Consolidate `css/index.css` (~9k lines) and self-host DM Sans to remove render-blocking third-party CSS. Measure first.
