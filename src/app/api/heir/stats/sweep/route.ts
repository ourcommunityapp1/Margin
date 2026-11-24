import { timingSafeEqual } from 'node:crypto';
import { courses, courseItems, allItems } from '@/heir/content';
import { dayIn, refreshStats } from '@/heir/statsjob';
import { adminClient, dbStore } from '../store';

export const runtime = 'nodejs';
export const maxDuration = 25;

const BATCH = 20;

const sameSecret = (given: string, wanted: string) => {
  const a = Buffer.from(given), b = Buffer.from(wanted);
  return a.length === b.length && timingSafeEqual(a, b);
};

// POST /api/heir/stats/sweep?after=<user id>: the daily job. Recomputes the numbers for the next batch of profiles (so a
// streak that has lapsed stops showing, and anything that changes with time is current), and on the last batch deletes
// people removed more than 30 days ago. Called by the scheduled function with the server's own key; returns where to
// continue from. Nobody else can call it: the key is checked, and it never leaves the server.
export async function POST(request: Request) {
  const db = adminClient();
  const key = process.env.HEIR_SUPABASE_SERVICE_KEY;
  if (!db || !key) return Response.json({ error: 'Not set up yet.' }, { status: 501 });
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1] ?? '';
  if (!token || !sameSecret(token, key)) return Response.json({ error: 'Not allowed.' }, { status: 401 });
  const after = new URL(request.url).searchParams.get('after') ?? '';
  const q = db.from('heir_profiles').select('user_id').order('user_id').limit(BATCH);
  const { data, error } = await (after && /^[0-9a-f-]{36}$/.test(after) ? q.gt('user_id', after) : q);
  if (error) return Response.json({ error: 'Couldn’t list profiles.' }, { status: 500 });
  const store = dbStore(db);
  const opts = { courses: courses.map((c) => ({ id: c.id, items: courseItems(c) })), items: allItems(), now: new Date(), today: dayIn, force: true };
  let done = 0, failed = 0;
  for (const row of data ?? []) {
    try { await refreshStats(store, row.user_id as string, opts); done++; } catch { failed++; }
  }
  const next = (data?.length ?? 0) === BATCH ? (data![data!.length - 1].user_id as string) : null;
  let purged: number | null = null;
  if (!next) {
    const r = await db.rpc('heir_purge_removed');
    purged = r.error ? null : (r.data as number);
  }
  return Response.json({ done, failed, next, purged });
}
