// The stone levels: what each question has earned, worked out from the answer log, plus the counts,
// streak and awards built on them. Pure functions over progress, so they are easy to test and tune.
//
// Two separate tracks:
//   Memory, the five levels (see below and tiers.ts): recalling it unaided (no hints) after time away. The longer the
//   time away, the higher the level; the top two need whole answers typed or said. Practicing more never earns one by itself.
//   Understanding: Learned (answered what it means), Understood (explained it in your own words, checked against the
//   notes), Mastered (also recalled every verse it rests on). See `understanding`.
//
// Why these gaps: a night's sleep is when a memory is first consolidated; spaced, successful recall across days
// (successive relearning, Rawson & Dunlosky) is what keeps it; recall after weeks and months away is the standard
// test of long-term retention (Cepeda et al. 2008); and Bahrick (1984) found what is still recalled after the first
// three to six years stays for decades ("permastore"). So Diamond asks for exactly that.

import { unitsFor } from './lesson.ts';
import { LIGHT_WEIGHT, lightPass } from './observe.ts';
import { localDay, type LogEntry, type MemberProgress } from './progress.ts';
import { relatedFor } from './related.ts';
import type { Item, Track } from './types.ts';

// The five levels a question or verse climbs (ADR-005). Stored as `levels[itemId]`: 0 none yet, then
//   1 Familiar    you've been through its lesson (a very low bar)
//   2 Recalled    recalled unaided on a later day than the lesson (a whole answer, or light recall showing at least 0.5)
//   3 Memorized   recalled on three different days, with variety
//   4 Proficient  typed or said in full, right, after three weeks or more away (whole answers only)
//   5 Expert      known six months, three or more whole answers in that time all right, one after two months away
// Names, gems and wording are in tiers.ts. A level never goes down. Words "in memory" start at Recalled.
export const FAMILIAR = 1, RECALLED = 2, MEMORIZED = 3, PROFICIENT = 4, EXPERT = 5;
export const TOP_LEVEL = EXPERT;
export { LEVEL_SCALE, migrateLevel, onCurrentScale } from './level-scale.ts';

const DAY = 86_400_000;
const FULL = new Set(['type', 'say']);
// Unaided recall: the whole thing produced from memory, with no hints.
const unaided = (e: LogEntry) => FULL.has(e.kind) && e.correct && !e.hints;
const anyUnaided = (s: { entries: LogEntry[] }) => s.entries.some(unaided);

// ---- Light recall (ADR-003). Reviews are light now (blanks, first letters, putting phrases in order, spotting the wrong word,
// matching), so the first three stones can also be earned by consistent recall across a variety of light steps. Each kind is
// weighed by how much it shows: the easy ones (recognizing, ordering) count little and must be right the first time; the
// ones that make you produce words count more and keep today's slack for a slip or two. Whole recall always counts in full
// and the higher stones still need it (see levelFromLog).
export { LIGHT_WEIGHT };
type Sess = { at: number; entries: LogEntry[] };
/** How much one session shows: 1 for a whole answer; else the weights of the distinct light kinds passed (a kind missed first and passed on the retry counts half), at most 1. */
export function evidence(s: Sess): number {
  if (anyUnaided(s)) return 1;
  let sum = 0;
  for (const kind of Object.keys(LIGHT_WEIGHT)) {
    const es = s.entries.filter((e) => e.kind === kind);
    if (!es.length) continue;
    sum += lightPass(es[0]) ? LIGHT_WEIGHT[kind] : es.some(lightPass) ? LIGHT_WEIGHT[kind] / 2 : 0;
  }
  return Math.min(1, sum);
}
/** A session in which some light kind was never answered right (a miss that was not put right in the same session). */
const failedLight = (s: Sess) => Object.keys(LIGHT_WEIGHT).some((kind) => { const es = s.entries.filter((e) => e.kind === kind); return es.length > 0 && !es.some(lightPass); });
const lightKinds = (s: Sess) => Object.keys(LIGHT_WEIGHT).filter((k) => s.entries.some((e) => e.kind === k && lightPass(e)));
/** The sessions that count toward a stone: whole answers always; light ones only after the last light miss ("consistent"), with `min` evidence. */
export function countingSessions(ss: Sess[], min: number): Sess[] {
  const lastFail = Math.max(-1, ...ss.filter(failedLight).map((s) => s.at));
  return ss.filter((s) => anyUnaided(s) || (s.at > lastFail && evidence(s) >= min));
}

