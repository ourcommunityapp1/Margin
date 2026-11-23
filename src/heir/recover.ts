// Saved progress on this phone that no longer belongs to anyone in the family: what is left after a person is
// removed, so it can be brought back. Pure, so the rule is tested.

import type { Progress } from './progress.ts';
import type { Member } from './types.ts';

export interface Orphan { id: string; lessons: number; units: number; days: number; stones: number }

export function orphanedProgress(p: Progress, members: Member[]): Orphan[] {
  const here = new Set(members.map((m) => m.id));
  return Object.entries(p)
    .filter(([id, m]) => !here.has(id) && (m.lessons > 0 || m.units.length > 0 || m.days.length > 0 || m.log.length > 0))
    .map(([id, m]) => ({ id, lessons: m.lessons, units: m.units.length, days: m.days.length, stones: Object.values(m.levels).filter((n) => n > 0).length }))
    .sort((a, b) => b.lessons - a.lessons || b.units - a.units);
}
