// How much of a part's window is lit: each question owns an equal share of the glass, lit in proportion
// to how many of its parts have been learned. Questions that need a refresh gather dust.
// Each part of a course has its own round window; the one you see is the part you're working in.

import { courseParts, type Course } from '@/heir/content';
import { unitsFor } from '@/heir/lesson';
import { needsRefresh } from '@/heir/levels';
import type { MemberProgress } from '@/heir/progress';
import type { Item, Track } from '@/heir/types';

// Each course has its own window, one round panel per part.
// Shorter Catechism: the Good Shepherd (St Barnabas, Mount Eden): the face, the shepherd reaching to the lamb, the lamb.
// Larger Catechism: the north rose of Chartres Cathedral.
// The Creeds: two medallions of the Good Samaritan window at Chartres: the Creation and Fall, and the Samaritan.
// First Verses: Jesus and the children; Christmas: the Nativity. Both from Sacred Heart Church, New Philadelphia, Ohio.
const WINDOWS: Record<string, string[]> = {
  'first-verses': ['/heir/glass/sh-children'],
  christmas: ['/heir/glass/sh-nativity'],
  'westminster-shorter': ['/heir/glass/gsc-a', '/heir/glass/gsc-b', '/heir/glass/gsc-c'],
  'westminster-larger': ['/heir/glass/rose-chartres'],
  creeds: ['/heir/glass/chartres-m1', '/heir/glass/chartres-m2'],
};
export function windowBase(courseId: string, partIndex: number) {
  const list = WINDOWS[courseId] ?? WINDOWS['westminster-shorter'];
  return list[partIndex % list.length];
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
  return { index: at, count: parts.length, title: parts[at].title, base: windowBase(course.id, at), items: parts[at].items, ...light, next: light.lit.findIndex((f) => f < 1) };
}

// Which part an item is in.
export function partOf(course: Course, itemId: string): number {
  return Math.max(0, courseParts(course).findIndex((part) => part.items.some((i) => i.id === itemId)));
}