// Sessions for one item, oldest first: each is the answers given in one lesson or review.
function sessions(log: LogEntry[], itemId: string): { at: number; entries: LogEntry[] }[] {
  const by = new Map<string, LogEntry[]>();
  for (const e of log) if (e.itemId === itemId && e.kind !== 'intro') by.set(e.at, [...(by.get(e.at) ?? []), e]);
  return [...by].map(([at, entries]) => ({ at: Date.parse(at), entries })).sort((a, b) => a.at - b.at);
}

/** Recited: every part typed in full and right with no hints (stage 0 on the memory ladder). */
export function recited(item: Item, track: Track, log: LogEntry[]): boolean {
  const n = log.filter((e) => e.itemId === item.id && e.kind === 'type' && e.correct && !e.hints).length;
  return n >= unitsFor(item, track).length;
}

// The level the log shows right now: 0 when it shows nothing beyond the lesson (`earnedLevels` raises that to Familiar for what
// is learned), else Recalled to Expert. Stored levels never go down; see `earnedLevels`.
export function levelFromLog(item: Item, track: Track, log: LogEntry[], now: Date): number {
  if (!recited(item, track, log)) return 0;
  const ss = sessions(log, item.id);
  // Gaps are measured from the item's previous session of any kind: time truly away from it.
  const afterGap = (days: number) => ss.filter((s, i) => i > 0 && s.at - ss[i - 1].at >= days * DAY && anyUnaided(s));
  const firstRecall = ss.find(anyUnaided);

  // Recalled: recalled on a later day than it was first practiced: a whole answer, or light recall that shows at least 0.5.
  // Recall in the same sitting is mostly short-term memory; recall after a night's sleep is the first sign it's stored.
  const firstDay = ss.length ? localDay(new Date(ss[0].at)) : '';
  const counting = countingSessions(ss, 0.5);
  if (!counting.some((s) => localDay(new Date(s.at)) !== firstDay)) return 0;

  // Memorized: recalled on three different days (the lesson day counts); light days must show variety (two or more kinds of
  // step across them) unless a later day was a whole answer.
  const days = new Set(counting.map((s) => localDay(new Date(s.at))));
  const variety = counting.some((x) => anyUnaided(x) && localDay(new Date(x.at)) !== firstDay) || new Set(counting.flatMap(lightKinds)).size >= 2;
  if (days.size < 3 || !variety) return RECALLED;

  // Proficient: typed or said in full, right with no hints, after three weeks or more away. Whole answers only.
  if (!afterGap(21).length) return MEMORIZED;

  // Expert: at some point, known six months, with every whole answer in those six months right (at least three), one of them
  // after two months away. Checked as of each session, so a later long gap doesn't undo it.
  const gap60 = afterGap(60);
  const expertAt = (t: number) => {
    const since = t - 182 * DAY;
    if (!firstRecall || firstRecall.at > since) return false;
    const recent = ss.filter((s) => s.at >= since && s.at <= t).flatMap((s) => s.entries.filter((e) => FULL.has(e.kind)));
    return recent.length >= 3 && recent.every((e) => e.correct) && gap60.some((s) => s.at >= since && s.at <= t);
  };
  if (!expertAt(now.getTime()) && !ss.some((s) => s.at <= now.getTime() && expertAt(s.at))) return PROFICIENT;
  return EXPERT;
}

