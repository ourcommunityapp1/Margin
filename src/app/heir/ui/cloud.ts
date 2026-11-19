'use client';

// Heir's connection to its database. Null when Heir's database settings aren't set; the app then keeps
// the household on this device only.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { HEIR_SUPABASE_KEY, HEIR_SUPABASE_URL, heirCloudConfigured } from '@/heir/env';
import { fromRows, removedMemberIds, toRows, type HouseholdRow, type MemberRow } from '@/heir/sync';
import type { Household } from '@/heir/types';

let client: SupabaseClient | null = null;

export function cloud(): SupabaseClient | null {
  if (!heirCloudConfigured()) return null;
  client ??= createBrowserClient(HEIR_SUPABASE_URL, HEIR_SUPABASE_KEY);
  return client;
}

export interface Remote { householdId: string; household: Household; memberRows: MemberRow[] }

export async function loadRemote(db: SupabaseClient): Promise<Remote | null> {
  const { data: hh, error } = await db.from('heir_households').select('id, plan, active_member_id').maybeSingle();
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
