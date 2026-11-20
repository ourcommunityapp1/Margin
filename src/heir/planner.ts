// The planner: what the next lesson in a course should hold. Lessons are just numbered; the app decides
// what goes in each one, at the pace it judges best:
//   - lesson 1 is a welcome: what this is, a few easy questions, then a first question, gently;
//   - most lessons bring one new question, two when you're flying, and practice what came before;
//   - every third lesson, or whenever reviews pile up or accuracy dips, is practice only;
//   - a unit's last lesson locks its questions in; after a long absence, the first lesson catches up.
// Practice picks the questions most likely to have slipped first, weighted toward ones you've missed.

import { nextActivity, type Group, type Unit } from './lesson.ts';
import type { MemberProgress, SavedCard } from './progress.ts';
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

// The chance of recalling an item right now, from its schedule (the FSRS forgetting curve).
export function recallChance(card: SavedCard, now: Date): number {
  const last = card.last_review ? Date.parse(card.last_review) : Date.parse(card.due) - card.scheduled_days * DAY;
  const days = Math.max(0, (now.getTime() - last) / DAY);
  const s = Math.max(0.1, card.stability);
  return Math.pow(1 + (19 / 81) * (days / s), -0.5);
}

// Learned items, most at risk first: likely forgotten by now, weighted up for a history of misses.
export function riskOrder(p: MemberProgress, itemIds: Set<string>, now: Date): Pick[] {
  const misses = new Map<string, number>();
  for (const e of p.log) if (!e.correct && e.kind !== 'intro' && itemIds.has(e.itemId)) misses.set(e.itemId, (misses.get(e.itemId) ?? 0) + 1);
  return Object.entries(p.cards)
    .filter(([id]) => itemIds.has(id))
    .map(([itemId, card]) => {
      const recall = recallChance(card, now);
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
  const act = nextActivity(items, track, learned, new Set(p.checkpoints));

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
    const after = nextActivity(items, track, new Set([...learned, act.unit.key]), new Set(p.checkpoints));
    if (after?.kind === 'learn' && after.group.key === act.group.key && after.unit.of === 1) units.push(after.unit);
  }
  return { kind: 'learn', units, group: act.group };
}

// One line for Today's "Up next" card.
export function describe(plan: LessonPlan, groupName: (g: Group) => string): string {
  switch (plan.kind) {
    case 'welcome': return 'Welcome: what this is and how Heir helps you remember, then your first question.';
    case 'learn': return plan.units.length > 1 ? 'Two new questions, and practice on the ones before.' : 'A new question, and practice on the ones before.';
    case 'checkpoint': return `Lock in ${groupName(plan.group)}: each one from memory.`;
    case 'welcome-back': return `Welcome back. Catch up on ${plan.picks.length} questions, starting with the ones most likely to have slipped.`;
    case 'practice': return plan.why === 'steady' ? `Practice: ${plan.picks.length} questions to steady what you’ve learned.`
      : plan.why === 'catch-up' ? `Practice: ${plan.picks.length} questions that are due, most at risk first.`
      : `Practice: ${plan.picks.length} questions, starting with the ones most likely to slip.`;
  }
}