/** Learned: every part of it has been through its lesson. */
export const isLearned = (item: Item, track: Track, p: MemberProgress): boolean => {
  const learned = new Set(p.units);
  return unitsFor(item, track).every((u) => learned.has(u.key));
};

// Levels never go down: a stored level stays, and a higher one replaces it.
export function earnedLevels(items: Item[], track: Track, p: MemberProgress, now: Date): Record<string, number> {
  const out: Record<string, number> = { ...p.levels };
  for (const item of items) {
    let n = levelFromLog(item, track, p.log, now);
    if (n === 0 && isLearned(item, track, p)) n = FAMILIAR;
    if (n > (out[item.id] ?? 0)) out[item.id] = n;
  }
  return out;
}

// ---- Understanding: a separate track from memory. Shown by explaining, not by recognizing (Chi's self-explanation).

export const UNDERSTANDING = [
  { n: 1, name: 'Learned', means: 'You’ve answered what it means.' },
  { n: 2, name: 'Understood', means: 'You’ve explained it in your own words and checked it against the notes.' },
  { n: 3, name: 'Mastered', means: 'Understood, and you’ve recalled every verse it rests on.' },
] as const;

/** Every related verse recalled from memory (and the item has some). */
export function relatedDone(item: Item, p: MemberProgress): boolean {
  const rel = relatedFor(item);
  return rel.length > 0 && rel.every((r) => !!p.related?.[r]);
}

/** 0 (not yet) … 3 Mastered. Only items with meaning notes have an understanding track. */
export function understanding(item: Item, p: MemberProgress): number {
  if (!item.meaning.length) return 0;
  const learned = p.log.some((e) => e.itemId === item.id && e.kind === 'meaning' && e.correct) || !!p.explained?.[item.id];
  if (!learned) return 0;
  if (!p.explained?.[item.id]) return 1;
  return relatedDone(item, p) || !relatedFor(item).length ? 3 : 2;
}

export const levelOf = (p: MemberProgress, itemId: string): number => p.levels[itemId] ?? 0;

/** The level to show: the stored one, and at least Familiar for anything learned (so it shows at once, before the next lesson settles it). */
export const levelShown = (p: MemberProgress, item: Item, track: Track): number => Math.max(levelOf(p, item.id), isLearned(item, track, p) ? FAMILIAR : 0);

// Overdue for review: the level stays, but the stone fades until the next good review.
export function needsRefresh(p: MemberProgress, itemId: string, now: Date): boolean {
  const card = p.cards[itemId];
  return !!card && Date.parse(card.due) < now.getTime() - DAY / 2;
}

// What the next level asks for, in a few words (the five levels people see, see tiers.ts), or null at the top (Expert).
export function nextStep(item: Item, track: Track, p: MemberProgress, now: Date): string | null {
  const n = levelOf(p, item.id);
  void now;
  if (n === 0) return 'Finish its lesson to make it Familiar';
  if (n === FAMILIAR) return recited(item, track, p.log) ? 'Recalled, once you recall it after a night’s sleep' : 'Recalled, once you type it in full with no hints and recall it after a night’s sleep';
  if (n === RECALLED) {
    const days = new Set(countingSessions(sessions(p.log, item.id), 0.5).map((s) => localDay(new Date(s.at)))).size;
    const left = Math.max(1, 3 - days);
    return `Memorized, once you recall it on ${left} more ${left === 1 ? 'day' : 'days'}`;
  }
  if (n === MEMORIZED) return 'Proficient, once you type it right after three weeks away';
  if (n === PROFICIENT) return 'Expert, once it’s held for six months';
  return null;
}

/** How many items are at each level or higher: Recalled, Memorized, Proficient, Expert (Familiar is "learned"). */
export interface Counts { know: number; memorized: number; mastered: number; longTerm: number }
export function countsFor(items: Item[], p: MemberProgress): Counts {
  const lv = items.map((i) => levelOf(p, i.id));
  return {
    know: lv.filter((n) => n >= RECALLED).length,
    memorized: lv.filter((n) => n >= MEMORIZED).length,
    mastered: lv.filter((n) => n >= PROFICIENT).length,
    longTerm: lv.filter((n) => n >= EXPERT).length,
  };
}

