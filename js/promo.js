/* Sum-IT promotion text (homepage + /prijzen/).
   Fills every [data-promo] element with SITE_CFG.offer.promo (config.js) in
   the page language, and hides every [data-promo-block] when
   SITE_CFG.offer.promoActive is false. The HTML keeps a Dutch fallback, so
   the text is there without JavaScript too. Follows the EN/NL switch by
   watching <html lang>. */
(function () {
  "use strict";
  var cfg = (window.SITE_CFG && window.SITE_CFG.offer) || {};

  function render() {
    var lang = (document.documentElement.lang || "nl").slice(0, 2) === "en" ? "en" : "nl";
    if (cfg.promoActive === false) {
      document.querySelectorAll("[data-promo-block]").forEach(function (el) { el.style.display = "none"; });
    }
    var text = cfg.promo && cfg.promo[lang];
    if (!text) return;
    document.querySelectorAll("[data-promo]").forEach(function (el) {
      if (el.innerHTML !== text) el.innerHTML = text; /* trusted: site config */
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
  if (window.MutationObserver) {
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
})();
