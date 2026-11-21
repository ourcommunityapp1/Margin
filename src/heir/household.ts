// The family on this device: who is memorizing, who is active, and the shared plan.
// Pure functions, so the same rules apply whether the household lives on the phone or, later, in the database.

import type { Household, Member, Plan, Track } from './types.ts';

export const emptyHousehold = (): Household => ({ members: [], activeMemberId: null, plan: null });

export function addMember(h: Household, name: string, track: Track, id: string, now: Date): Household {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!clean) return h;
  const member: Member = { id, name: clean, track, createdAt: now.toISOString() };
  return { ...h, members: [...h.members, member], activeMemberId: h.activeMemberId ?? id };
}

export function updateMember(h: Household, id: string, change: Partial<Pick<Member, 'name' | 'track'>>): Household {
  return { ...h, members: h.members.map((m) => (m.id === id ? { ...m, ...change, name: (change.name ?? m.name).trim() || m.name } : m)) };
}

export function removeMember(h: Household, id: string): Household {
  const members = h.members.filter((m) => m.id !== id);
  const activeMemberId = h.activeMemberId === id ? (members[0]?.id ?? null) : h.activeMemberId;
  return { ...h, members, activeMemberId };
}

export function setActive(h: Household, id: string): Household {
  return h.members.some((m) => m.id === id) ? { ...h, activeMemberId: id } : h;
}

export function setPlan(h: Household, plan: Plan): Household {
  const minutes = plan.minutes ?? h.plan?.minutes;
  return { ...h, plan: minutes ? { course: plan.course, minutes } : { course: plan.course } };
}

export function activeMember(h: Household): Member | null {
  return h.members.find((m) => m.id === h.activeMemberId) ?? null;
}

// Reads a stored household defensively: anything malformed becomes an empty household.
export function parseHousehold(raw: string | null): Household {
  if (!raw) return emptyHousehold();
  try {
    const v = JSON.parse(raw);
    if (!v || !Array.isArray(v.members)) return emptyHousehold();
    const members: Member[] = v.members
      .filter((m: unknown): m is Member => !!m && typeof (m as Member).id === 'string' && typeof (m as Member).name === 'string')
      .map((m: Member) => ({ id: m.id, name: m.name, track: m.track === 'child' ? 'child' : 'adult', createdAt: m.createdAt ?? new Date(0).toISOString() }));
    const activeMemberId = members.some((m) => m.id === v.activeMemberId) ? v.activeMemberId : (members[0]?.id ?? null);
    // Older plans named a collection; the Apostles' Creed now lives in the Creeds course.
    const named = v.plan && (typeof v.plan.course === 'string' ? v.plan.course : typeof v.plan.collection === 'string' ? v.plan.collection : null);
    const minutes = v.plan && typeof v.plan.minutes === 'number' && v.plan.minutes >= 1 && v.plan.minutes <= 120 ? v.plan.minutes : undefined;
    const plan = named ? { course: named === 'apostles-creed' ? 'creeds' : named, ...(minutes ? { minutes } : {}) } : null;
    return { members, activeMemberId, plan };
  } catch {
    return emptyHousehold();
  }
}
