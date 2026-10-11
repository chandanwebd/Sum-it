/* GET /api/stats/public — public counters for the site (cached 60s).
   Returns: { claimed, claimed_display, cities:{...>=3 only}, trades:{...>=3 only}, bookkeepers }
   claimed = real number of confirmed signups (all roles). claimed_display is
   kept for older front-ends and is now the same real number: the former
   DISPLAY_OFFSET (+143) is no longer added, so the env var can be removed.
   Env: SUPABASE_URL, SUPABASE_SERVICE_KEY */

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
    const claimed = s.claimed || 0;
    return new Response(JSON.stringify({
      claimed,
      claimed_display: claimed,
      cities: s.cities || {},
      trades: s.trades || {},
      bookkeepers: s.bookkeepers || 0
    }), { headers });
  } catch {
    return new Response(JSON.stringify({ claimed_display: null }), { status: 200, headers });
  }
}
