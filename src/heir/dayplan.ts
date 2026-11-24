// The day's plan: which lessons and reviews Today recommends, one course each, in order, to fit the daily goal.
// Made once a day and kept with the person's progress, so every phone shows the same cards and nothing moves under
// your thumb. Whether a card is done is worked out from the sessions finished today (see `cardStates`), so a lesson
// started from "Keep going" counts too, and two phones merge cleanly.
//
// Order: things to fix first (a recall missed, to put right by the end of tomorrow), then any course whose reviews are
// piling up, then the focus course's next lesson, then other courses' reviews while time allows. See ADR-002.

import { courseItems, courses, type Course } from './content/index.ts';
import { unitsFor } from './lesson.ts';
import { lessonsDone, planNext } from './planner.ts';
import { dueCards, localDay, type MemberProgress } from './progress.ts';
import type { Track } from './types.ts';

export type CardKind = 'lesson' | 'review' | 'fix';
export interface DayCard { id: string; kind: CardKind; course: string; est: number }
/** One finished session today: a lesson, review, fix, extra practice, or a night or morning recall. */
export interface DaySession { id: string; at: string; secs: number; course: string; kind: CardKind | 'extra' | 'night' | 'rise'; card?: string }
export interface Today { day: string; cards?: DayCard[]; sessions: DaySession[]; /** Cards opened today (ids), finished or not. */ started?: string[] }

export const LESSON_EST = 6;
export const FIX_EST = 3;
export const MAX_CARDS = 4;
/** A course with this many reviews due is "piling up": its review comes before the lesson. */
export const PILE = 6;
export const reviewEst = (due: number) => Math.min(6, Math.max(2, Math.ceil(due * 0.75)));

/** The courses this person has started (learned anything in), with the focus course first even if not begun. */
export function startedCourses(p: MemberProgress, track: Track, focus: string | null): Course[] {
  const learned = new Set(p.units);
  const started = courses.filter((c) => c.id === focus || courseItems(c).some((i) => unitsFor(i, track).some((u) => learned.has(u.key))));
  return started.sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0));
}

/** Which course an item belongs to, among the started ones (the focus course first). */
export const courseOfItem = (started: Course[], itemId: string) => started.find((c) => courseItems(c).some((i) => i.id === itemId))?.id ?? null;

export function planDay(o: { p: MemberProgress; track: Track; started: Course[]; focus: string | null; goal: number; now: Date; fix?: string[] }): DayCard[] {
  const day = localDay(o.now);
  const card = (kind: CardKind, course: string, est: number): DayCard => ({ id: `${day}:${kind}:${course}`, kind, course, est });

  const fixCourses = [...new Set((o.fix ?? []).map((id) => courseOfItem(o.started, id)).filter((c): c is string => !!c))];
  const fixes = fixCourses.map((c) => card('fix', c, FIX_EST));

  // The focus course's next lesson (or its practice, when the planner says so).
  const focus = o.started.find((c) => c.id === o.focus);
  let lesson: DayCard | null = null;
  if (focus) {
    const plan = planNext({ courseId: focus.id, items: courseItems(focus), track: o.track, p: o.p, now: o.now });
    if (plan) lesson = plan.kind === 'practice' || plan.kind === 'welcome-back' ? card('review', focus.id, reviewEst(plan.picks.length)) : card('lesson', focus.id, LESSON_EST);
  }

  // Reviews in every other started course with anything due, most due first. A course being fixed is reviewed by its fix.
  const reviews = o.started
    .filter((c) => c.id !== o.focus && !fixCourses.includes(c.id))
    .map((c) => ({ c, due: dueCards(o.p, o.now, new Set(courseItems(c).map((i) => i.id))).length }))
    .filter((x) => x.due > 0)
    .sort((a, b) => b.due - a.due)
    .map((x) => ({ card: card('review', x.c.id, reviewEst(x.due)), piling: x.due >= PILE }));

  // The brake on new material: when reviews already fill most of the day, today is for keeping what you know, not adding.
  // Something new still comes at least every third day, so learning never stalls.
  if (lesson?.kind === 'lesson' && focus) {
    const load = o.started.reduce((n, c) => { const due = dueCards(o.p, o.now, new Set(courseItems(c).map((i) => i.id))).length; return n + (due ? reviewEst(due) : 0); }, 0);
    const lastNew = o.p.log.reduce((m, e) => (e.kind === 'intro' && e.at > m ? e.at : m), '');
    const daysSinceNew = lastNew ? (o.now.getTime() - Date.parse(lastNew)) / 86_400_000 : Infinity;
    if (load > 0.7 * o.goal && daysSinceNew < 3) {
      const focusDue = dueCards(o.p, o.now, new Set(courseItems(focus).map((i) => i.id))).length;
      lesson = focusDue ? card('review', focus.id, reviewEst(focusDue)) : null;
    }
  }
  if (lesson && fixCourses.includes(lesson.course) && lesson.kind === 'review') lesson = null;
  const ordered = [...fixes, ...reviews.filter((r) => r.piling).map((r) => r.card), ...(lesson ? [lesson] : []), ...reviews.filter((r) => !r.piling).map((r) => r.card)];

  // Fit the goal: fixes and the focus lesson are always in; reviews join while they fit. At least one card, at most four.
  const out: DayCard[] = [];
  let total = 0;
  for (const c of ordered) {
    if (out.length >= MAX_CARDS) break;
    const must = c.kind === 'fix' || c === lesson;
    if (must || !out.length || total + c.est <= o.goal) { out.push(c); total += c.est; }
  }
  return out;
}

