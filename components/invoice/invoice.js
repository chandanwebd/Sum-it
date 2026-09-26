/* Sum-IT sample invoice (marketing visual).
 *
 * Renders an example invoice with the same fields and layout as the app's
 * invoice PDF ("Kantoor" style: invoices/pdf.py): sender + IBAN, bill-to,
 * number, invoice/due date, reference, lines (qty, unit price, VAT %, amount
 * incl. VAT), net total, VAT per rate, discount, total, payment panel
 * (pay before, amount, IBAN, account name, reference, QR) and terms.
 * All amounts are computed from the line items, so the numbers always add up.
 *
 * Usage: <div data-invoice></div>  (+ optional data-invoice-open="#dialog-id"
 * on a button to show the full invoice in a <dialog>).
 * Language follows <html lang> (nl/en) and re-renders when it changes.
 */
(function (window, document) {
  "use strict";

  var VAT = 0.21;
  var DATA = {
    number: "2026-0142",
    invoiceDate: "2026-09-14",
    dueDate: "2026-10-14",
    reference: "PO-3391",
    discount: 100,
    skonto: { pct: 2, until: "2026-09-24" },
    iban: "NL91 ABNA 0417 1643 00",
    sender: {
      name: { nl: "Jouw Bedrijf B.V.", en: "Your Company B.V." },
      tagline: { nl: "Installatie & onderhoud", en: "Installation & maintenance" },
      lines: ["Voorbeeldstraat 12", "1234 AB Utrecht"],
      vat: "NL000099998B57",
      kvk: "12345678",
      email: "facturen@jouwbedrijf.nl"
    },
    recipient: {
      name: { nl: "De Klant B.V.", en: "The Client B.V." },
      lines: ["Klantlaan 8", "5611 AB Eindhoven"],
      vat: "NL001234567B01"
    },
    lines: [
      { d: { nl: "Montage-uren (2 monteurs)", en: "Installation hours (2 fitters)" }, q: 16, u: { nl: "uur", en: "hr" }, p: 62 },
      { d: { nl: "Wandpaneel HMPE 10 mm, wit", en: "HMPE wall panel 10 mm, white" }, q: 12, u: { nl: "m²", en: "m²" }, p: 74.5 },
      { d: { nl: "Afwerkprofiel RVS, geborsteld", en: "Stainless finishing profile" }, q: 36, u: { nl: "m", en: "m" }, p: 18.9 },
      { d: { nl: "Inmeten en voorbereiding", en: "Measuring and preparation" }, q: 1, u: { nl: "post", en: "item" }, p: 185 }
    ]
  };

  var L = {
    nl: {
      invoice: "Factuur", billTo: "Factuuradres", invoiceDate: "Factuurdatum", dueDate: "Vervaldatum", reference: "Referentie",
      description: "Omschrijving", qty: "Aantal", unitPrice: "Stuksprijs", vat: "Btw", amount: "Bedrag",
      net: "Subtotaal", discount: "Korting", total: "Totaal", payBefore: "Te betalen vóór", accountName: "Ten name van",
      payRef: "Kenmerk", scan: "Scan om te betalen", terms: "Voorwaarden", kvk: "KVK",
      skonto: "Betalingskorting: {p}% bij betaling vóór {d}.", note: "Vermeld het factuurnummer bij betaling.",
      calculated: "Totalen automatisch berekend", label: "Voorbeeldfactuur", qr: "Betaal-QR (illustratie)"
    },
    en: {
      invoice: "Invoice", billTo: "Bill to", invoiceDate: "Invoice date", dueDate: "Due date", reference: "Reference",
      description: "Description", qty: "Qty", unitPrice: "Unit price", vat: "VAT", amount: "Amount",
      net: "Net total", discount: "Discount", total: "Total", payBefore: "Pay before", accountName: "Account name",
      payRef: "Reference", scan: "Scan to pay", terms: "Terms", kvk: "Reg. no.",
      skonto: "Early payment discount: {p}% if paid by {d}.", note: "Please quote the invoice number with your payment.",
      calculated: "Totals calculated automatically", label: "Sample invoice", qr: "Payment QR (illustration)"
    }
  };

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- formatting ---------- */

  function round2(n) { return Math.round(n * 100) / 100; }
  function money(v, lang) {
    return new Intl.NumberFormat(lang === "en" ? "en-GB" : "nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }
  function qty(v, lang) { return new Intl.NumberFormat(lang === "en" ? "en-GB" : "nl-NL").format(v); }
  function date(iso, lang) {
    var p = iso.split("-");
    return lang === "en" ? iso : p[2] + "/" + p[1] + "/" + p[0];
  }
  function lang() { return (document.documentElement.lang || "nl").slice(0, 2) === "en" ? "en" : "nl"; }

  function totals() {
    var net = 0, incl = 0;
    var rows = DATA.lines.map(function (l) {
      var ex = round2(l.q * l.p);
      var inc = round2(ex * (1 + VAT));
      net += ex; incl += inc;
      return { line: l, ex: ex, inc: inc };
    });
    net = round2(net);
    var vat = round2(net * VAT);
    return { rows: rows, net: net, vat: vat, discount: DATA.discount, total: round2(net + vat - DATA.discount) };
  }

  /* ---------- DOM helpers ---------- */

  function h(tag, cls, children, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function lines(arr) {
    var out = [];
    arr.forEach(function (t, i) { if (i) out.push(h("br")); out.push(t); });
    return out;
  }
  function amount(value, lng, cls) {
    return h("span", "inv-num" + (cls ? " " + cls : ""), [money(value, lng)], { "data-amount": String(value) });
  }

  /* Deterministic pseudo-QR: recognisable as a payment code, deliberately not scannable. */
  function qr(seed, label) {
    var n = 25, s = 0, i, d = "";
    for (i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var on, inFinder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      if (inFinder) {
        var lx = x > n - 8 ? x - (n - 7) : x, ly = y > n - 8 ? y - (n - 7) : y;
        on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
      } else if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) on = false;
      else on = rnd() > 0.53;
      if (on) d += "M" + x + " " + y + "h1v1h-1z";
    }
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + n + " " + n);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    svg.innerHTML = '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#14181c"/>';
    return svg;
  }

  /* ---------- render ---------- */

  function render(host) {
    var lng = lang(), t = L[lng], T = totals();
    var S = DATA.sender, R = DATA.recipient;

    var top = h("div", "inv-top", [
      h("div", "inv-brand", [
        h("span", "inv-logo", ["JB"], { "aria-hidden": "true" }),
        h("span", "inv-brand-name", [h("b", null, [S.name[lng]]), h("small", null, [S.tagline[lng]])])
      ]),
      h("div", "inv-sender", lines(S.lines.concat([t.vat.toUpperCase() + ": " + S.vat, t.kvk + ": " + S.kvk, "IBAN: " + DATA.iban])))
    ]);

    var parties = h("div", "inv-parties", [
      h("div", "inv-to", [
        h("span", "inv-lab", [t.billTo]),
        h("b", null, [R.name[lng]]),
        h("span", null, lines(R.lines)),
        h("span", null, [t.vat.toUpperCase() + ": " + R.vat])
      ]),
      h("dl", "inv-meta", [
        h("div", null, [h("dt", null, [t.invoiceDate]), h("dd", null, [date(DATA.invoiceDate, lng)])]),
        h("div", null, [h("dt", null, [t.dueDate]), h("dd", null, [date(DATA.dueDate, lng)])]),
        h("div", null, [h("dt", null, [t.reference]), h("dd", null, [DATA.reference])])
      ])
    ]);

    var title = h("h3", "inv-title", [t.invoice + " ", h("span", null, [DATA.number])]);

    var body = h("tbody");
    T.rows.forEach(function (r, i) {
      var l = r.line;
      var tr = h("tr", null, [
        h("td", "inv-d", [l.d[lng], h("span", "inv-calc", [qty(l.q, lng) + " " + l.u[lng] + " × € " + money(l.p, lng) + " · " + Math.round(VAT * 100) + "%"])]),
        h("td", "inv-q", [qty(l.q, lng) + " " + l.u[lng]]),
        h("td", "inv-p", [money(l.p, lng)]),
        h("td", "inv-v", [Math.round(VAT * 100) + "%"]),
        h("td", "inv-a", [amount(r.inc, lng)])
      ]);
      tr.style.setProperty("--i", i);
      body.appendChild(tr);
    });
    var table = h("table", "inv-lines", [
      h("thead", null, [h("tr", null, [
        h("th", "inv-d", [t.description], { scope: "col" }),
        h("th", "inv-q", [t.qty], { scope: "col" }),
        h("th", "inv-p", [t.unitPrice], { scope: "col" }),
        h("th", "inv-v", [t.vat], { scope: "col" }),
        h("th", "inv-a", [t.amount], { scope: "col" })
      ])]),
      body
    ]);

    var sum = h("div", "inv-sum", [
      h("span", "inv-badge", [t.calculated], { "aria-hidden": "true" }),
      h("dl", "inv-totals", [
        h("div", null, [h("dt", null, [t.net]), h("dd", null, [amount(T.net, lng)])]),
        h("div", null, [h("dt", null, [t.vat + " " + Math.round(VAT * 100) + "%"]), h("dd", null, [amount(T.vat, lng)])]),
        h("div", null, [h("dt", null, [t.discount]), h("dd", null, ["−", amount(T.discount, lng)])]),
        h("div", "inv-grand", [h("dt", null, [t.total + " (EUR)"]), h("dd", null, [amount(T.total, lng)])])
      ])
    ]);

    var pay = h("div", "inv-pay", [
      h("div", "inv-pay-hd", [h("span", null, [t.payBefore]), h("b", null, [date(DATA.dueDate, lng)])]),
      h("div", "inv-pay-body", [
        h("dl", "inv-pay-det", [
          h("div", null, [h("dt", null, [t.amount]), h("dd", null, ["EUR ", amount(T.total, lng)])]),
          h("div", null, [h("dt", null, ["IBAN"]), h("dd", "inv-mono", [DATA.iban])]),
          h("div", null, [h("dt", null, [t.accountName]), h("dd", null, [S.name[lng]])]),
          h("div", null, [h("dt", null, [t.payRef]), h("dd", "inv-mono", [DATA.number])])
        ]),
        h("div", "inv-qr", [qr(DATA.number + DATA.iban, t.qr), h("em", null, [t.scan])])
      ])
    ], { role: "group", "aria-label": t.payBefore + " " + date(DATA.dueDate, lng) });

    var terms = h("div", "inv-terms", [
      h("span", "inv-lab", [t.terms]),
      h("p", null, [t.skonto.replace("{p}", DATA.skonto.pct).replace("{d}", date(DATA.skonto.until, lng))]),
      h("p", null, [t.note])
    ]);

    var paper = h("article", "inv-paper", [top, parties, title, table, sum, pay, terms], { "aria-label": t.label + " " + DATA.number });
    host.textContent = "";
    host.appendChild(paper);
    return paper;
  }

  /* ---------- motion ---------- */

  function countUp(paper) {
    var nodes = paper.querySelectorAll(".inv-sum [data-amount], .inv-pay [data-amount]");
    var lng = lang(), start = null, dur = 900;
    function frame(ts) {
      if (!start) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      nodes.forEach(function (n) { n.textContent = money(round2(+n.getAttribute("data-amount") * e), lng); });
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* Lines slide in, totals count up, then the payment panel and QR appear. */
  function play(paper) {
    if (reduced || paper.classList.contains("is-live")) return;
    paper.classList.add("is-live");
    var rows = paper.querySelectorAll(".inv-lines tbody tr").length;
    setTimeout(function () { countUp(paper); }, 250 + rows * 90);
    setTimeout(function () { paper.classList.add("is-paid"); }, 1250 + rows * 90);
  }

  function mount(host) {
    var paper = render(host);
    var animate = !reduced && "IntersectionObserver" in window && host.hasAttribute("data-invoice-animate");
    if (!animate) return;
    paper.classList.add("is-armed");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { play(host.querySelector(".inv-paper")); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(host);
  }

  function rerenderAll() {
    document.querySelectorAll("[data-invoice]").forEach(function (host) {
      var wasLive = !!host.querySelector(".inv-paper.is-live, .inv-paper:not(.is-armed)");
      var paper = render(host);
      if (!wasLive && host.hasAttribute("data-invoice-animate") && !reduced) paper.classList.add("is-armed");
      else paper.classList.add("is-live", "is-paid");
    });
  }

  function wireDialogs() {
    document.querySelectorAll("[data-invoice-open]").forEach(function (btn) {
      var dlg = document.querySelector(btn.getAttribute("data-invoice-open"));
      if (!dlg || typeof dlg.showModal !== "function") { btn.hidden = true; return; }
      btn.addEventListener("click", function () {
        var host = dlg.querySelector("[data-invoice]");
        if (host) render(host).classList.add("is-live", "is-paid");
        dlg.showModal();
        var close = dlg.querySelector("[data-invoice-close]");
        if (close) close.focus();
      });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
      dlg.querySelectorAll("[data-invoice-close]").forEach(function (c) { c.addEventListener("click", function () { dlg.close(); }); });
    });
  }

  function init() {
    document.querySelectorAll("[data-invoice]").forEach(function (host) {
      if (!host.closest("dialog")) mount(host);
    });
    wireDialogs();
    new MutationObserver(rerenderAll).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.SumitInvoice = { render: render, totals: totals, data: DATA };
})(window, document);
