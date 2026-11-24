// What a friend or the community board can see about one person, worked out from their progress by the same
// functions the app uses on the phone, so a number is the same wherever it is shown. Pure: no database here.
// (The server will run this on the full answer history; nothing is wired to it yet.)

import { daysKept, levelOf } from './levels.ts';
import { wordsIn } from './measures.ts';
import { unitsFor } from './lesson.ts';
import { heldItems, summarize, type KeepOptions } from './keep.ts';
import type { MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

export interface CourseStat { course: string; learned: number; total: number }

export interface Stats {
  // Words of everything recalled unaided after a night's sleep (the Amethyst stone or higher).
  wordsInMemory: number;
  // How many items have reached each stone or higher, Amethyst (1) to Diamond (6); each stone keeps the ones below it.
  stones: number[];
  // Days kept in a row (Sundays are rest days: skipping one never breaks the run).
  streak: number;
  lastDay: string | null;
  courses: CourseStat[];
}

export interface CourseInput { id: string; items: Item[] }

/** Items with every part learned. */
export const learnedItems = (items: Item[], track: Track, p: MemberProgress): number => {
  const learned = new Set(p.units);
  return items.filter((i) => unitsFor(i, track).every((u) => learned.has(u.key))).length;
};

export function statsFor(courses: CourseInput[], allItems: Item[], track: Track, p: MemberProgress, today: string, keepRules?: { options: KeepOptions; now: Date } | null): Stats {
  const stones = [1, 2, 3, 4, 5, 6].map((n) => allItems.filter((i) => levelOf(p, i.id) >= n).length);
  return {
    // With the keeping rules on, words that have left (not recalled in time) are not counted.
    wordsInMemory: keepRules ? summarize(heldItems(allItems, p, track, keepRules.now, keepRules.options)).wordsKept : wordsIn(allItems, track, p).inMemory,
    stones,
    streak: daysKept(p.days, today),
    lastDay: p.days.length ? [...p.days].sort().at(-1)! : null,
    courses: courses
      .map((c) => ({ course: c.id, learned: learnedItems(c.items, track, p), total: c.items.length }))
      .filter((c) => c.learned > 0),
  };
}