export type CardState = { card: DayCard; done: boolean; secs: number };

/**
 * Which of today's cards are done. A session started from a card counts for that card. Any other session counts for the
 * first card not yet done in the same course and of the same kind (a review also completes a fix in that course).
 * `satisfied` marks a card done with no session, e.g. a review whose items were all reviewed elsewhere.
 */
export function cardStates(today: Today | undefined, satisfied: (c: DayCard) => boolean = () => false): CardState[] {
  const cards = today?.cards ?? [];
  const states: CardState[] = cards.map((card) => ({ card, done: false, secs: 0 }));
  const sessions = [...(today?.sessions ?? [])].sort((a, b) => a.at.localeCompare(b.at));
  for (const s of sessions) {
    let st = s.card ? states.find((x) => x.card.id === s.card && !x.done) : undefined;
    if (!st && !s.card) st = states.find((x) => !x.done && x.card.course === s.course && (x.card.kind === s.kind || (s.kind === 'review' && x.card.kind === 'fix')));
    if (st) { st.done = true; st.secs = s.secs; }
  }
  for (const st of states) if (!st.done && satisfied(st.card)) st.done = true;
  return states;
}

/** Minutes practiced today, all sessions counted. */
export const minutesToday = (today: Today | undefined) => Math.round((today?.sessions ?? []).reduce((n, s) => n + s.secs, 0) / 60);

/** Today's record for a new plan, keeping any sessions already finished today. */
export function withPlan(today: Today | undefined, day: string, cards: DayCard[]): Today {
  return { day, cards, sessions: today?.day === day ? today.sessions : [] };
}

/** Record that a card was opened. */
export function withStarted(today: Today | undefined, day: string, cardId: string): Today {
  const base: Today = today?.day === day ? today : { day, sessions: [] };
  return base.started?.includes(cardId) ? base : { ...base, started: [...(base.started ?? []), cardId] };
}

export interface DayEvent { day: string; card_id: string; course: string; kind: CardKind; event: 'shown' | 'started' | 'finished'; secs: number | null }

/** What happened to each of today's cards: shown, opened, finished (with its seconds). Sent to the account so we can tell whether the recommendations work. */
export function dayEvents(today: Today | undefined): DayEvent[] {
  if (!today?.cards) return [];
  const states = cardStates(today);
  return today.cards.flatMap((c, i) => {
    const base = { day: today.day, card_id: c.id, course: c.course, kind: c.kind };
    const out: DayEvent[] = [{ ...base, event: 'shown', secs: null }];
    if (today.started?.includes(c.id) || states[i].done) out.push({ ...base, event: 'started', secs: null });
    if (states[i].done) out.push({ ...base, event: 'finished', secs: states[i].secs });
    return out;
  });
}

/** Add a fix card made necessary during the day (a recall missed in a lesson), at the end. */
export function withFix(today: Today, card: DayCard): Today {
  return today.cards?.some((c) => c.id === card.id) ? today : { ...today, cards: [...(today.cards ?? []), card] };
}

/** Record a finished session. */
export function withSession(today: Today | undefined, day: string, s: DaySession): Today {
  const base: Today = today?.day === day ? today : { day, sessions: [] };
  return base.sessions.some((x) => x.id === s.id) ? base : { ...base, sessions: [...base.sessions, s] };
}

/** Two copies of today's record: the later day wins; on the same day, cards keep one order and sessions are joined. */
export function mergeToday(a?: Today, b?: Today): Today | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  const cards = a.cards || b.cards ? [...(a.cards ?? b.cards ?? []), ...((a.cards ? b.cards : []) ?? []).filter((c) => !(a.cards ?? []).some((x) => x.id === c.id))] : undefined;
  const sessions = [...a.sessions, ...b.sessions.filter((s) => !a.sessions.some((x) => x.id === s.id))];
  const started = [...new Set([...(a.started ?? []), ...(b.started ?? [])])];
  return { day: a.day, ...(cards ? { cards } : {}), sessions, ...(started.length ? { started } : {}) };
}

export function parseToday(v: unknown): Today | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const t = v as Partial<Today>;
  if (typeof t.day !== 'string') return undefined;
  const kinds = ['lesson', 'review', 'fix'];
  const cards = Array.isArray(t.cards) ? t.cards.filter((c) => c && typeof c.id === 'string' && typeof c.course === 'string' && kinds.includes(c.kind) && typeof c.est === 'number') : undefined;
  const sessions = Array.isArray(t.sessions) ? t.sessions.filter((s) => s && typeof s.id === 'string' && typeof s.at === 'string' && typeof s.secs === 'number' && typeof s.course === 'string' && typeof s.kind === 'string') : [];
  const started = Array.isArray(t.started) ? t.started.filter((x) => typeof x === 'string').slice(0, 20) : [];
  return { day: t.day, ...(cards ? { cards } : {}), sessions, ...(started.length ? { started } : {}) };
}

/** What a course's row says under its name in "Keep going". */
export function nextLine(p: MemberProgress, track: Track, course: Course, now: Date): { text: string; allLearned: boolean } {
  const items = courseItems(course);
  const plan = planNext({ courseId: course.id, items, track, p, now });
  const ids = new Set(items.map((i) => i.id));
  const learned = new Set(p.units);
  const allLearned = items.every((i) => unitsFor(i, track).every((u) => learned.has(u.key)));
  if (plan?.kind === 'checkpoint') return { text: 'Lock-in next', allLearned };
  if (allLearned) return { text: 'All learned', allLearned };
  return { text: `Lesson ${lessonsDone(p, course.id, ids) + 1} next`, allLearned };
}
