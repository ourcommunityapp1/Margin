// The planner: what the next lesson in a course should hold. Lessons are just numbered; the app decides
// what goes in each one, at the pace it judges best:
//   - lesson 1 is a welcome: what this is, a few easy questions, then a first question, gently;
//   - most lessons bring one new question, two when you're flying, and practice what came before;
//   - every third lesson, or whenever reviews pile up or accuracy dips, is practice only;
//   - a unit's last lesson locks its questions in; after a long absence, the first lesson catches up.
// Practice picks the questions most likely to have slipped first, weighted toward ones you've missed.

import { groupsOf, lockInsWaiting, nextActivity, unitsFor, unitText, type Group, type Unit } from './lesson.ts';
import { localDay, waitingForSleep, type MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

const DAY = 86_400_000;
export const AWAY_DAYS = 21;
export const PRACTICE_EVERY = 3;

export interface Pick { itemId: string; risk: number; recall: number; strength: number }

export type LessonPlan =
  | { kind: 'welcome'; units: Unit[]; group: Group }
  | { kind: 'learn'; units: Unit[]; group: Group }
  | { kind: 'practice'; picks: Pick[]; why: 'rhythm' | 'catch-up' | 'steady' | 'all-learned' }
  | { kind: 'checkpoint'; group: Group }
  | { kind: 'welcome-back'; picks: Pick[] };

// The chance of recalling an item right now: see memory.ts.
export { recallChance } from './memory.ts';
import { itemChance, recallChance, type PartMem } from './memory.ts';

// Learned items, most at risk first: likely forgotten by now, weighted up for a history of misses.
// With part memories (the newer engine), an item is as likely to slip as its weakest part.
export function riskOrder(p: MemberProgress, itemIds: Set<string>, now: Date, parts?: Record<string, PartMem>): Pick[] {
  const misses = new Map<string, number>();
  for (const e of p.log) if (!e.correct && e.kind !== 'intro' && itemIds.has(e.itemId)) misses.set(e.itemId, (misses.get(e.itemId) ?? 0) + 1);
  return Object.entries(p.cards)
    .filter(([id]) => itemIds.has(id))
    .map(([itemId, card]) => {
      const byPart = parts ? itemChance(itemId, parts, now) : null;
      const recall = byPart === null ? recallChance(card, now) : Math.min(recallChance(card, now), byPart);
      const trouble = 1 + 0.4 * card.lapses + 0.15 * Math.min(6, misses.get(itemId) ?? 0);
      return { itemId, recall, strength: card.stability, risk: (1 - recall) * trouble };
    })
    .sort((a, b) => b.risk - a.risk);
}

// Each session's share of first-try right answers, newest first, for the course's items.
export function recentAccuracy(p: MemberProgress, itemIds: Set<string>, sessions = 2): number[] {
  const by = new Map<string, { right: number; total: number }>();
  for (const e of p.log) {
    if (!itemIds.has(e.itemId) || e.kind === 'intro') continue;
    const s = by.get(e.at) ?? { right: 0, total: 0 };
    s.total++; if (e.correct) s.right++;
    by.set(e.at, s);
  }
  return [...by].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, sessions).map(([, s]) => s.right / s.total);
}

// Lessons finished in this course. Older progress had no per-course count, so count its sessions.
export function lessonsDone(p: MemberProgress, courseId: string, itemIds: Set<string>): number {
  const stored = p.courseLessons[courseId];
  if (stored !== undefined) return stored;
  return new Set(p.log.filter((e) => itemIds.has(e.itemId)).map((e) => e.at)).size;
}

function lastSeen(p: MemberProgress, itemIds: Set<string>): number | null {
  let last: number | null = null;
  for (const e of p.log) if (itemIds.has(e.itemId)) { const t = Date.parse(e.at); if (last === null || t > last) last = t; }
  return last;
}

export function planNext(o: { courseId: string; items: Item[]; track: Track; p: MemberProgress; now: Date }): LessonPlan | null {
  const { items, track, p, now } = o;
  const ids = new Set(items.map((i) => i.id));
  const done = lessonsDone(p, o.courseId, ids);
  const picks = riskOrder(p, ids, now);
  const learned = new Set(p.units);
  const waiting = lockInsWaiting(items, (id) => waitingForSleep(p, id, now));
  const act = nextActivity(items, track, learned, new Set(p.checkpoints), waiting);

  if (done === 0 && act?.kind === 'learn') return { kind: 'welcome', units: [act.unit], group: act.group };

  const last = lastSeen(p, ids);
  if (picks.length && last !== null && now.getTime() - last >= AWAY_DAYS * DAY) return { kind: 'welcome-back', picks: picks.slice(0, 8) };

  if (!act) return picks.length ? { kind: 'practice', picks: picks.slice(0, 6), why: 'all-learned' } : null;
  if (act.kind === 'checkpoint') return { kind: 'checkpoint', group: act.group };

  const dueNow = picks.filter((x) => x.recall < 0.9).length;
  const acc = recentAccuracy(p, ids);
  const struggling = acc.length > 0 && acc[0] < 0.7;
  const lessonNumber = done + 1;
  if (picks.length >= 3 && (dueNow >= 8 || struggling)) return { kind: 'practice', picks: picks.slice(0, 6), why: struggling ? 'steady' : 'catch-up' };
  if (picks.length >= 3 && lessonNumber % PRACTICE_EVERY === 0) return { kind: 'practice', picks: picks.slice(0, 6), why: 'rhythm' };

  // Flying: the last two lessons nearly perfect and nothing waiting, so bring a second short question.
  const units = [act.unit];
  const flying = acc.length === 2 && acc.every((a) => a >= 0.9) && dueNow === 0;
  if (flying && act.unit.of === 1) {
    const after = nextActivity(items, track, new Set([...learned, act.unit.key]), new Set(p.checkpoints), waiting);
    if (after?.kind === 'learn' && after.group.key === act.group.key && after.unit.of === 1) units.push(after.unit);
  }
  return { kind: 'learn', units, group: act.group };
}

