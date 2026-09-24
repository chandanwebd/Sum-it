# Shared site header

`header.html` is the single source for the site navigation. Its markup is
pre-rendered into every page between two markers, so navigation works without
JavaScript and is crawlable:

```html
<!-- site-header:start -->
<header id="site-header" class="site-header">…</header>
<!-- site-header:end -->
```

After editing `header.html`, sync every page (from the repo root):

```bash
node components/header/sync.mjs
```

The homepage copy gets in-page anchors automatically (`/#capture` → `#capture`,
and links with `data-home-href` use that value, e.g. Pricing → `#pricing`).

Each page also needs:

```html
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/components/header/header.css">
<script src="/components/header/header.js" defer></script>
```

- `data-page` on `<body>` (`features`, `pricing`, `community`, `blog`) marks
  the active item. Without it, the homepage highlights the section in view.
- Pages whose first section is a dark hero add `class="has-dark-hero"` to
  `<body>`: the bar is transparent over the hero and turns solid on scroll.
  The hero must reserve `var(--header-h)` of top space.
- The EN/NL switch calls the page's `setLang()` (`/i18n.js` or the homepage's
  `js/index.js`). Pages without a translation layer hide the switch.
- If a page only contains an empty `<header id="site-header">`, `header.js`
  fetches `header.html` as a fallback.
