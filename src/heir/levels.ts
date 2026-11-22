// The stone levels: what each question has earned, worked out from the answer log, plus the counts,
// streak and awards built on them. Pure functions over progress, so they are easy to test and tune.
//
// Levels climb five foundation stones of Revelation 21 (twelfth to second), then Diamond at the top.
// Each is earned across separate days, so it measures memory, not one good afternoon.

import { unitsFor } from './lesson.ts';
import { localDay, type LogEntry, type MemberProgress } from './progress.ts';
import { relatedFor } from './related.ts';
import type { Item, Track } from './types.ts';

// `counts`: what it means in a word; `means`: in a sentence anyone can follow; `rule`: exactly how it's earned.
export interface Level { n: number; id: string; name: string; foundation: string; counts: string; means: string; rule: string }

export const LEVELS: Level[] = [
  { n: 1, id: 'amethyst', name: 'Amethyst', foundation: '12th foundation', counts: 'Know',
    means: 'You recalled it the next day, after a night’s sleep: it has started to stick.',
    rule: 'Recalled in full on a day after you learned it' },
  { n: 2, id: 'topaz', name: 'Topaz', foundation: '9th foundation', counts: 'Memorized',
    means: 'You’ve recalled it on three different days: it’s yours, word for word.',
    rule: 'Said or typed right on 3 different days' },
  { n: 3, id: 'carnelian', name: 'Carnelian', foundation: '6th foundation', counts: 'Mastered',
    means: 'You still had it after two weeks away, from the question and from the answer.',
    rule: 'Recalled after a gap of 2 weeks or more, both ways: question to answer, and answer to question' },
  { n: 4, id: 'emerald', name: 'Emerald', foundation: '4th foundation', counts: 'Long-term memory',
    means: 'Right every time for three months, even after a month away. With a short review now and then, you can expect to keep it for life.',
    rule: 'Every review right for 3 months, including one after a gap of a month' },
  { n: 5, id: 'sapphire', name: 'Sapphire', foundation: '2nd foundation', counts: 'Long-term, and understood',
    means: 'In long-term memory, and you can say what it means.',
    rule: 'Emerald, plus its meaning' },
  // Earned in `earnedLevels`: Sapphire, then every related verse recalled from memory (see related.ts).
  { n: 6, id: 'diamond', name: 'Diamond', foundation: 'The top', counts: 'Rooted in Scripture',
    means: 'Sapphire, and you’ve also memorized every verse connected to it: a catechism answer’s proof texts, or a verse’s related verses.',
    rule: 'Sapphire, plus all its related verses memorized' },
];

export const levelInfo = (n: number): Level | null => LEVELS[n - 1] ?? null;

const DAY = 86_400_000;
const FULL = new Set(['type', 'say']);

// Sessions for one item, oldest first: each is the answers given in one lesson or review.
function sessions(log: LogEntry[], itemId: string): { at: number; entries: LogEntry[] }[] {
  const by = new Map<string, LogEntry[]>();
  for (const e of log) if (e.itemId === itemId && e.kind !== 'intro') by.set(e.at, [...(by.get(e.at) ?? []), e]);
  return [...by].map(([at, entries]) => ({ at: Date.parse(at), entries })).sort((a, b) => a.at - b.at);
}