// One line for Today's "Up next" card.
export function describe(plan: LessonPlan, groupName: (g: Group) => string): string {
  switch (plan.kind) {
    case 'welcome': return 'Welcome: what this is and how Katekize helps you remember, then your first question.';
    case 'learn': return plan.units.length > 1 ? 'Two new questions, and practice on the ones before.' : 'A new question, and practice on the ones before.';
    case 'checkpoint': return `Lock in ${groupName(plan.group)}: each one from memory.`;
    case 'welcome-back': return `Welcome back. Catch up on ${plan.picks.length} questions, starting with the ones most likely to have slipped.`;
    case 'practice': return plan.why === 'steady' ? `Practice: ${plan.picks.length} questions to steady what you’ve learned.`
      : plan.why === 'catch-up' ? `Practice: ${plan.picks.length} questions that are due, most at risk first.`
      : `Practice: ${plan.picks.length} questions, starting with the ones most likely to slip.`;
  }
}


// When a course might be learned, and in long-term memory, at a daily goal. A rough guide, not a promise:
//   - a lesson on a typical 20-word piece takes about 6 minutes; shorter pieces take less (a 10-word
//     verse about 3), but no lesson is under 2½ minutes or over 6;
//   - a lock-in takes about 4 minutes;
//   - two lessons in three bring something new; the third is practice;
//   - reviews grow as more is learned, so allow a fifth more time for them;
//   - long-term memory (Emerald) asks for six months of right answers, one after two months away, after the
//     last question is learned.
export const LESSON_MINUTES = 6;
const LOCK_IN_MINUTES = 4;
export const GOALS = [5, 15, 25] as const;

export interface Projection { remaining: number; learnDays: number; learnedBy: Date; longTermBy: Date }

const lessonMinutes = (words: number) => Math.min(LESSON_MINUTES, Math.max(2.5, (LESSON_MINUTES * words) / 20));

export function project(o: { items: Item[]; track: Track; p: MemberProgress; minutes: number; now: Date }): Projection {
  const learned = new Set(o.p.units), locks = new Set(o.p.checkpoints);
  const todo = o.items.flatMap((i) => unitsFor(i, o.track).filter((u) => !learned.has(u.key)).map((u) => unitText(i, o.track, u).text.split(/\s+/).length));
  const lockIns = groupsOf(o.items).filter((g) => !locks.has(g.key)).length;
  const remaining = todo.length + lockIns;
  const work = todo.reduce((sum, w) => sum + lessonMinutes(w), 0) + lockIns * LOCK_IN_MINUTES;
  const perDay = o.minutes * (2 / 3) / 1.2;
  const learnDays = remaining === 0 ? 0 : Math.ceil(work / perDay);
  const learnedBy = new Date(o.now.getTime() + learnDays * DAY);
  return { remaining, learnDays, learnedBy, longTermBy: new Date(learnedBy.getTime() + 182 * DAY) };
}

// "When you lie down": offered from 7 pm until 3 am, once a night. Up to five questions: those learned
// today (still waiting for their first night) first, then a few on the edge of being forgotten.
export const EVENING_FROM = 19;
export function bedtimePicks(p: MemberProgress, itemIds: Set<string>, now: Date): string[] {
  const fresh = Object.keys(p.cards).filter((id) => itemIds.has(id) && waitingForSleep(p, id, now));
  const edge = riskOrder(p, itemIds, now).filter((x) => !fresh.includes(x.itemId) && x.recall >= 0.55 && x.recall <= 0.88).map((x) => x.itemId);
  return [...fresh.slice(0, 4), ...edge].slice(0, 5);
}
// The evening the night belongs to: before 3 am counts as the evening before.
const eveningOf = (d: Date) => localDay(new Date(d.getTime() - 3 * 3_600_000));
export function nightOffer(p: MemberProgress, itemIds: Set<string>, now: Date): string[] | null {
  const h = now.getHours();
  if (h < EVENING_FROM && h >= 3) return null;
  if (p.night && eveningOf(new Date(p.night.at)) === eveningOf(now)) return null;
  const picks = bedtimePicks(p, itemIds, now);
  return picks.length ? picks : null;
}

// "When you rise": the morning after a night review, from 4 am until noon, once.
export function riseOffer(p: MemberProgress, now: Date): string[] | null {
  const n = p.night;
  if (!n || n.risen || !n.items.length) return null;
  const h = now.getHours();
  if (h < 4 || h >= 12) return null;
  return eveningOf(new Date(n.at)) !== eveningOf(now) ? n.items : null;
}
