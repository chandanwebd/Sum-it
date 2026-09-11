/* Shared helpers for the Pages Functions: welcome mail + once-only guard.
   Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, MAIL_FROM
   Optional: ADMIN_NOTIFY_EMAIL (comma-separated; default admin.alpha.nova@gmail.com) */

/* Emails the internal team the moment a new signup is stored. Fire-and-forget:
   any failure is swallowed so it can never block or fail the signup itself.
   Reuses the same Brevo key/sender as the welcome mail. */
export async function notifyAdmin(env, s) {
  if (!env.BREVO_API_KEY) return;
  const to = String(env.ADMIN_NOTIFY_EMAIL || 'admin.alpha.nova@gmail.com')
    .split(',').map(e => ({ email: e.trim() })).filter(x => x.email);
  if (!to.length) return;
  const esc = v => String(v == null || v === '' ? '—' : v).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const roleLabel = s.rol === 'boekhouder' ? 'Bookkeeper' : 'Entrepreneur';
  const subjectLabel = s.rol === 'boekhouder' ? 'New Boekhouder' : 'New Ondernemer';
  const rows = [
    ['Role', roleLabel], ['Name', s.naam], ['Email', s.email],
    ['Company type', s.bedrijfstype], ['Works with bookkeeper', s.boekhouder],
    ['Phone', s.telefoon], ['City', s.city || s.stad], ['Language', s.taal],
    ['Source', s.source], ['Referral code', s.ref_code], ['Referred by', s.referred_by]
  ].map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#64748B">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join('');
  const html = `<div style="font-family:sans-serif;max-width:540px">
<h2 style="margin:0 0 6px">New Sum-IT signup — ${roleLabel}</h2>
<p style="color:#64748B;margin:0 0 14px">A new profile was just created on sum-it.eu.</p>
<table style="font-size:14px;border-collapse:collapse">${rows}</table>
<p style="margin-top:16px"><a href="https://sum-it.eu/beheer.html">Open the admin dashboard →</a></p></div>`;
  const from = env.MAIL_FROM || 'Sum-IT <hallo@sum-it.eu>';
  const fm = from.match(/^(.*)<(.+)>$/) || [null, 'Sum-IT', from];
  const body = {
    sender: { name: fm[1].trim(), email: fm[2].trim() }, to,
    subject: subjectLabel, htmlContent: html
  };
  if (s.email) body.replyTo = { email: s.email, name: s.naam || undefined };
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => {});
}

export function sbHeaders(env, extra = {}) {
  return { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
           'Content-Type': 'application/json', ...extra };
}

// ---- Branded welcome email (email-safe: tables + inline styles) ----
const MAIL_LOGO = 'https://sum-it.eu/sum-it-logo-h-white.png';
const C = { green: '#00BC7D', navy: '#1b1b4a', ink: '#3a3a55', mute: '#8a8ca0',
            mint: '#e9fbf3', mintB: '#bff0dc', card: '#f4f5f9' };

