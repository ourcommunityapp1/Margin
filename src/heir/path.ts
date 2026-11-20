// The course path: units (groups of up to five) made of named lessons, each done, current or upcoming,
// plus the numbers a learner can feel progress in: learned, mastered, and a day streak.

import { groupsOf, unitsFor, type Group, type Unit } from './lesson.ts';
import type { MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

// Recalled well after gaps long enough that it is in long-term memory (FSRS stability, in days).
export const MASTERED_DAYS = 21;

export type Status = 'done' | 'current' | 'upcoming';

export interface PathLesson {
  key: string;
  kind: 'learn' | 'checkpoint';
  number: number;
  itemId?: string;
  unit?: Unit;
  status: Status;
}

export interface PathUnit {
  number: number;
  group: Group;
  lessons: PathLesson[];
  learned: number;
  mastered: number;
  status: Status;
}

const learnedItem = (item: Item, track: Track, units: Set<string>) => unitsFor(item, track).every((u) => units.has(u.key));
export const masteredItem = (item: Item, p: MemberProgress) => (p.cards[item.id]?.stability ?? 0) >= MASTERED_DAYS;

export function coursePath(items: Item[], track: Track, p: MemberProgress): PathUnit[] {
  const units = new Set(p.units);
  const checkpoints = new Set(p.checkpoints);
  let currentFound = false;
  return groupsOf(items).map((group, g) => {
    let n = 0;
    const lessons: PathLesson[] = [];
    for (const item of group.items) {
      for (const unit of unitsFor(item, track)) {
        const done = units.has(unit.key);
        const status: Status = done ? 'done' : currentFound ? 'upcoming' : 'current';
        if (status === 'current') currentFound = true;
        lessons.push({ key: unit.key, kind: 'learn', number: ++n, itemId: item.id, unit, status });
      }
    }
    const lockDone = checkpoints.has(group.key);
    const lockStatus: Status = lockDone ? 'done' : currentFound ? 'upcoming' : 'current';
    if (lockStatus === 'current') currentFound = true;
    lessons.push({ key: `lock:${group.key}`, kind: 'checkpoint', number: ++n, status: lockStatus });
    const status: Status = lessons.every((l) => l.status === 'done') ? 'done' : lessons.some((l) => l.status === 'current') ? 'current' : 'upcoming';
    return {
      number: g + 1, group, lessons, status,
      learned: group.items.filter((i) => learnedItem(i, track, units)).length,
      mastered: group.items.filter((i) => masteredItem(i, p)).length,
    };
  });
}

export function courseStats(items: Item[], track: Track, p: MemberProgress): { learned: number; mastered: number; total: number } {
  const units = new Set(p.units);
  return {
    learned: items.filter((i) => learnedItem(i, track, units)).length,
    mastered: items.filter((i) => masteredItem(i, p)).length,
    total: items.length,
  };
}

// Days in a row with a finished lesson, ending today (or yesterday, so the streak isn't lost before
// today's lesson). Days are local YYYY-MM-DD strings.
export function streak(days: string[], today: string): number {
  const set = new Set(days);
  const step = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    const t = new Date(y, m - 1, day - 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };
  let d = set.has(today) ? today : step(today);
  let n = 0;
  while (set.has(d)) { n++; d = step(d); }
  return n;
}