// How many items sit at each level (their highest), level 1 to 5.
export function shelf(items: Item[], p: MemberProgress): number[] {
  const out = [0, 0, 0, 0, 0];
  for (const i of items) { const n = levelOf(p, i.id); if (n > 0) out[Math.min(n, TOP_LEVEL) - 1]++; }
  return out;
}

// ---- Days kept: Sunday is a day of rest, and each week (Monday to Sunday) has one more free day. Learning on those days
// counts; skipping one never breaks the run. A second skipped day in the same week does.

const isSunday = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).getDay() === 0; };
const prevDay = (day: string) => { const [y, m, d] = day.split('-').map(Number); return localDay(new Date(y, m - 1, d - 1)); };
// The Monday that starts the week a day is in.
const weekOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); const w = new Date(y, m - 1, d); return localDay(new Date(y, m - 1, d - ((w.getDay() + 6) % 7))); };

export function daysKept(days: string[], today: string): number {
  const set = new Set(days);
  let d = set.has(today) ? today : prevDay(today);
  const freeUsed = new Set<string>();
  let n = 0;
  for (let guard = 0; guard < 4000; guard++) {
    if (set.has(d)) n++;
    else if (!isSunday(d)) {
      const week = weekOf(d);
      if (freeUsed.has(week)) break;
      freeUsed.add(week);
    }
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
  { id: 'first-amethyst', name: 'First Recalled', hint: 'Recall one unaided after a night’s sleep' },
  { id: 'first-lock', name: 'First unit locked in', hint: 'Finish a unit’s Lock it in' },
  { id: 'kept-7', name: '7 days kept', hint: 'Keep 7 days in a row' },
  { id: 'first-topaz', name: 'First Memorized', hint: 'Recall one unaided on 3 different days' },
  { id: 'kept-30', name: '30 days kept', hint: 'Keep 30 days in a row' },
  { id: 'first-carnelian', name: 'First Proficient', hint: 'Type one right after three weeks away' },
  { id: 'wsc-memorized', name: 'Shorter Catechism memorized', hint: 'Every Shorter question Memorized' },
  { id: 'wlc-memorized', name: 'Larger Catechism memorized', hint: 'Every Larger question Memorized' },
  { id: 'apostles-memorized', name: 'Apostles’ Creed memorized', hint: 'Every section Memorized' },
  { id: 'nicene-memorized', name: 'Nicene Creed memorized', hint: 'Every section Memorized' },
  { id: 'first-emerald', name: 'First Expert', hint: 'Six months of right typed answers' },
];

export function awardsMet(p: MemberProgress, all: Item[], today: string): string[] {
  const lv = Object.values(p.levels);
  const best = Math.max(bestDaysKept(p.days), daysKept(p.days, today));
  const memorized = (collection: string) => {
    const list = all.filter((i) => i.collection === collection);
    return list.length > 0 && list.every((i) => levelOf(p, i.id) >= MEMORIZED);
  };
  const met: Record<string, boolean> = {
    'first-lesson': p.lessons > 0,
    'first-amethyst': lv.some((n) => n >= RECALLED),
    'first-lock': p.checkpoints.length > 0,
    'kept-7': best >= 7,
    'first-topaz': lv.some((n) => n >= MEMORIZED),
    'kept-30': best >= 30,
    'first-carnelian': lv.some((n) => n >= PROFICIENT),
    'wsc-memorized': memorized('westminster-shorter'),
    'wlc-memorized': memorized('westminster-larger'),
    'apostles-memorized': memorized('apostles-creed'),
    'nicene-memorized': memorized('nicene-creed'),
    'first-emerald': lv.some((n) => n >= EXPERT),
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
