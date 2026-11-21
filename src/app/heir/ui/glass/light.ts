// How much of a part's window is lit: each question owns an equal share of the glass, lit in proportion
// to how many of its parts have been learned. Questions that need a refresh gather dust.
// Each part of a course has its own round window; the one you see is the part you're working in.

import { courseParts, type Course } from '@/heir/content';
import { unitsFor } from '@/heir/lesson';
import { needsRefresh } from '@/heir/levels';
import type { MemberProgress } from '@/heir/progress';
import type { Item, Track } from '@/heir/types';

// Three round windows cut from the Good Shepherd glass: the face, the shepherd reaching to the lamb, the lamb.
const WINDOWS = ['/heir/glass/gsc-a', '/heir/glass/gsc-b', '/heir/glass/gsc-c'];
export const WINDOW_CREDIT = 'St Barnabas, Mount Eden, Auckland. Photo: Bjankuloski06, CC BY 4.0';
export function windowBase(partIndex: number) {
  return WINDOWS[partIndex % WINDOWS.length];
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

export type PartWindow = {
  index: number; count: number; title: string; base: string; items: Item[];
  lit: number[]; dusty: boolean[]; share: number; next: number;
};

// The window for one part, or for the part you're working in: the first with a question not yet fully lit.
export function partWindow(course: Course, track: Track, p: MemberProgress, now: Date, index?: number): PartWindow {
  const parts = courseParts(course);
  const lights = parts.map((part) => windowLight(part.items, track, p, now));
  const open = lights.findIndex((l) => l.lit.some((f) => f < 1));
  const at = Math.min(index ?? (open === -1 ? parts.length - 1 : open), parts.length - 1);
  const light = lights[at];
  return { index: at, count: parts.length, title: parts[at].title, base: windowBase(at), items: parts[at].items, ...light, next: light.lit.findIndex((f) => f < 1) };
}

// Which part an item is in.
export function partOf(course: Course, itemId: string): number {
  return Math.max(0, courseParts(course).findIndex((part) => part.items.some((i) => i.id === itemId)));
}
