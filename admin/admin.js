/* Sum-IT admin shell: Supabase client + admin gate for /admin/* pages.
 *
 * Uses the blog's Supabase project (sb-config.js: BLOG_SB_URL / BLOG_SB_ANON,
 * falling back to SB_URL / SB_ANON), so the gate has its own sign-in form
 * instead of /login.html (which always uses the main project).
 *
 * The real protection is Row Level Security in Supabase (only is_admin()
 * accounts can write blog_posts or upload to blog-images, drafts are never
 * readable by visitors). This gate only decides what the browser shows.
 *
 * Page contract: #gate (status box), #app (hidden until allowed), #who,
 * [data-logout]. Requires sb-config.js and supabase-js v2.
 * Usage: SumitAdmin.ready.then(function (ctx) { ctx.sb, ctx.email });
 */
(function (window, document) {
  "use strict";

  var URL_ = window.BLOG_SB_URL || window.SB_URL;
  var KEY = window.BLOG_SB_URL ? window.BLOG_SB_ANON : window.SB_ANON;
  var sb = null;
  try {
    if (URL_ && String(URL_).indexOf("http") === 0 && window.supabase) {
      /* Own storage key, so a main-project login in this browser never mixes in. */
      sb = window.supabase.createClient(URL_, KEY, window.BLOG_SB_URL ? { auth: { storageKey: "sumit-blog-auth" } } : undefined);
    }
  } catch (e) { sb = null; }

  function $(id) { return document.getElementById(id); }
  var t = window.SumitAdminI18n ? window.SumitAdminI18n.t : function (k) { return k; };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function gate(html) {
    var g = $("gate");
    if (g) { g.innerHTML = html; g.hidden = false; }
    $("app").hidden = true;
  }

  function toast(text, isError) {
    var el = document.createElement("div");
    el.className = "adm-toast" + (isError ? " is-err" : "");
    el.setAttribute("role", isError ? "alert" : "status");
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3600);
  }

  /* ---------- sign-in / password forms ---------- */

  /* With BLOG_ADMIN_EMAIL set (sb-config.js) the form only asks for the
     password; the e-mail is sent along in a hidden field. Supabase still
     checks the password, so saving works exactly as with a full login. */
  var FIXED_EMAIL = String(window.BLOG_ADMIN_EMAIL || "").trim().toLowerCase();

  function loginForm(message) {
    gate(
      '<form class="adm-login" id="adm-login" novalidate>' +
        '<h1>' + esc(t(FIXED_EMAIL ? "login.titlePw" : "login.title")) + '</h1>' +
        '<p class="adm-sub">' + esc(t(FIXED_EMAIL ? "login.subPw" : "login.sub")) + '</p>' +
        (FIXED_EMAIL
          ? '<input type="email" id="adm-email" autocomplete="username" value="' + esc(FIXED_EMAIL) + '" hidden>'
          : '<label for="adm-email">' + esc(t("login.email")) + '</label>' +
            '<input type="email" id="adm-email" autocomplete="username" required>') +
        '<label for="adm-pw">' + esc(t("login.password")) + '</label>' +
        '<input type="password" id="adm-pw" autocomplete="current-password" required>' +
        '<div class="err" id="adm-err" role="alert">' + esc(message || "") + '</div>' +
        '<button class="btn" type="submit" id="adm-go">' + esc(t("login.submit")) + '</button>' +
        '<button class="linkbtn" type="button" id="adm-forgot">' + esc(t("login.forgot")) + '</button>' +
      '</form>'
    );
    (FIXED_EMAIL ? $("adm-pw") : $("adm-email")).focus();
    $("adm-login").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("adm-email").value.trim().toLowerCase(), pw = $("adm-pw").value;
      var err = $("adm-err");
      if (!email || !pw) { err.textContent = t(FIXED_EMAIL ? "login.missingPw" : "login.missing"); return; }
      $("adm-go").disabled = true;
      err.textContent = "";
      sb.auth.signInWithPassword({ email: email, password: pw }).then(function (r) {
        $("adm-go").disabled = false;
        if (r.error) {
          err.textContent = /confirm/i.test(r.error.message) ? t("login.confirm") : t(FIXED_EMAIL ? "login.wrongPw" : "login.wrong");
          return;
        }
        check(r.data.session);
      }, function () {
        $("adm-go").disabled = false;
        err.textContent = t("login.network");
      });
    });
    $("adm-forgot").addEventListener("click", function () {
      var email = $("adm-email").value.trim().toLowerCase();
      var err = $("adm-err");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { err.textContent = t("login.needEmail"); $("adm-email").focus(); return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/admin/blogs/" }).then(function (r) {
        err.textContent = "";
        if (r.error) {
          err.textContent = /rate limit/i.test(r.error.message) || r.error.status === 429 ? t("login.rateLimit") : t("login.resetFail", { msg: r.error.message });
          return;
        }
        toast(t("login.resetSent"));
      });
    });
  }

  function newPasswordForm() {
    gate(
      '<form class="adm-login" id="adm-reset" novalidate>' +
        '<h1>' + esc(t("reset.title")) + '</h1>' +
        '<p class="adm-sub">' + esc(t("reset.sub")) + '</p>' +
        '<label for="adm-pw1">' + esc(t("reset.label")) + '</label>' +
        '<input type="password" id="adm-pw1" autocomplete="new-password" minlength="12" required>' +
        '<div class="err" id="adm-err" role="alert"></div>' +
        '<button class="btn" type="submit" id="adm-go">' + esc(t("reset.submit")) + '</button>' +
      '</form>'
    );
    $("adm-pw1").focus();
    $("adm-reset").addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = $("adm-pw1").value;
      if (pw.length < 12) { $("adm-err").textContent = t("reset.short"); return; }
      sb.auth.updateUser({ password: pw }).then(function (r) {
        if (r.error) { $("adm-err").textContent = t("reset.fail", { msg: r.error.message }); return; }
        toast(t("reset.done"));
        history.replaceState(null, "", location.pathname + location.search);
        sb.auth.getSession().then(function (s) { check(s.data && s.data.session); });
      });
    });
  }

  /* ---------- gate ---------- */

  var resolveReady;
  var ready = new Promise(function (resolve) { resolveReady = resolve; });

  function check(session) {
    if (!session) { loginForm(); return; }
    var email = String(session.user.email || "").toLowerCase();
    gate(esc(t("gate.checking")));
    sb.rpc("is_admin").then(function (r) {
      if (r.error) {
        gate(esc(t("gate.rightsError", { msg: r.error.message })) + ' <a href="">' + esc(t("gate.retry")) + '</a>');
        return;
      }
      if (r.data !== true) {
        gate(esc(t("gate.notAdmin", { email: email })) + '<br><button class="linkbtn" type="button" data-logout>' + esc(t("gate.otherAccount")) + '</button>');
        wireLogout();
        return;
      }
      var who = $("who");
      if (who) who.textContent = email;
      $("gate").hidden = true;
      $("app").hidden = false;
      resolveReady({ sb: sb, email: email });
    });
  }

  function wireLogout() {
    document.querySelectorAll("[data-logout]").forEach(function (b) {
      if (b.dataset.wired) return;
      b.dataset.wired = "1";
      b.addEventListener("click", function () {
        if (!sb) return;
        sb.auth.signOut().then(function () { location.href = location.pathname; });
      });
    });
  }

  function start() {
    wireLogout();
    if (!sb) {
      gate(esc(t("gate.noConfig")));
      return;
    }
    var recovering = /type=recovery/.test(location.hash);
    sb.auth.onAuthStateChange(function (event) {
      if (event === "PASSWORD_RECOVERY") { recovering = true; newPasswordForm(); }
    });
    sb.auth.getSession().then(function (s) {
      if (recovering) { newPasswordForm(); return; }
      check(s.data && s.data.session);
    }).catch(function () {
      gate(esc(t("gate.noConnection")) + ' <a href="">' + esc(t("gate.retry")) + '</a>');
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.SumitAdmin = { ready: ready, esc: esc, toast: toast, client: sb };
})(window, document);
