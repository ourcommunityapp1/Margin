// How much of a course's window is lit: each question owns an equal share of the glass, lit in
// proportion to how many of its parts have been learned. Questions that need a refresh gather dust.

import { unitsFor } from '@/heir/lesson';
import { needsRefresh } from '@/heir/levels';
import type { MemberProgress } from '@/heir/progress';
import type { Item, Track } from '@/heir/types';

// One window per course. Only one is cut so far; the others share it until theirs are chosen.
const WINDOWS: Record<string, { base: string; title: string; credit: string }> = {};
const DEFAULT = {
  base: '/heir/glass/gsc-a',
  title: '“I am the good shepherd”',
  credit: 'St Barnabas, Mount Eden, Auckland. Photo: Bjankuloski06, CC BY 4.0',
};
export function windowFor(courseId: string) {
  return WINDOWS[courseId] ?? DEFAULT;
}

export function windowLight(items: Item[], track: Track, p: MemberProgress, now: Date) {
  const learned = new Set(p.units);
  const lit = items.map((item) => {
    const units = unitsFor(item, track);
    return units.length ? units.filter((u) => learned.has(u.key)).length / units.length : 0;
  });
  const dusty = items.map((item, i) => lit[i] > 0 && needsRefresh(p, item.id, now));
  const share = lit.reduce((a, b) => a + b, 0) / Math.max(1, items.length);
  return { lit, dusty, share };
}
