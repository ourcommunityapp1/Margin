import { courses, courseItems, allItems } from '@/heir/content';
import { dayIn, refreshStats } from '@/heir/statsjob';
import { adminClient, dbStore } from './store';

export const runtime = 'nodejs';
export const maxDuration = 25;

// POST /api/heir/stats: work out the signed-in person's numbers (words in memory, stones, streak, courses) from their full
// answer history and save them for friends to see. The caller proves who they are with their sign-in token; nothing in the
// request body is used. 501 when the server isn't set up for this yet (the phone then falls back to sending its own).
export async function POST(request: Request) {
  const db = adminClient();
  if (!db) return Response.json({ error: 'Not set up yet.' }, { status: 501 });
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  try {
    const out = await refreshStats(dbStore(db), data.user.id, { courses: courses.map((c) => ({ id: c.id, items: courseItems(c) })), items: allItems(), now: new Date(), today: dayIn });
    if (!out.ok) return Response.json({ ok: false, reason: out.reason }, { status: out.reason === 'too-soon' ? 200 : 404 });
    return Response.json({ ok: true, changed: out.changed });
  } catch {
    return Response.json({ error: 'Couldn’t update right now.' }, { status: 500 });
  }
}
