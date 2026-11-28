// Runs once a day: asks the app to recompute everyone's numbers for friends (so streaks that have lapsed stop showing) and to
// delete people removed more than 30 days ago. It proves who it is with the server's own key, which never leaves the server.
export default async function handler() {
  const base = process.env.URL, key = process.env.HEIR_SUPABASE_SERVICE_KEY;
  if (!base || !key) return new Response('not set up', { status: 200 });
  let after = '', batches = 0, done = 0;
  while (batches < 50) {
    const res = await fetch(`${base}/api/heir/stats/sweep${after ? `?after=${after}` : ''}`, { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return new Response(`sweep failed: ${res.status}`, { status: 500 });
    const out = await res.json();
    done += out.done ?? 0; batches++;
    if (!out.next) break;
    after = out.next;
  }
  return new Response(`recomputed ${done}`, { status: 200 });
}

export const config = { schedule: '0 7 * * *' };
