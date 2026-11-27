// How the words in your memory have grown, week by week, worked out from the answer log (nothing new is recorded).
// A question counts toward memory from the first day it had a stone (the first unaided recall on a later day than it was
// first practiced, once it had been recited in full): the same rule `wordsIn` uses today, replayed on the log as it stood.

import { levelFromLog } from './levels.ts';
import { itemWords } from './measures.ts';
import { localDay, type MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

const DAY = 86_400_000;

/** When each question first counted toward your memory (ms), for those that do. */
export function memoryDates(items: Item[], track: Track, log: MemberProgress['log'], levels: Record<string, number> = {}): Map<string, number> {
  const byItem = new Map<string, typeof log>();
  for (const e of log) { if (e.kind !== 'intro') byItem.set(e.itemId, [...(byItem.get(e.itemId) ?? []), e]); }
  const out = new Map<string, number>();
  for (const item of items) {
    const entries = byItem.get(item.id);
    if (!entries) continue;
    const firstDay = localDay(new Date(Math.min(...entries.map((e) => Date.parse(e.at)))));
    // Candidate moments: each answer time on a later day than the first. Replay the log up to each.
    const times = [...new Set(entries.map((e) => e.at))].sort().filter((at) => localDay(new Date(at)) !== firstDay);
    for (const at of times) {
      const upTo = log.filter((e) => e.itemId === item.id && e.at <= at);
      if (levelFromLog(item, track, upTo, new Date(at)) >= 1) { out.set(item.id, Date.parse(at)); break; }
    }
    // A stone earned under an earlier rule is kept (stones never go down) even where the current rules can't replay it: date it
    // to the first answer on a later day, else the first answer.
    if (!out.has(item.id) && (levels[item.id] ?? 0) >= 1) out.set(item.id, times.length ? Date.parse(times[0]) : Math.min(...entries.map((e) => Date.parse(e.at))));
  }
  return out;
}

export interface WordsPoint { at: number; words: number }

/**
 * Weekly points from the first week with any words up to now, ending exactly at `current` (today's number, which also
 * accounts for the keeping rules). At most `maxWeeks` points; empty when nothing counts yet.
 */
export function wordsHistory(items: Item[], track: Track, p: MemberProgress, now: Date, current: number, maxPoints = 60): WordsPoint[] {
  const dates = memoryDates(items, track, p.log, p.levels);
  const words = new Map(items.map((i) => [i.id, itemWords(i, track)]));
  const first = Math.min(...[...dates.values()], Infinity);
  if (!Number.isFinite(first)) return [];
  // A point a day while the history is short (up to two months), a point a week after that, so a new learner sees a real climb.
  const span = (now.getTime() - first) / DAY;
  const step = span <= 60 ? DAY : 7 * DAY;
  const n = Math.min(maxPoints, Math.max(3, Math.ceil(span / (step / DAY)) + 2));
  const pts: WordsPoint[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const end = now.getTime() - k * step;
    let w = 0;
    for (const [id, at] of dates) if (at <= end) w += words.get(id) ?? 0;
    pts.push({ at: end, words: k === 0 ? current : w });
  }
  // Never let a dip from today's keeping rules draw a cliff on the chart before the last point.
  for (let i = pts.length - 2; i >= 0; i--) pts[i].words = Math.min(pts[i].words, pts[i + 1].words);
  return pts;
}