function welcomeMail(t, pos, link, setup) {
  const cta = setup
    ? `<tr><td style="padding:2px 40px 0">
         <a href="${setup}" style="display:inline-block;background:${C.green};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:15px 32px;border-radius:999px">${t.ctaLabel} &rarr;</a>
         <p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:${C.mute}">${t.ctaHint} <a href="https://sum-it.eu/login.html" style="color:${C.green};text-decoration:underline">${t.loginWord}</a>.</p>
       </td></tr>`
    : `<tr><td style="padding:2px 40px 0"><p style="margin:0;font-size:15px;line-height:1.55;color:${C.ink}">${t.portalFallback} <a href="https://sum-it.eu/portal.html" style="color:${C.green};font-weight:bold;text-decoration:none">${t.portalWord}</a>.</p></td></tr>`;
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;margin:0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:${C.navy};padding:26px 32px;text-align:center">
    <img src="${MAIL_LOGO}" alt="Sum-IT" width="168" style="display:block;margin:0 auto;height:auto;border:0;max-width:168px">
  </td></tr>
  <tr><td style="padding:36px 40px 0">
    <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;color:${C.navy};font-weight:800">${t.welcome}</h1>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:${C.ink}">${t.intro}</p>
  </td></tr>
  <tr><td style="padding:0 40px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${C.mint};border:1px solid ${C.mintB};border-radius:12px;padding:14px 26px;text-align:center">
        <div style="font-size:12px;color:#0a8f5f;text-transform:uppercase;letter-spacing:.1em;font-weight:bold">${t.queueLabel}</div>
        <div style="font-size:38px;color:${C.navy};font-weight:800;line-height:1.15">#${pos}</div>
      </td></tr></table>
  </td></tr>
  ${cta}
  <tr><td style="padding:26px 40px 0">
    <p style="margin:0 0 10px;font-size:15px;line-height:1.5;color:${C.ink}">${t.refText}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${C.card};border-radius:10px;padding:14px 18px">
        <a href="${link}" style="color:${C.green};text-decoration:none;font-weight:bold;font-size:15px;word-break:break-all">${link}</a>
      </td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 40px 34px">
    <p style="margin:0;font-size:16px;line-height:1.5;color:${C.ink}">${t.signoff}<br><strong style="color:${C.navy}">${t.team}</strong></p>
  </td></tr>
  <tr><td style="background:${C.card};padding:18px 40px;text-align:center;border-top:1px solid #e8eaf2">
    <p style="margin:0;font-size:12px;line-height:1.5;color:${C.mute}">${t.footer}</p>
  </td></tr>
</table>
</td></tr></table>`;
  return { subject: t.subject(pos), html };
}

const MAIL_T = {
  nl: {
    subject: p => `Je staat op plek #${p} — welkom bij de Founding 500`,
    welcome: 'Welkom bij Sum-IT!',
    intro: 'Je aanmelding is bevestigd. Dit is jouw plek in de rij:',
    queueLabel: 'Jouw plek', ctaLabel: 'Stel je wachtwoord in &amp; open je portal',
    ctaHint: 'E&eacute;n klik bevestigt meteen je e-mailadres. Link verlopen? Gebruik "wachtwoord vergeten" op de',
    loginWord: 'loginpagina', portalFallback: 'Bekijk je plek in je', portalWord: 'member-portal',
    refText: 'Dit is jouw persoonlijke link &mdash; elke vriend die via jou meedoet, telt:',
    signoff: 'Samen naar de top,', team: 'Team Sum-IT',
    footer: '&copy; 2026 Sum-IT &middot; Een product van Alpha Nova B.V. &middot; Je gegevens blijven in de EU (AVG).'
  },
  en: {
    subject: p => `You're #${p} in the queue — welcome to the Founding 500`,
    welcome: 'Welcome to Sum-IT!',
    intro: 'Your signup is confirmed. Here is your spot in the queue:',
    queueLabel: 'Your spot', ctaLabel: 'Set your password &amp; open your portal',
    ctaHint: 'One click also confirms your email. Link expired? Use "forgot password" on the',
    loginWord: 'login page', portalFallback: 'See your spot in your', portalWord: 'member portal',
    refText: 'This is your personal link &mdash; every friend who joins through it counts:',
    signoff: 'Together to the top,', team: 'Team Sum-IT',
    footer: '&copy; 2026 Sum-IT &middot; A product of Alpha Nova B.V. &middot; Your data stays in the EU (GDPR).'
  }
};

export const MAILS = {
  nl: (pos, link, setup) => welcomeMail(MAIL_T.nl, pos, link, setup),
  en: (pos, link, setup) => welcomeMail(MAIL_T.en, pos, link, setup)
};

/* Creates the auth user (e-mail pre-confirmed) and returns a one-click
   set-password link for the welcome mail. Null on any failure. */
export async function createPortalLink(env, email) {
  try {
    await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST', headers: sbHeaders(env),
      body: JSON.stringify({ email, email_confirm: true })
    }).catch(() => {}); // 422 'already exists' is fine
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST', headers: sbHeaders(env),
      body: JSON.stringify({ type: 'recovery', email })
    });
    if (!r.ok) return null;
    const j = await r.json();
    const hashed = j.hashed_token || (j.properties && j.properties.hashed_token) || null;
    if (!hashed) return null;
    // Link straight to our own page; the token is only redeemed there by JavaScript,
    // so inbox link-scanners cannot burn it and there is no Supabase redirect screen.
    return 'https://sum-it.eu/wachtwoord.html?token_hash=' + encodeURIComponent(hashed) + '&type=recovery';
  } catch { return null; }
}

/* Returns true exactly once per confirmed signup (guards double welcome mails). */
export async function markWelcomed(env, email) {
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/mark_welcomed`, {
      method: 'POST', headers: sbHeaders(env), body: JSON.stringify({ p_email: email.toLowerCase() })
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch { return false; }
}

/* Sends the welcome mail via Brevo (no-op without key). */
export async function sendWelcome(env, email, pos, refCode, taal) {
  if (!env.BREVO_API_KEY || !pos) return;
  const offset = Number(env.DISPLAY_OFFSET ?? 143);
  const link = 'https://sum-it.eu/?ref=' + refCode;
  const setup = await createPortalLink(env, email);
  const m = (MAILS[taal] || MAILS.nl)(pos + offset, link, setup);
  const from = env.MAIL_FROM || 'Sum-IT <hallo@sum-it.eu>';
  const fm = from.match(/^(.*)<(.+)>$/) || [null, 'Sum-IT', from];
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { name: fm[1].trim(), email: fm[2].trim() }, to: [{ email }], subject: m.subject, htmlContent: m.html })
  }).catch(() => {});
}
