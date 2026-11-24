// Keeping words in memory. A verse or answer counts toward "words in memory" once it has its first stone, and then it has to
// be recalled again in time. Two rules (see docs/social/FRIENDS_ARCHITECTURE.md §2.6):
//   1. Recall it within its window: 90 days, 240 once it reaches Emerald, 425 once it reaches Sapphire. Two weeks before
//      the window ends it is "due for review"; when it ends the words leave your count.
//   2. A recall that goes wrong keeps the words in your count until the end of the next day. Right by then: nothing lost.
//      Not: the words leave. A right recall brings them back at once.
// Stones never go down; this only changes the count. For the first 30 days after launch nothing leaves anyone's count.
// Pure functions over the keep record the phone and the server both store (progress.ts, `Keep`), so both agree.

import { levelOf } from './levels.ts';
import { itemWords } from './measures.ts';
import { unitsFor } from './lesson.ts';
import { keepFromLog, localDay, type Keep, type MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

const DAY = 86_400_000;

/** Days an item may go without a right recall, by the stone it has reached. */
export function windowDays(level: number): number {
  return level >= 5 ? 425 : level >= 4 ? 240 : 90;
}
export const REVIEW_NOTICE_DAYS = 14;

/** When the rules start. Nothing leaves anyone's count for 30 days after this. (Owner's account first, then everyone.) */
export const KEEP_LAUNCH = new Date('2026-11-25T00:00:00Z');

/** The keep record for a person: what is stored, with anything newer in the answer log folded in (and the log alone for older progress). */
export function keepOf(p: MemberProgress, partsOf?: (itemId: string) => number | undefined): Record<string, Keep> {
  const fromLog = keepFromLog(p.log, partsOf);
  const out: Record<string, Keep> = { ...fromLog };
  const later = (a?: string, b?: string) => (!a ? b : !b ? a : a >= b ? a : b);
  for (const [id, k] of Object.entries(p.keep ?? {})) {
    const l = out[id] ?? {};
    const merged: Keep = { good: later(l.good, k.good), miss: later(l.miss, k.miss), full: later(l.full, k.full) };
    out[id] = Object.fromEntries(Object.entries(merged).filter(([, v]) => v)) as Keep;
  }
  return out;
}
export const GRACE_DAYS_AFTER_LAUNCH = 30;

export type KeepState =
  | { state: 'kept' }
  | { state: 'review'; deadline: Date }
  | { state: 'try-again'; deadline: Date }
  | { state: 'out'; since: Date };

export interface KeepOptions {
  /** Which recall counts: of the whole item (every part right in one lesson, the default), or of any one part. */
  mode?: 'any-part' | 'whole';
  /** When the rules start for this person; nothing leaves their count for the first 30 days after this. Null: not started. */
  launch: Date | null;
  /** The person's time zone, for "the end of the next day". */
  tz?: string | null;
}

const formats = new Map<string, Intl.DateTimeFormat | null>();
/** The calendar day (yyyy-mm-dd) of a moment in a time zone. One formatter is built per zone and reused. */
export function dayKeyIn(ms: number, tz?: string | null): string {
  const zone = tz || '';
  let f = formats.get(zone);
  if (f === undefined) {
    try { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { f = null; }
    formats.set(zone, f);
  }
  return f ? f.format(new Date(ms)) : localDay(new Date(ms));
}

/** Whether a missed recall (due by `deadline`, the end of the day after the miss) happened today or yesterday. */
export function missedWhen(deadline: Date, now: Date, tz?: string | null): 'today' | 'yesterday' {
  return dayKeyIn(deadline.getTime(), tz) === dayKeyIn(now.getTime(), tz) ? 'yesterday' : 'today';
}

/** The last moment of the local day after `from`'s day (the time a missed recall must be put right by). */
export function endOfNextDay(from: Date, tz?: string | null): Date {
  const key = (ms: number) => dayKeyIn(ms, tz);
  // Walk forward a quarter hour at a time (every real time zone changes date on a quarter hour) until the date has changed
  // twice, then find the minute of the second change.
  const QUARTER = 15 * 60_000;
  let t = from.getTime(), seen = key(t), changes = 0;
  while (changes < 2) { t += QUARTER; const k = key(t); if (k !== seen) { seen = k; changes++; } }
  let lo = t - QUARTER, hi = t; // the change is in (lo, hi]
  const before = key(lo);
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (key(mid) === before) lo = mid; else hi = mid; }
  return new Date(hi - 1);
}

/**
 * Where one item stands. `level` is the stone it has reached (0: no stone, so it isn't counted at all, and is reported kept).
 * `keep` is its record: the last right recall and the last miss.
 */
export function keepState(level: number, keep: Keep | undefined, now: Date, o: KeepOptions): KeepState {
  if (level < 1) return { state: 'kept' };
  const good = ((o.mode ?? 'whole') === 'whole' ? keep?.full : keep?.good) ?? null;
  const miss = keep?.miss ?? null;
  const t = now.getTime();
  const graceEnds = o.launch ? o.launch.getTime() + GRACE_DAYS_AFTER_LAUNCH * DAY : Infinity;
  const leave = (since: Date): KeepState => (t < graceEnds ? { state: 'review', deadline: new Date(graceEnds) } : { state: 'out', since });

  // A recall that went wrong after the last right one: put right by the end of the next day, or the words leave.
  if (miss && (!good || miss > good)) {
    const deadline = endOfNextDay(new Date(miss), o.tz);
    return t <= deadline.getTime() ? { state: 'try-again', deadline } : leave(deadline);
  }
  if (!good) {
    // Never recalled since it earned its stone (older progress): the window starts when the rules do.
    if (!o.launch) return { state: 'kept' };
    const end = new Date(o.launch.getTime() + windowDays(level) * DAY);
    return t >= end.getTime() ? leave(end) : t >= end.getTime() - REVIEW_NOTICE_DAYS * DAY ? { state: 'review', deadline: end } : { state: 'kept' };
  }
  const end = new Date(Date.parse(good) + windowDays(level) * DAY);
  if (t >= end.getTime()) return leave(end);
  if (t >= end.getTime() - REVIEW_NOTICE_DAYS * DAY) return { state: 'review', deadline: end };
  return { state: 'kept' };
}

export interface Held { item: Item; level: number; state: KeepState; words: number }

/** Every item that has a stone, with where it stands. */
export function heldItems(items: Item[], p: MemberProgress, track: Track, now: Date, o: KeepOptions): Held[] {
  const counts = new Map(items.map((i) => [i.id, unitsFor(i, track).length]));
  const keep = keepOf(p, (id) => counts.get(id));
  return items
    .filter((i) => levelOf(p, i.id) >= 1)
    .map((item) => ({ item, level: levelOf(p, item.id), state: keepState(levelOf(p, item.id), keep[item.id], now, o), words: itemWords(item, track) }));
}

export interface KeepSummary {
  /** Words counted in memory now: everything with a stone except what has left. */
  wordsKept: number;
  /** Words that have left your count (and come back with one right recall). */
  wordsOut: number;
  tryAgain: Held[];
  review: Held[];
  out: Held[];
}

export function summarize(held: Held[]): KeepSummary {
  const by = (s: KeepState['state']) => held.filter((h) => h.state.state === s);
  const out = by('out');
  return {
    wordsKept: held.filter((h) => h.state.state !== 'out').reduce((n, h) => n + h.words, 0),
    wordsOut: out.reduce((n, h) => n + h.words, 0),
    tryAgain: by('try-again'),
    review: by('review').sort((a, b) => (a.state as { deadline: Date }).deadline.getTime() - (b.state as { deadline: Date }).deadline.getTime()),
    out,
  };
}

/** The latest a review may be scheduled: two weeks before its window ends, or the next day after a miss. */
export function clampDue(due: Date, level: number, keep: Keep | undefined, now: Date, tz?: string | null, mode: 'any-part' | 'whole' = 'whole'): Date {
  const goodIso = (mode === 'whole' ? keep?.full : keep?.good) ?? null;
  const good = goodIso ? Date.parse(goodIso) : null;
  const miss = keep?.miss ?? null;
  if (miss && (!goodIso || miss > goodIso)) return new Date(Math.min(due.getTime(), endOfNextDay(new Date(miss), tz).getTime()));
  if (good === null) return due;
  const latest = good + (windowDays(level) - REVIEW_NOTICE_DAYS) * DAY;
  return new Date(Math.min(due.getTime(), Math.max(latest, now.getTime())));
}
