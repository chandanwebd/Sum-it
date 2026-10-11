// Invoice arithmetic tests. No dependencies: run with `node --test tests/`.
// Covers the shared calculator (components/invoice/calc.js) and checks that the
// homepage invoice (invoice.js) and all 32 designs (styles.js) reconcile.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import vm from "node:vm";

const root = join(fileURLToPath(import.meta.url), "../..");
const require = createRequire(import.meta.url);
const { compute, round2 } = require(join(root, "components/invoice/calc.js"));

const SAMPLE = [
  { q: 16, p: 62 },     // 992.00
  { q: 12, p: 74.5 },   // 894.00
  { q: 36, p: 18.9 },   // 680.40
  { q: 1, p: 185 },     // 185.00
];

test("line amount is quantity × unit price excl. VAT", () => {
  const r = compute(SAMPLE, { vatRate: 0.21 });
  assert.deepEqual(r.rows.map((x) => x.amount), [992, 894, 680.4, 185]);
  assert.equal(r.subtotal, 2751.4);
});

test("discount reduces the taxable amount before VAT", () => {
  const r = compute(SAMPLE, { vatRate: 0.21, discount: 100 });
  assert.equal(r.subtotal, 2751.4);
  assert.equal(r.discount, 100);
  assert.equal(r.taxable, 2651.4);
  assert.equal(r.vat, 556.79);      // 2651.40 × 21% = 556.794
  assert.equal(r.total, 3208.19);
});

test("subtotal − discount + VAT = total, and lines sum to the subtotal", () => {
  const r = compute(SAMPLE, { vatRate: 0.21, discount: 100 });
  const lines = round2(r.rows.reduce((s, x) => s + x.amount, 0));
  assert.equal(lines, r.subtotal);
  assert.equal(round2(r.subtotal - r.discount), r.taxable);
  assert.equal(round2(r.taxable + r.vat), r.total);
});

test("VAT rates 21%, 9% and 0%", () => {
  assert.equal(compute([{ q: 1, p: 100 }], { vatRate: 0.21 }).vat, 21);
  assert.equal(compute([{ q: 1, p: 100 }], { vatRate: 0.09 }).vat, 9);
  const zero = compute([{ q: 3, p: 33.33 }], { vatRate: 0 });
  assert.equal(zero.vat, 0);
  assert.equal(zero.total, 99.99);
});

test("rounding to cents, half away from zero", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(-1.005), -1.01);
  // 0.1 × 3 floating-point noise must not leak into the totals
  const r = compute([{ q: 3, p: 0.1 }], { vatRate: 0.21 });
  assert.equal(r.subtotal, 0.3);
  assert.equal(r.vat, 0.06);
  assert.equal(r.total, 0.36);
});

test("fractional quantities", () => {
  const r = compute([{ q: 2.5, p: 45 }, { q: 0.75, p: 80 }], { vatRate: 0.21 });
  assert.equal(r.subtotal, 172.5);
  assert.equal(r.vat, 36.23);       // 36.225 rounds up
  assert.equal(r.total, 208.73);
});

test("discount is clamped between 0 and the subtotal", () => {
  assert.equal(compute([{ q: 1, p: 50 }], { vatRate: 0.21, discount: 80 }).total, 0);
  assert.equal(compute([{ q: 1, p: 50 }], { vatRate: 0.21, discount: -5 }).discount, 0);
});

test("vatRate is required", () => {
  assert.throws(() => compute(SAMPLE, {}));
});

/* ---- the real components, loaded in a sandbox ---- */

function sandbox() {
  const ctx = { window: {}, Intl, Math, Number, String, Object, Array, JSON };
  ctx.self = ctx.window;
  ctx.document = {
    readyState: "loading",
    documentElement: { lang: "nl" },
    addEventListener() {},
    querySelectorAll() { return []; },
  };
  ctx.window.matchMedia = () => ({ matches: false });
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(root, "components/invoice/calc.js"), "utf8"), ctx);
  ctx.window.SumitInvoiceCalc = ctx.window.SumitInvoiceCalc || ctx.SumitInvoiceCalc;
  return ctx;
}

// "2.751,40" (nl) or "2,751.40" (en) → 2751.4
const num = (s, lang) => Number(lang === "en"
  ? String(s).replace(/,/g, "")
  : String(s).replace(/\./g, "").replace(",", "."));

test("homepage invoice (invoice.js) reconciles", () => {
  const ctx = sandbox();
  vm.runInContext(readFileSync(join(root, "components/invoice/invoice.js"), "utf8"), ctx);
  const T = ctx.window.SumitInvoice.totals();
  assert.deepEqual(Array.from(T.rows, (r) => r.amount), [992, 894, 680.4, 185]);
  assert.equal(T.net, 2751.4);
  assert.equal(T.discount, 100);
  assert.equal(T.taxable, 2651.4);
  assert.equal(T.vat, 556.79);
  assert.equal(T.total, 3208.19);
});

test("all 32 designs show the same reconciled invoice and quote, with sender KVK", () => {
  const ctx = sandbox();
  vm.runInContext(readFileSync(join(root, "components/invoice/styles.js"), "utf8"), ctx);
  const S = ctx.window.SumitInvoiceStyles;
  const skins = [].concat(S.sets.a, S.sets.b, S.sets.c);
  assert.equal(skins.length, 32);

  for (const lang of ["nl", "en"]) {
    for (const kind of ["invoice", "offer"]) {
      const m = S.model(kind, lang);
      const labels = m.totals.map((r) => r[0]);
      // order: subtotal, discount, taxable amount, VAT, then the grand total
      assert.equal(labels.length, 4, labels.join(" | "));
      const [sub, disc, taxable, vat] = m.totals.map((r) => Math.abs(num(r[1], lang)));
      assert.equal(sub, 2751.4);
      assert.equal(disc, 100);
      assert.equal(taxable, 2651.4);
      assert.equal(vat, 556.79);
      assert.equal(num(m.grand[1], lang), 3208.19);
      const lineSum = round2(m.lines.reduce((s, l) => s + l.total_excl_vat, 0));
      assert.equal(lineSum, sub);
      m.lines.forEach((l) => assert.equal(l.total_excl_vat, round2(l.quantity * l.unit_price)));
      assert.ok(m.senderLines.some((l) => /^(KVK|Reg\. no\.): 12345678$/.test(l)), "sender KVK missing");
    }
    // every design renders without throwing and prints the grand total
    for (const skin of skins) {
      const out = skin.render(S.model("invoice", lang));
      const html = typeof out === "string" ? out : out.html;
      assert.ok(html.includes(lang === "nl" ? "3.208,19" : "3,208.19"), skin.id + " " + lang);
      assert.ok(!html.includes("3.229,19") && !html.includes("3,229.19"), skin.id + " shows old total");
    }
  }
});
