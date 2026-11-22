'use client';

// Heir's connection to its database. Null when Heir's database settings aren't set; the app then keeps
// the household and progress on this device only.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { HEIR_SUPABASE_KEY, HEIR_SUPABASE_URL, heirCloudConfigured } from '@/heir/env';
import { fromRows, removedMemberIds, toRows, type HouseholdRow, type MemberRow } from '@/heir/sync';
import type { Household } from '@/heir/types';
import { mergeProgress, parseProgress, sameProgress, type MemberProgress } from '@/heir/progress';
import type { Plan } from '@/heir/types';

let client: SupabaseClient | null = null;

export function cloud(): SupabaseClient | null {
  if (!heirCloudConfigured()) return null;
  client ??= createBrowserClient(HEIR_SUPABASE_URL, HEIR_SUPABASE_KEY);
  return client;
}

export interface Remote { householdId: string; household: Household; memberRows: MemberRow[] }

// The signed-in account's own household. (A linked account's household is readable too, so this asks for its own.)
export async function loadRemote(db: SupabaseClient): Promise<Remote | null> {
  const { data: session } = await db.auth.getSession();
  const me = session.session?.user.id;
  if (!me) return null;
  const { data: hh, error } = await db.from('heir_households').select('id, plan, active_member_id').eq('owner_id', me).maybeSingle();
  if (error) throw error;
  if (!hh) return null;
  const { data: members, error: e2 } = await db.from('heir_members').select('id, household_id, name, track, created_at').eq('household_id', hh.id);
  if (e2) throw e2;
  const rows = (members ?? []) as MemberRow[];
  return { householdId: hh.id, household: fromRows(hh as HouseholdRow, rows), memberRows: rows };
}

// Writes the whole household. Small enough that sending it all is simpler and safer than tracking edits.
export async function saveRemote(db: SupabaseClient, h: Household, known: Remote | null): Promise<Remote> {
  let householdId = known?.householdId;
  if (!householdId) {
    const { data, error } = await db.from('heir_households').insert({ plan: h.plan, active_member_id: h.activeMemberId }).select('id').single();
    if (error) throw error;
    householdId = data.id as string;
  }
  const rows = toRows(h, householdId);
  if (rows.members.length) {
    const { error } = await db.from('heir_members').upsert(rows.members);
    if (error) throw error;
  }
  const gone = removedMemberIds(known?.memberRows ?? [], h);
  if (gone.length) {
    const { error } = await db.from('heir_members').delete().in('id', gone);
    if (error) throw error;
  }
  const { error } = await db.from('heir_households').update({ plan: rows.household.plan, active_member_id: rows.household.active_member_id, updated_at: new Date().toISOString() }).eq('id', householdId);
  if (error) throw error;
  return { householdId, household: h, memberRows: rows.members };
}

// ---- Progress: one row per member. Reads merge the account's copy into this phone's; writes first read the
// account's copy and merge it in, so a lesson done on another phone in the meantime is kept, never overwritten.

export async function loadProgressRows(db: SupabaseClient, householdId: string): Promise<Record<string, MemberProgress>> {
  const { data, error } = await db.from('heir_progress').select('member_id, data').eq('household_id', householdId);
  if (error) throw error;
  const raw = Object.fromEntries((data ?? []).map((r) => [r.member_id as string, r.data]));
  return parseProgress(JSON.stringify(raw));
}

/** Merge these members' progress with the account's and save the result there. Returns what was saved. */
export async function saveProgressRows(db: SupabaseClient, householdId: string, mine: Record<string, MemberProgress>): Promise<Record<string, MemberProgress>> {
  const ids = Object.keys(mine);
  if (!ids.length) return {};
  const theirs = await loadProgressRows(db, householdId);
  const merged = Object.fromEntries(ids.map((id) => [id, theirs[id] ? mergeProgress(theirs[id], mine[id]) : mine[id]]));
  const changed = ids.filter((id) => !theirs[id] || !sameProgress(theirs[id], merged[id]));
  if (changed.length) {
    const at = new Date().toISOString();
    const { error } = await db.from('heir_progress').upsert(changed.map((id) => ({ member_id: id, household_id: householdId, data: merged[id], updated_at: at })));
    if (error) throw error;
  }
  return merged;
}

// ---- Linking two accounts (a couple): each can VIEW the other's family and progress, and nothing more. The database
// allows only reading across a link; changing or deleting anything of the other's is refused there.

/** Make a single-use link invite (good for a week) to send to the other person. */
export async function createInvite(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.rpc('heir_create_invite');
  if (error) throw error;
  return data as string;
}

/** Accept an invite: links this account with the one that made it. Throws an Error whose message says why not. */
export async function acceptInvite(db: SupabaseClient, code: string): Promise<void> {
  const { error } = await db.rpc('heir_accept_invite', { p_code: code });
  if (error) throw new Error(error.message || 'That invite didn’t work.');
}

export async function unlinkAccount(db: SupabaseClient, ownerId: string): Promise<void> {
  const { error } = await db.rpc('heir_unlink', { p_other: ownerId });
  if (error) throw error;
}

export interface LinkedAccount {
  ownerId: string;
  plan: Plan | null;
  members: { id: string; name: string; track: 'adult' | 'child' }[];
  progress: Record<string, MemberProgress>;
}

/** Every account linked to this one, with its family and their progress, for reading only. */
export async function loadLinked(db: SupabaseClient): Promise<LinkedAccount[]> {
  const { data: session } = await db.auth.getSession();
  const me = session.session?.user.id;
  if (!me) return [];
  const { data: hhs, error } = await db.from('heir_households').select('id, owner_id, plan').neq('owner_id', me);
  if (error) throw error;
  if (!hhs?.length) return [];
  const ids = hhs.map((h) => h.id as string);
  const [{ data: members, error: e2 }, { data: rows, error: e3 }] = await Promise.all([
    db.from('heir_members').select('id, household_id, name, track, created_at').in('household_id', ids).order('created_at'),
    db.from('heir_progress').select('member_id, household_id, data').in('household_id', ids),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  const progress = parseProgress(JSON.stringify(Object.fromEntries((rows ?? []).map((r) => [r.member_id as string, r.data]))));
  return hhs.map((h) => {
    const mine = (members ?? []).filter((m) => m.household_id === h.id);
    return {
      ownerId: h.owner_id as string,
      plan: (h.plan as Plan | null) ?? null,
      members: mine.map((m) => ({ id: m.id as string, name: m.name as string, track: m.track === 'child' ? 'child' as const : 'adult' as const })),
      progress: Object.fromEntries(mine.filter((m) => progress[m.id as string]).map((m) => [m.id as string, progress[m.id as string]])),
    };
  });
}
