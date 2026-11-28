import { adminClient } from '../../stats/store';
import { CONFIRM_WORD, deleteAccount } from '@/heir/deleteaccount';

export const runtime = 'nodejs';
export const maxDuration = 25;

// POST /api/heir/account/delete  { "confirm": "DELETE" }
// Deletes the signed-in person's whole Katekize account: the sign-in, the family and everyone's progress, answers and card
// events, the profile, friendships, requests and blocks. It cannot be undone. The caller proves who they are with their
// sign-in token; the body only has to say "DELETE" so a stray request does nothing. 501 when the server isn't set up for it.
export async function POST(request: Request) {
  const db = adminClient();
  if (!db) return Response.json({ error: 'Not set up yet.' }, { status: 501 });
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { confirm?: unknown } | null;
  if (body?.confirm !== CONFIRM_WORD) return Response.json({ error: 'Send {"confirm":"DELETE"} to delete the account.' }, { status: 400 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const userId = data.user.id;
  try {
    await deleteAccount({
      async friendsOf(id) {
        const { data: rows, error: e } = await db.from('heir_friends').select('friend_id').eq('user_id', id);
        if (e) throw e;
        return (rows ?? []).map((r) => r.friend_id as string);
      },
      async deleteUser(id) {
        const { error: e } = await db.auth.admin.deleteUser(id);
        if (e) throw e;
      },
      async recount(id) {
        const { error: e } = await db.rpc('heir_recount', { u: id });
        if (e) throw e;
      },
    }, userId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Couldn’t delete the account right now. Try again.' }, { status: 500 });
  }
}
