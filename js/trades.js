/* Sum-IT trades: the same ten trades the app offers at registration.
   Single source for the signup form, the business-card tool, the
   "al op de kaart" counters and the hourly-rate calculator.

   `id` is the stored value (the app's Dutch label) and must not change:
   signups.bedrijfstype and the public trade counts are keyed by it.
   Older signups may still hold the previous generic categories
   ("Bouw / technische diensten", ...); those values stay valid text. */
(function (window) {
  "use strict";

  var TRADES = [
    { id: "Loodgieter", nl: "Loodgieter", en: "Plumber", plural: { nl: "Loodgieters", en: "Plumbers" } },
    { id: "Elektricien", nl: "Elektricien", en: "Electrician", plural: { nl: "Elektriciens", en: "Electricians" } },
    { id: "Timmerman", nl: "Timmerman", en: "Carpenter", plural: { nl: "Timmerlieden", en: "Carpenters" } },
    { id: "Stukadoor", nl: "Stukadoor", en: "Plasterer", plural: { nl: "Stukadoors", en: "Plasterers" } },
    { id: "Schilder", nl: "Schilder", en: "Painter", plural: { nl: "Schilders", en: "Painters" } },
    { id: "Dakdekker", nl: "Dakdekker", en: "Roofer", plural: { nl: "Dakdekkers", en: "Roofers" } },
    { id: "Tegelzetter", nl: "Tegelzetter", en: "Tiler", plural: { nl: "Tegelzetters", en: "Tilers" } },
    { id: "Installateur (klimaat & CV)", nl: "Installateur (klimaat & CV)", en: "Installer (HVAC & heating)", plural: { nl: "Installateurs", en: "Installers" } },
    { id: "Metselaar", nl: "Metselaar", en: "Bricklayer", plural: { nl: "Metselaars", en: "Bricklayers" } },
    { id: "Hovenier", nl: "Hovenier", en: "Landscape gardener", plural: { nl: "Hoveniers", en: "Landscape gardeners" } }
  ];

  function find(id) {
    for (var i = 0; i < TRADES.length; i++) if (TRADES[i].id === id) return TRADES[i];
    return null;
  }

  function label(id, lang, plural) {
    var t = find(id);
    if (!t) return id;
    var l = lang === "en" ? "en" : "nl";
    return plural ? t.plural[l] : t[l];
  }

  /* Renders the trades into a <select>. Options already in the markup are
     kept: the ones before an option marked data-trades-after stay on top
     (e.g. "Kies…"), that option and the ones after it stay at the bottom
     (e.g. "Anders"). The current selection survives a language switch. */
  function fill(select, lang) {
    if (!select) return;
    var current = select.value;
    Array.prototype.slice.call(select.querySelectorAll("option[data-trade]")).forEach(function (o) {
      select.removeChild(o);
    });
    var anchor = select.querySelector("option[data-trades-after]");
    TRADES.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t.id;
      o.textContent = label(t.id, lang);
      o.setAttribute("data-trade", "");
      select.insertBefore(o, anchor);
    });
    if (current) select.value = current;
  }

  window.SumitTrades = { list: TRADES, find: find, label: label, fill: fill };
})(window);