// The level the log shows right now (0: none yet). Stored levels never go down; see `earnedLevels`.
export function levelFromLog(item: Item, track: Track, log: LogEntry[], now: Date): number {
  const ss = sessions(log, item.id);
  const all = ss.flatMap((s) => s.entries);
  const typedRight = all.filter((e) => e.kind === 'type' && e.correct).length;
  if (typedRight < unitsFor(item, track).length) return 0;
  // Know: recalled in full on a later day than it was first learned. Recall in the same sitting is
  // mostly short-term memory; recall after a night's sleep is the first sign it's stored.
  const firstDay = ss.length ? localDay(new Date(ss[0].at)) : '';
  const afterSleep = ss.some((s) => localDay(new Date(s.at)) !== firstDay && s.entries.some((e) => FULL.has(e.kind) && e.correct));
  if (!afterSleep) return 0;

  const fullDays = new Set(ss.filter((s) => s.entries.some((e) => FULL.has(e.kind) && e.correct)).map((s) => localDay(new Date(s.at))));
  if (fullDays.size < 3) return 1;

  const afterGap = (gapDays: number) => ss.filter((s, i) => i > 0 && s.at - ss[i - 1].at >= gapDays * DAY);
  const gapRecall = afterGap(14).some((s) => s.entries.some((e) => FULL.has(e.kind) && e.correct));
  const bothWays = all.some((e) => e.kind === 'match' && e.correct);
  if (!gapRecall || !bothWays) return 2;

  const since = now.getTime() - 90 * DAY;
  const firstFull = ss.find((s) => s.entries.some((e) => FULL.has(e.kind) && e.correct));
  const recent = ss.filter((s) => s.at >= since);
  const longEnough = !!firstFull && firstFull.at <= since;
  const allRight = recent.length >= 2 && recent.every((s) => s.entries.every((e) => e.correct));
  const monthGap = afterGap(30).some((s) => s.at >= since);
  if (!longEnough || !allRight || !monthGap) return 3;

  if (!all.some((e) => e.kind === 'meaning' && e.correct)) return 4;
  return 5; // Diamond (6) also needs the related verses; see `earnedLevels`.
}

// Diamond: Sapphire, plus every related verse recalled from memory (and the item has some).
export function relatedDone(item: Item, p: MemberProgress): boolean {
  const rel = relatedFor(item);
  return rel.length > 0 && rel.every((r) => !!p.related?.[r]);
}

// Levels never go down: a stored level stays, and a higher one replaces it.
export function earnedLevels(items: Item[], track: Track, p: MemberProgress, now: Date): Record<string, number> {
  const out: Record<string, number> = { ...p.levels };
  for (const item of items) {
    let n = levelFromLog(item, track, p.log, now);
    if (Math.max(n, out[item.id] ?? 0) >= 5 && relatedDone(item, p)) n = 6;
    if (n > (out[item.id] ?? 0)) out[item.id] = n;
  }
  return out;
}

export const levelOf = (p: MemberProgress, itemId: string): number => p.levels[itemId] ?? 0;

// Overdue for review: the level stays, but the stone fades until the next good review.
export function needsRefresh(p: MemberProgress, itemId: string, now: Date): boolean {
  const card = p.cards[itemId];
  return !!card && Date.parse(card.due) < now.getTime() - DAY / 2;
}

// What the next level asks for, in a few words, or null at the top.
export function nextStep(item: Item, track: Track, p: MemberProgress, now: Date): string | null {
  const n = levelOf(p, item.id);
  if (n === 0) return 'Recall it after a night’s sleep to earn Amethyst';
  if (n === 1) {
    const days = new Set(sessions(p.log, item.id).filter((s) => s.entries.some((e) => FULL.has(e.kind) && e.correct)).map((s) => localDay(new Date(s.at)))).size;
    const left = Math.max(1, 3 - days);
    return `${left} more ${left === 1 ? 'day' : 'days'} to Topaz`;
  }
  if (n === 2) return 'Carnelian after a two-week gap';
  if (n === 3) return 'Emerald after three months';
  if (n === 4) return 'Sapphire: answer what it means';
  void track; void now;
  if (n === 5) {
    const rel = relatedFor(item);
    const left = rel.filter((r) => !p.related?.[r]).length;
    return rel.length ? `Diamond: ${left} related ${left === 1 ? 'verse' : 'verses'} to recall` : null;
  }
  return null;
}

export interface Counts { know: number; memorized: number; mastered: number; longTerm: number }
export function countsFor(items: Item[], p: MemberProgress): Counts {
  const lv = items.map((i) => levelOf(p, i.id));
  return {
    know: lv.filter((n) => n >= 1).length,
    memorized: lv.filter((n) => n >= 2).length,
    mastered: lv.filter((n) => n >= 3).length,
    longTerm: lv.filter((n) => n >= 4).length,
  };
}

// How many items sit at each level (their highest), level 1 to 6.
export function shelf(items: Item[], p: MemberProgress): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  for (const i of items) { const n = levelOf(p, i.id); if (n > 0) out[n - 1]++; }
  return out;
}

// ---- Days kept: Sunday is a day of rest. Learning on Sunday counts; skipping it never breaks the run.

