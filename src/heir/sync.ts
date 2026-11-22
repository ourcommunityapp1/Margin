// Turning a household into database rows and back. Pure, so the sync rules are tested without a database.

import type { Household, Member, Plan } from './types.ts';

export interface HouseholdRow { id: string; plan: Plan | null; active_member_id: string | null }
export interface MemberRow { id: string; household_id: string; name: string; track: 'adult' | 'child'; created_at: string }

export function toRows(h: Household, householdId: string): { household: HouseholdRow; members: MemberRow[] } {
  return {
    household: { id: householdId, plan: h.plan, active_member_id: h.activeMemberId },
    members: h.members.map((m) => ({ id: m.id, household_id: householdId, name: m.name, track: m.track, created_at: m.createdAt })),
  };
}

export function fromRows(household: HouseholdRow, members: MemberRow[]): Household {
  const list: Member[] = [...members]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => ({ id: m.id, name: m.name, track: m.track === 'child' ? 'child' : 'adult', createdAt: m.created_at }));
  const active = list.some((m) => m.id === household.active_member_id) ? household.active_member_id : (list[0]?.id ?? null);
  return { members: list, activeMemberId: active, plan: household.plan ?? null };
}

// Members that exist in the database but not in the household any more: these get deleted.
export function removedMemberIds(before: MemberRow[], after: Household): string[] {
  const keep = new Set(after.members.map((m) => m.id));
  return before.map((m) => m.id).filter((id) => !keep.has(id));
}

// On first sign-in, a household that only lived on this phone is carried up, unless the account already has one.
export function chooseOnSignIn(local: Household, remote: Household | null): { household: Household; upload: boolean } {
  if (remote && remote.members.length) return { household: remote, upload: false };
  if (local.members.length) return { household: local, upload: true };
  return { household: remote ?? local, upload: false };
}
