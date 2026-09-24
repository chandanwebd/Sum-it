/* Shared Sum-IT site header behaviour.
   The header markup is pre-rendered into each page (see README.md); if a page
   only has an empty <header id="site-header"> it is fetched as a fallback.
   Exposes the legacy global toggleMenu()/closeMenu() used by inline handlers. */
(function (window, document) {
  var DESKTOP = window.matchMedia ? window.matchMedia("(min-width: 1081px)") : null;

  function $(id) { return document.getElementById(id); }

  function isHome() {
    return /^\/(index\.html)?$/.test(window.location.pathname);
  }

  var Header = {
    root: null,

    isOpen: function () {
      var menu = $("mobmenu");
      return !!(menu && menu.classList.contains("open"));
    },

    closeMenu: function (restoreFocus) {
      var menu = $("mobmenu");
      var burger = $("burger");
      if (!menu || !menu.classList.contains("open")) return;
      menu.classList.remove("open");
      if (Header.root) Header.root.classList.remove("menu-open");
      if (burger) {
        burger.setAttribute("aria-expanded", "false");
        if (restoreFocus === true) burger.focus();
      }
    },

    openMenu: function () {
      var menu = $("mobmenu");
      var burger = $("burger");
      if (!menu || !burger) return;
      menu.classList.add("open");
      if (Header.root) Header.root.classList.add("menu-open");
      burger.setAttribute("aria-expanded", "true");
      var first = menu.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    },

    toggleMenu: function () {
      if (Header.isOpen()) Header.closeMenu(true);
      else Header.openMenu();
    },

    syncLangState: function () {
      ["lang-en", "lang-nl"].forEach(function (id) {
        var b = $(id);
        if (b) b.setAttribute("aria-pressed", String(b.classList.contains("on")));
      });
    },

    init: function () {
      var root = $("site-header");
      if (!root || root.dataset.ready) return;
      root.dataset.ready = "true";
      Header.root = root;
      var active = document.body.getAttribute("data-page");

      /* On the homepage, section links scroll in-page instead of reloading. */
      if (isHome()) {
        root.querySelectorAll("a[data-home-href]").forEach(function (link) {
          link.setAttribute("href", link.getAttribute("data-home-href"));
        });
        root.querySelectorAll('a[href^="/#"]').forEach(function (link) {
          link.setAttribute("href", link.getAttribute("href").slice(1));
        });
      }

      root.querySelectorAll("[data-nav]").forEach(function (link) {
        var on = link.getAttribute("data-nav") === active;
        link.classList.toggle("active", on);
        if (on) link.setAttribute("aria-current", "page");
      });

      /* Pages without a translation layer get no language switch. */
      var langs = root.querySelector(".langs");
      if (langs && typeof window.setLang !== "function") langs.hidden = true;

      Header.syncLangState();
      if (window.MutationObserver) {
        var mo = new MutationObserver(Header.syncLangState);
        ["lang-en", "lang-nl"].forEach(function (id) {
          if ($(id)) mo.observe($(id), { attributes: true, attributeFilter: ["class"] });
        });
      }

      root.querySelectorAll(".mobmenu a").forEach(function (link) {
        link.addEventListener("click", function () { Header.closeMenu(false); });
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && Header.isOpen()) Header.closeMenu(true);
      });

      document.addEventListener("click", function (e) {
        if (Header.isOpen() && !root.contains(e.target)) Header.closeMenu(false);
      });

      if (DESKTOP) {
        var onChange = function (mq) { if (mq.matches) Header.closeMenu(false); };
        if (DESKTOP.addEventListener) DESKTOP.addEventListener("change", onChange);
        else if (DESKTOP.addListener) DESKTOP.addListener(onChange);
      }

      var sectionLinks = Array.prototype.slice.call(root.querySelectorAll('.menu a[href^="#"]'));
      var ticking = false;
      var updateState = function () {
        ticking = false;
        root.classList.toggle("is-scrolled", window.scrollY > 16);
        if (active || !sectionLinks.length) return;
        var current = "";
        sectionLinks.forEach(function (link) {
          var section = document.querySelector(link.getAttribute("href"));
          if (section && section.getBoundingClientRect().top <= 130) current = link.getAttribute("data-nav");
        });
        root.querySelectorAll("[data-nav]").forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("data-nav") === current);
        });
      };
      window.addEventListener("scroll", function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(updateState); }
      }, { passive: true });
      updateState();
    },

    mount: function () {
      var root = $("site-header");
      if (!root || root.dataset.mounting) return;
      root.dataset.mounting = "true";
      if (root.querySelector(".nav")) { Header.init(); return; }
      fetch("/components/header/header.html")
        .then(function (response) { if (!response.ok) throw new Error("Header unavailable"); return response.text(); })
        .then(function (html) {
          root.innerHTML = html;
          Header.init();
          /* Freshly inserted markup still needs the active language applied. */
          if (typeof window.setLang === "function") window.setLang(window.SUMIT_LANG || document.documentElement.lang || "nl");
        })
        .catch(function () { /* Leave the empty header; page content stays usable. */ });
    }
  };

  window.Header = Header;
  window.toggleMenu = Header.toggleMenu;
  window.closeMenu = function () { Header.closeMenu(false); };

  /* Wait for DOMContentLoaded so page scripts deferred after this one (e.g.
     /i18n.js at the end of <body>) have defined setLang() before init. */
  if (document.readyState === "complete") Header.mount();
  else {
    document.addEventListener("DOMContentLoaded", Header.mount);
    window.addEventListener("load", Header.mount);
  }
})(window, document);