const isSunday = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).getDay() === 0; };
const prevDay = (day: string) => { const [y, m, d] = day.split('-').map(Number); return localDay(new Date(y, m - 1, d - 1)); };

export function daysKept(days: string[], today: string): number {
  const set = new Set(days);
  let d = set.has(today) ? today : prevDay(today);
  let n = 0;
  for (let guard = 0; guard < 4000; guard++) {
    if (set.has(d)) n++;
    else if (!isSunday(d)) break;
    d = prevDay(d);
  }
  return n;
}

export function bestDaysKept(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  for (const d of sorted) best = Math.max(best, daysKept(sorted.filter((x) => x <= d), d));
  return best;
}

// ---- Awards: a dozen milestones, each stamped with the date it was first earned.

export interface Award { id: string; name: string; hint: string }

export const AWARDS: Award[] = [
  { id: 'first-lesson', name: 'First lesson', hint: 'Finish a lesson' },
  { id: 'first-amethyst', name: 'First Amethyst', hint: 'Type a question in full, right the first time' },
  { id: 'first-lock', name: 'First unit locked in', hint: 'Finish a unit’s Lock it in' },
  { id: 'kept-7', name: '7 days kept', hint: 'Keep 7 days in a row' },
  { id: 'first-topaz', name: 'First Topaz', hint: 'Get one right on 3 different days' },
  { id: 'kept-30', name: '30 days kept', hint: 'Keep 30 days in a row' },
  { id: 'first-carnelian', name: 'First Carnelian', hint: 'Recall one after a two-week gap' },
  { id: 'wsc-memorized', name: 'Shorter Catechism memorized', hint: 'Every Shorter question at Topaz' },
  { id: 'wlc-memorized', name: 'Larger Catechism memorized', hint: 'Every Larger question at Topaz' },
  { id: 'apostles-memorized', name: 'Apostles’ Creed memorized', hint: 'Every section at Topaz' },
  { id: 'nicene-memorized', name: 'Nicene Creed memorized', hint: 'Every section at Topaz' },
  { id: 'first-emerald', name: 'First Emerald', hint: 'Three months of right reviews' },
];

export function awardsMet(p: MemberProgress, all: Item[], today: string): string[] {
  const lv = Object.values(p.levels);
  const best = Math.max(bestDaysKept(p.days), daysKept(p.days, today));
  const memorized = (collection: string) => {
    const list = all.filter((i) => i.collection === collection);
    return list.length > 0 && list.every((i) => levelOf(p, i.id) >= 2);
  };
  const met: Record<string, boolean> = {
    'first-lesson': p.lessons > 0,
    'first-amethyst': lv.some((n) => n >= 1),
    'first-lock': p.checkpoints.length > 0,
    'kept-7': best >= 7,
    'first-topaz': lv.some((n) => n >= 2),
    'kept-30': best >= 30,
    'first-carnelian': lv.some((n) => n >= 3),
    'wsc-memorized': memorized('westminster-shorter'),
    'wlc-memorized': memorized('westminster-larger'),
    'apostles-memorized': memorized('apostles-creed'),
    'nicene-memorized': memorized('nicene-creed'),
    'first-emerald': lv.some((n) => n >= 4),
  };
  return AWARDS.filter((a) => met[a.id]).map((a) => a.id);
}

// After a session: raise any levels the log now shows, stamp new awards, and say what changed.
export interface Settled { progress: MemberProgress; ups: { itemId: string; from: number; to: number }[]; awards: string[] }
export function settle(p: MemberProgress, items: Item[], track: Track, now: Date): Settled {
  const levels = earnedLevels(items, track, p, now);
  const ups = Object.entries(levels).filter(([id, n]) => n > (p.levels[id] ?? 0)).map(([itemId, to]) => ({ itemId, from: p.levels[itemId] ?? 0, to }));
  const withLevels = { ...p, levels };
  const fresh = awardsMet(withLevels, items, localDay(now)).filter((id) => !p.awards[id]);
  const awards = { ...p.awards };
  for (const id of fresh) awards[id] = now.toISOString();
  return { progress: { ...withLevels, awards }, ups: ups.sort((a, b) => b.to - a.to), awards: fresh };
}
