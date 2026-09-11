/* POST /api/signup — Cloudflare Pages Function.
   Body: {naam,email,rol,bedrijfstype,boekhouder,taal,source,ref,website}
   - honeypot 'website' filled  -> silently OK
   - disposable e-mail domains  -> silently OK
   - rate limit: max 5/hour/IP (checked in Supabase)
   - inserts signup (status 'pending') with a unique ref_code
   - creates the Laposta member (list double opt-in sends the confirm mail)
   - emails the internal team a new-signup notification (see notifyAdmin)
   Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, IP_SALT, LAPOSTA_API_KEY, LAPOSTA_LIST_ID
   Optional: BREVO_API_KEY, MAIL_FROM, ADMIN_NOTIFY_EMAIL (for the admin notification) */

import { markWelcomed, sendWelcome, notifyAdmin } from './_lib.js';

const DISPOSABLE = ['mailinator.com','guerrillamail.com','10minutemail.com','yopmail.com','temp-mail.org','trashmail.com','sharklasers.com'];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ORIGIN_OK = /^https:\/\/(www\.)?sum-it\.eu$|^https:\/\/([a-z0-9-]+\.)?sum-it-website\.pages\.dev$/;
function corsHeaders(request) {
  const o = request.headers.get('Origin') || '';
  return ORIGIN_OK.test(o) ? {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  } : {};
}
export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function refCode() {
  const a = new Uint8Array(6); crypto.getRandomValues(a);
  return [...a].map(x => ALPHABET[x % ALPHABET.length]).join('');
}
function sbHeaders(env, extra = {}) {
  return { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
           'Content-Type': 'application/json', ...extra };
}

export async function onRequestPost({ request, env }) {
  const cors = corsHeaders(request);
  const json2 = (data, status = 200) => json(data, status, cors);
  let d; try { d = await request.json(); } catch { return json2({ ok: false }, 400); }
  const ok = json2({ ok: true }); // uniform response, no enumeration

  // honeypot + basic validation
  if (d.website) return ok;
  const email = String(d.email || '').trim().toLowerCase();
  const naam = String(d.naam || '').trim().slice(0, 120);
  const rol = d.rol === 'boekhouder' ? 'boekhouder' : 'ondernemer';
  const taal = d.taal === 'en' ? 'en' : 'nl';
  // Counter-signup extras (Breda balie-actie). Stored so Ian can call back.
  const telefoon  = String(d.telefoon || '').replace(/[^\d+\s()-]/g, '').trim().slice(0, 40) || null;
  const plaats    = String(d.plaats || '').trim().slice(0, 80) || null;   // vakman's own town -> city
  const stad      = String(d.stad || '').trim().slice(0, 80) || null;     // campaign city (e.g. breda)
  const vestiging = String(d.vestiging || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || null;
  if (!naam || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json2({ ok: false, error: 'invalid' }, 400);
  if (DISPOSABLE.includes(email.split('@')[1])) return ok;

  // rate limit per IP (5/hour)
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const ipHash = await sha256(ip + (env.IP_SALT || 'sumit'));
  const since = new Date(Date.now() - 3600e3).toISOString();
  try {
    const rl = await fetch(`${env.SUPABASE_URL}/rest/v1/signups?ip_hash=eq.${ipHash}&created_at=gt.${since}&select=id`,
      { headers: sbHeaders(env, { Prefer: 'count=exact' , Range: '0-0'}) });
    const total = Number((rl.headers.get('content-range') || '/0').split('/')[1] || 0);
    if (total >= 5) return ok;
  } catch { /* if the check fails, continue — availability over strictness */ }

  // validate referrer code exists (ignore if not)
  let referredBy = null;
  const ref = String(d.ref || '').trim().toUpperCase();
  if (/^[A-Z2-9]{6}$/.test(ref)) {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/signups?ref_code=eq.${ref}&select=ref_code`, { headers: sbHeaders(env) });
    const rows = await r.json().catch(() => []);
    if (rows.length) referredBy = ref;
  }

  // insert with unique ref_code (retry on collision), ignore duplicate e-mail
  let myCode = null;
  for (let i = 0; i < 3 && !myCode; i++) {
    const code = refCode();
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/signups?on_conflict=email`, {
      method: 'POST',
      headers: sbHeaders(env, { Prefer: 'resolution=ignore-duplicates,return=representation' }),
      body: JSON.stringify({
        email, naam, rol, taal,
        bedrijfstype: rol === 'ondernemer' ? String(d.bedrijfstype || '').slice(0, 60) : null,
        boekhouder: rol === 'ondernemer' ? (d.boekhouder === 'ja' ? 'ja' : d.boekhouder === 'nee' ? 'nee' : null) : null,
        source: String(d.source || 'site').slice(0, 60),
        telefoon, stad, vestiging, city: plaats,
        ref_code: code, referred_by: referredBy, ip_hash: ipHash
      })
    });
    if (res.status === 409) continue;           // ref_code collision -> retry
    if (!res.ok) return json2({ ok: false }, 500);
    const rows = await res.json().catch(() => []);
    if (!rows.length) return ok;                // duplicate e-mail -> done, no Laposta re-add
    myCode = code;
  }
  if (!myCode) return json2({ ok: false }, 500);

  // Notify the internal team of the new signup (fire-and-forget; never blocks).
  try {
    await notifyAdmin(env, {
      email, naam, rol, taal,
      bedrijfstype: rol === 'ondernemer' ? String(d.bedrijfstype || '') : '',
      boekhouder: rol === 'ondernemer' ? String(d.boekhouder || '') : '',
      telefoon, stad, city: plaats, source: String(d.source || 'site'),
      ref_code: myCode, referred_by: referredBy
    });
  } catch { /* notification is best-effort; the signup already succeeded */ }

  // Laposta member (double opt-in mail comes from the list settings)
  if (env.LAPOSTA_API_KEY && env.LAPOSTA_LIST_ID) {
    try {
      const body = new URLSearchParams({
        list_id: env.LAPOSTA_LIST_ID, ip, email, source_url: 'https://sum-it.eu',
        'custom_fields[naam]': naam, 'custom_fields[rol]': rol, 'custom_fields[taal]': taal,
        'custom_fields[bedrijfstype]': String(d.bedrijfstype || ''),
        'custom_fields[boekhouder]': String(d.boekhouder || ''),
        'custom_fields[refcode]': myCode, 'custom_fields[referredby]': referredBy || '',
        'custom_fields[reflink]': 'https://sum-it.eu/?ref=' + myCode
      });
      await fetch('https://api.laposta.nl/v2/member', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(env.LAPOSTA_API_KEY + ':'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
    } catch { /* signup stays 'pending'; SETUP.md covers re-sync */ }
  }
  // Single opt-in (Laposta double opt-in requires a paid plan): confirm immediately,
  // assign the queue position and send the welcome mail. Set env DOUBLE_OPTIN=1 once
  // the Laposta list uses double opt-in — the laposta-webhook then takes over.
  if (env.DOUBLE_OPTIN !== '1') {
    try {
      const cr = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/confirm_signup`, {
        method: 'POST', headers: sbHeaders(env), body: JSON.stringify({ p_email: email })
      });
      const rows = cr.ok ? await cr.json().catch(() => null) : null;
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row && row.queue_pos && await markWelcomed(env, email)) {
        await sendWelcome(env, email, row.queue_pos, row.ref_code, row.taal);
      }
    } catch { /* webhook remains as fallback */ }
  }
  return ok;
}
