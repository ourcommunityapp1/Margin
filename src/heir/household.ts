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

/** Add a course to the plan as the daily course (the one new lessons come from). Courses already in the plan stay in it, for reviews. */
export function setPlan(h: Household, plan: Plan): Household {
  const minutes = plan.minutes ?? h.plan?.minutes;
  const removed = (plan.removed ?? h.plan?.removed ?? []).filter((id) => id !== plan.course);
  const verses = plan.verses ?? h.plan?.verses ?? [];
  return { ...h, plan: { course: plan.course, ...(minutes ? { minutes } : {}), ...(removed.length ? { removed } : {}), ...(verses.length ? { verses } : {}) } };
}

/** The daily course: where new lessons come from. Null when it has been taken out of the plan. */
export const dailyCourse = (plan: Plan | null | undefined): string | null => (plan && !plan.removed?.includes(plan.course) ? plan.course : null);

/** Is this course in the plan? The daily course always is; any other is once you've started it, until you remove it. */
export const inPlan = (plan: Plan | null | undefined, courseId: string, started: boolean): boolean =>
  dailyCourse(plan) === courseId || (started && !plan?.removed?.includes(courseId));

/** Take a course out of the plan (its progress is kept). If it was the daily course, `next` (another course in the plan) takes over. */
export function removeFromPlan(h: Household, courseId: string, next: string | null): Household {
  if (!h.plan) return h;
  const removed = [...new Set([...(h.plan.removed ?? []), courseId])].filter((id) => id !== next);
  const course = h.plan.course === courseId ? (next ?? courseId) : h.plan.course;
  return { ...h, plan: { course, ...(h.plan.minutes ? { minutes: h.plan.minutes } : {}), removed, ...(h.plan.verses?.length ? { verses: h.plan.verses } : {}) } };
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
    const removed = v.plan && Array.isArray(v.plan.removed) ? v.plan.removed.filter((x: unknown): x is string => typeof x === 'string').slice(0, 40) : [];
    const verses = v.plan && Array.isArray(v.plan.verses) ? v.plan.verses.filter((x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9._-]{1,40}$/.test(x)).slice(0, 200) : [];
    const plan = named ? { course: named === 'apostles-creed' ? 'creeds' : named, ...(minutes ? { minutes } : {}), ...(removed.length ? { removed } : {}), ...(verses.length ? { verses } : {}) } : null;
    return { members, activeMemberId, plan };
  } catch {
    return emptyHousehold();
  }
}

/** Add one verse or answer to the plan on its own. A household with no plan yet gets one, with this item's course as the daily course. */
export function addVerse(h: Household, itemId: string, courseId: string): Household {
  const verses = [...new Set([...(h.plan?.verses ?? []), itemId])];
  const base: Plan = h.plan ?? { course: courseId, removed: [courseId] };
  return { ...h, plan: { ...base, verses } };
}

/** Take one verse or answer out of the plan. (If its course is in the plan it stays in it through the course.) */
export function removeVerse(h: Household, itemId: string): Household {
  if (!h.plan) return h;
  const verses = (h.plan.verses ?? []).filter((id) => id !== itemId);
  const { verses: _old, ...rest } = h.plan; void _old;
  return { ...h, plan: { ...rest, ...(verses.length ? { verses } : {}) } };
}
