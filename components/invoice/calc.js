/* Sum-IT invoice arithmetic, shared by the homepage sample invoice
 * (invoice.js) and the 32 invoice/quote designs (styles.js).
 *
 * Dutch invoice rules used here:
 *  - unit prices are excluding VAT; a line amount is quantity × unit price;
 *  - an invoice discount lowers the taxable amount, so it is applied BEFORE VAT;
 *  - VAT is calculated once on the taxable amount and rounded to cents;
 *  - total = taxable amount + VAT.
 *
 * Browser: window.SumitInvoiceCalc.compute(lines, { vatRate, discount })
 * Node (tests): require("./calc.js").compute(...)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SumitInvoiceCalc = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Round half away from zero to cents; the epsilon keeps 1.005 → 1.01. */
  function round2(n) {
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
  }

  /* lines: [{ q: quantity, p: unit price excl. VAT }, ...] */
  function compute(lines, opts) {
    opts = opts || {};
    var rate = Number(opts.vatRate);
    if (!(rate >= 0)) throw new Error("vatRate is required");
    var rows = lines.map(function (l) {
      return { line: l, amount: round2(Number(l.q) * Number(l.p)) };
    });
    var subtotal = round2(rows.reduce(function (s, r) { return s + r.amount; }, 0));
    var discount = round2(Math.min(Math.max(Number(opts.discount) || 0, 0), subtotal));
    var taxable = round2(subtotal - discount);
    var vat = round2(taxable * rate);
    return {
      rows: rows,
      subtotal: subtotal,
      discount: discount,
      taxable: taxable,
      vatRate: rate,
      vat: vat,
      total: round2(taxable + vat)
    };
  }

  return { compute: compute, round2: round2 };
});
