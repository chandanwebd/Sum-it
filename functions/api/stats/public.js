/* GET /api/stats/public — public counters for the site (cached 60s).
   Returns: { claimed_display, cities:{...>=3 only}, trades:{...>=3 only}, bookkeepers }
   claimed_display = real confirmed count + DISPLAY_OFFSET (default 143).
   Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, DISPLAY_OFFSET */

export async function onRequestGet({ env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60',
    'Access-Control-Allow-Origin': '*'
  };
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/public_stats`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!r.ok) throw new Error('stats failed');
    const s = await r.json();
    const offset = Number(env.DISPLAY_OFFSET ?? 143);
    return new Response(JSON.stringify({
      claimed_display: (s.claimed || 0) + offset,
      claimed_real: undefined, // never expose the raw number publicly
      cities: s.cities || {},
      trades: s.trades || {},
      bookkeepers: s.bookkeepers || 0
    }), { headers });
  } catch {
    return new Response(JSON.stringify({ claimed_display: null }), { status: 200, headers });
  }
}
