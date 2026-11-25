// Deleting a whole account (App Store 5.1.1(v) and Google Play both require it inside the app). The steps, kept apart from the
// database so they are tested without one: remember who the person's friends were, delete the sign-in (every table that holds
// their family, progress, answers, events, profile, friendships, requests and blocks is removed with it by the database), then
// recount those former friends' friend counts.

export interface AccountStore {
  /** The ids of everyone who is this person's friend now. */
  friendsOf(userId: string): Promise<string[]>;
  /** Deletes the sign-in account; the database removes everything linked to it. */
  deleteUser(userId: string): Promise<void>;
  /** Recounts a person's friends after someone left. */
  recount(userId: string): Promise<void>;
}

/** The word the person must send to confirm (so an accidental request does nothing). */
export const CONFIRM_WORD = 'DELETE';

export async function deleteAccount(store: AccountStore, userId: string): Promise<{ friendsRecounted: number }> {
  const friends = await store.friendsOf(userId);
  await store.deleteUser(userId);
  // The account is gone either way; a failed recount is put right by the daily job, so it never undoes the deletion.
  let counted = 0;
  for (const f of friends) {
    try { await store.recount(f); counted++; } catch { /* the nightly recount catches it */ }
  }
  return { friendsRecounted: counted };
}
