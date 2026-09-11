/* Sum-IT site-wide language switch.
   Homepage carries its own I18N dictionary; every other page loads this file.
   Page-specific strings live in window.PAGE_I18N = {nl:{...}, en:{...}}. */
(function () {
  'use strict';
  if (window.__SUMIT_I18N__) return;
  window.__SUMIT_I18N__ = true;

  var CHROME = {
    nl: {
      c_blog: 'Blog',
      c_feat: 'Functies',
      c_price: 'Prijzen',
      c_comm: 'Community',
      c_tools: 'Tools',
      c_home: 'Home',
      c_login: 'Inloggen',
      c_cta: 'Gratis profiel',
      c_back: 'Terug',
      c_foot: 'Sum-IT is een product van Alpha Nova B.V. &middot; Alle data in de EU',
      c_foot_nl: 'Sum-IT is een product van Alpha Nova B.V. &middot; Nederland &middot; Alle data in de EU',
      c_priv: 'Privacyverklaring'
    },
    en: {
      c_blog: 'Blog',
      c_feat: 'Features',
      c_price: 'Pricing',
      c_comm: 'Community',
      c_tools: 'Tools',
      c_home: 'Home',
      c_login: 'Log in',
      c_cta: 'Free profile',
      c_back: 'Back',
      c_foot: 'Sum-IT is a product of Alpha Nova B.V. &middot; All data stays in the EU',
      c_foot_nl: 'Sum-IT is a product of Alpha Nova B.V. &middot; The Netherlands &middot; All data stays in the EU',
      c_priv: 'Privacy statement'
    }
  };

  function dict(l) {
    var out = {}, k;
    var c = CHROME[l] || CHROME.nl;
    for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) out[k] = c[k];
    var p = (window.PAGE_I18N && window.PAGE_I18N[l]) || {};
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) out[k] = p[k];
    return out;
  }

  function apply(l) {
    var d = dict(l);
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n')];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-ph')];
      if (v !== undefined) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-title')];
      if (v !== undefined) el.title = v;
    });
    var en = document.getElementById('lang-en'), nl = document.getElementById('lang-nl');
    if (en) en.classList.toggle('on', l === 'en');
    if (nl) nl.classList.toggle('on', l === 'nl');
    window.SUMIT_LANG = l;
    try { document.dispatchEvent(new CustomEvent('langchange', { detail: l })); } catch (e) {}
  }

  window.T = function (nl, en) {
    return (window.SUMIT_LANG === 'en') ? en : nl;
  };

  window.setLang = function (l) {
    l = (l === 'en') ? 'en' : 'nl';
    try { localStorage.setItem('sumit_lang', l); } catch (e) {}
    apply(l);
  };

  function mountToggle() {
    if (document.querySelector('.langs')) return;
    var host = document.querySelector('.topin') || document.querySelector('.top');
    if (!host) return;
    var box = document.createElement('div');
    box.className = 'langs';
    box.innerHTML =
      '<button type="button" id="lang-en" onclick="setLang(\'en\')">EN</button>' +
      '<button type="button" id="lang-nl" onclick="setLang(\'nl\')">NL</button>';
    host.appendChild(box);
  }

  function mountStyle() {
    if (document.getElementById('i18n-css')) return;
    var s = document.createElement('style');
    s.id = 'i18n-css';
    s.textContent =
      '.langs{display:inline-flex;gap:2px;margin-left:14px;flex:0 0 auto}' +
      '.langs button{min-height:32px;min-width:38px;padding:4px 10px;font:inherit;font-size:12px;font-weight:700;' +
      'letter-spacing:.04em;cursor:pointer;color:rgba(255,255,255,.72);background:rgba(255,255,255,.10);' +
      'border:1px solid rgba(255,255,255,.22);border-radius:8px}' +
      '.langs button+button{border-left-width:1px}' +
      '.langs button.on{color:#0F172A;background:#fff;border-color:#fff}' +
      '.langs button:focus-visible{outline:3px solid #7BE3BE;outline-offset:2px}' +
      '@media(max-width:560px){.langs{margin-left:8px}.langs button{min-width:34px;padding:4px 7px}}';
    document.head.appendChild(s);
  }

  function boot() {
    mountStyle();
    mountToggle();
    var s = 'nl';
    try { s = localStorage.getItem('sumit_lang') || 'nl'; } catch (e) {}
    window.setLang(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
