'use client';

// Heir's connection to its database. Null when Heir's database settings aren't set; the app then keeps
// the household and progress on this device only.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { HEIR_SUPABASE_KEY, HEIR_SUPABASE_URL, heirCloudConfigured } from '@/heir/env';
import { fromRows, removedMemberIds, toRows, type HouseholdRow, type MemberRow } from '@/heir/sync';
import type { Household } from '@/heir/types';
import { mergeProgress, parseProgress, sameProgress, type MemberProgress } from '@/heir/progress';

let client: SupabaseClient | null = null;

export function cloud(): SupabaseClient | null {
  if (!heirCloudConfigured()) return null;
  client ??= createBrowserClient(HEIR_SUPABASE_URL, HEIR_SUPABASE_KEY);
  return client;
}

export interface Remote { householdId: string; household: Household; memberRows: MemberRow[] }

// The signed-in account's household. Its course and active person are the account's own (heir_household_users);
// the members are the whole family's.
export async function loadRemote(db: SupabaseClient): Promise<Remote | null> {
  const { data: link, error } = await db.from('heir_household_users').select('household_id, plan, active_member_id').maybeSingle();
  if (error) throw error;
  if (!link) return null;
  const { data: members, error: e2 } = await db.from('heir_members').select('id, household_id, name, track, created_at').eq('household_id', link.household_id);
  if (e2) throw e2;
  const rows = (members ?? []) as MemberRow[];
  return { householdId: link.household_id, household: fromRows(link as HouseholdRow, rows), memberRows: rows };
}

// Writes the whole household. Small enough that sending it all is simpler and safer than tracking edits.
export async function saveRemote(db: SupabaseClient, h: Household, known: Remote | null): Promise<Remote> {
  let householdId = known?.householdId;
  if (!householdId) {
    const { data, error } = await db.from('heir_households').insert({}).select('id').single();
    if (error) throw error;
    householdId = data.id as string;
    const { error: e2 } = await db.from('heir_household_users').insert({ household_id: householdId, role: 'owner', plan: h.plan, active_member_id: h.activeMemberId });
    if (e2) throw e2;
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
  const { error } = await db.from('heir_household_users').update({ plan: rows.household.plan, active_member_id: rows.household.active_member_id }).eq('household_id', householdId);
  if (error) throw error;
  return { householdId, household: h, memberRows: rows.members };
}

// ---- Inviting someone into the family: a single-use link, good for a week. Joining adds this account to the family.

export async function createInvite(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.rpc('heir_create_invite');
  if (error) throw error;
  return data as string;
}

/** Join the family that made this invite. Throws an Error whose message says why not, in plain words. */
export async function joinWithInvite(db: SupabaseClient, code: string): Promise<void> {
  const { error } = await db.rpc('heir_join', { p_code: code });
  if (error) throw new Error(error.message || 'That invite didn’t work.');
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
