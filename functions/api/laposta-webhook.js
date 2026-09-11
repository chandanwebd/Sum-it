/* POST /api/laposta-webhook?secret=... — Laposta event webhook.
   Configure in Laposta: list -> webhooks -> subscribed + unsubscribed events
   to https://sum-it.eu/api/laposta-webhook?secret=YOUR_WEBHOOK_SECRET
   On 'subscribed' (double opt-in confirmed):
     1. confirm_signup(email) -> sets status confirmed + assigns queue position
     2. welcome e-mail via Brevo (position + personal link + portal) if key present
     3. pushes queue_pos + ref_link back into the Laposta member's custom fields
   Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, WEBHOOK_SECRET,
        BREVO_API_KEY (optional), MAIL_FROM (e.g. "Sum-IT <hallo@sum-it.eu>"),
        LAPOSTA_API_KEY, LAPOSTA_LIST_ID */

import { sbHeaders, markWelcomed, sendWelcome } from './_lib.js';

async function parseEvents(request) {
  // Laposta posts either JSON or form-encoded {data: <json>}
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('json')) { const j = await request.json(); return Array.isArray(j) ? j : (j.data || [j]); }
    const form = await request.formData();
    const raw = form.get('data');
    if (raw) { const j = JSON.parse(raw); return Array.isArray(j) ? j : [j]; }
  } catch { /* fall through */ }
  return [];
}


export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (!env.WEBHOOK_SECRET || url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const events = await parseEvents(request);
  for (const ev of events) {
    const type = ev.event || ev.type || '';
    const m = (ev.data && (ev.data.member || ev.data)) || ev.member || {};
    const email = m.email || ev.email || '';
    if (!email) continue;

    if (type === 'subscribed') {
      // 1) confirm + queue position
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/confirm_signup`, {
        method: 'POST', headers: sbHeaders(env), body: JSON.stringify({ p_email: email.toLowerCase() })
      });
            const rows = r.ok ? await r.json().catch(() => null) : null; const row = Array.isArray(rows) ? rows[0] : rows; // queue_pos, ref_code, taal
      if (row && row.queue_pos) {
        const link = 'https://sum-it.eu/?ref=' + row.ref_code;
        // 2) welcome mail (Brevo) — only if it wasn't sent at signup time already
        if (await markWelcomed(env, email)) {
          await sendWelcome(env, email, row.queue_pos, row.ref_code, row.taal);
        }
        // 3) write position + link back to Laposta custom fields
        if (env.LAPOSTA_API_KEY && env.LAPOSTA_LIST_ID) {
          const body = new URLSearchParams({
            list_id: env.LAPOSTA_LIST_ID,
            'custom_fields[queuepos]': String(row.queue_pos + Number(env.DISPLAY_OFFSET ?? 143)),
            'custom_fields[reflink]': link
          });
          await fetch('https://api.laposta.nl/v2/member/' + encodeURIComponent(email) + '?list_id=' + env.LAPOSTA_LIST_ID, {
            method: 'POST',
            headers: { Authorization: 'Basic ' + btoa(env.LAPOSTA_API_KEY + ':'), 'Content-Type': 'application/x-www-form-urlencoded' },
            body
          }).catch(() => {});
        }
      }
    } else if (type === 'deactivated' || type === 'unsubscribed') {
      await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/unsubscribe_signup`, {
        method: 'POST', headers: sbHeaders(env), body: JSON.stringify({ p_email: email.toLowerCase() })
      }).catch(() => {});
    }
  }
  return new Response('ok');
}
