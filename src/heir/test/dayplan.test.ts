import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardStates, dayEvents, extraSessions, mergeToday, minutesToday, nextLine, planDay, startedCourses, withFix, withPlan, withSession, withStarted, type Today } from '../dayplan.ts';
import { emptyProgress, finishSession, mergeProgress, parseProgress, type MemberProgress, type SavedCard } from '../progress.ts';
import { courseItems, courses } from '../content/index.ts';
import { unitsFor } from '../lesson.ts';

const now = new Date('2026-11-24T15:00:00');
const day = '2026-11-24';
const course = (id: string) => courses.find((c) => c.id === id)!;
const card = (due: string, o: Partial<SavedCard> = {}): SavedCard => ({ due, last_review: '2026-11-10T12:00:00.000Z', stability: 10, difficulty: 5, scheduled_days: 10, reps: 3, lapses: 0, learning_steps: 0, state: 2, ...o });
// Learn the first n items of a course (all their parts), each due on `due`.
function learn(p: MemberProgress, id: string, n: number, due: string): MemberProgress {
  const items = courseItems(course(id)).slice(0, n);
  return {
    ...p,
    units: [...p.units, ...items.flatMap((i) => unitsFor(i, 'adult').map((u) => u.key))],
    cards: { ...p.cards, ...Object.fromEntries(items.map((i) => [i.id, card(due)])) },
    courseLessons: { ...p.courseLessons, [id]: n },
  };
}
const later = '2026-12-30T12:00:00.000Z', past = '2026-11-20T12:00:00.000Z';

test('started courses: anything learned, focus first even if not begun', () => {
  const p = learn(emptyProgress(), 'psalm-23', 2, later);
  assert.deepEqual(startedCourses(p, 'adult', 'westminster-shorter').map((c) => c.id), ['westminster-shorter', 'psalm-23']);
});

test('a normal day: the focus lesson, then reviews from other courses while they fit the goal', () => {
  let p = learn(emptyProgress(), 'westminster-shorter', 3, later);
  p = learn(p, 'psalm-23', 3, past);
  const started = startedCourses(p, 'adult', 'westminster-shorter');
  const cards = planDay({ p, track: 'adult', started, focus: 'westminster-shorter', goal: 15, now });
  assert.deepEqual(cards.map((c) => `${c.kind}:${c.course}`), ['lesson:westminster-shorter', 'review:psalm-23']);
  assert.equal(cards[0].id, `${day}:lesson:westminster-shorter`);
  // A five-minute goal: the lesson alone.
  assert.deepEqual(planDay({ p, track: 'adult', started, focus: 'westminster-shorter', goal: 5, now }).map((c) => c.kind), ['lesson']);
});

test('a fix comes first and takes the place of that course\'s review; reviews piling up come before the lesson', () => {
  let p = learn(emptyProgress(), 'westminster-shorter', 3, later);
  p = learn(p, 'psalm-23', 6, past);
  p = learn(p, 'creeds', 1, past);
  const started = startedCourses(p, 'adult', 'westminster-shorter');
  const fixItem = courseItems(course('creeds'))[0].id;
  const cards = planDay({ p, track: 'adult', started, focus: 'westminster-shorter', goal: 25, now, fix: [fixItem] });
  assert.deepEqual(cards.map((c) => `${c.kind}:${c.course}`), ['fix:creeds', 'review:psalm-23', 'lesson:westminster-shorter']);
});

test('never more than four cards, always at least one', () => {
  const p = learn(emptyProgress(), 'psalm-23', 1, later);
  const cards = planDay({ p, track: 'adult', started: startedCourses(p, 'adult', null), focus: null, goal: 5, now });
  assert.equal(cards.length, 0, 'nothing due and no focus: nothing to recommend');
  let q = learn(emptyProgress(), 'westminster-shorter', 2, later);
  for (const id of ['psalm-23', 'creeds', 'lords-prayer', 'ten-commandments', 'shema']) q = learn(q, id, 1, past);
  const many = planDay({ p: q, track: 'adult', started: startedCourses(q, 'adult', 'westminster-shorter'), focus: 'westminster-shorter', goal: 60, now });
  assert.equal(many.length, 4);
});

test('cards are done by sessions started from them, or by matching course and kind; minutes add up', () => {
  const cards = [
    { id: `${day}:fix:creeds`, kind: 'fix' as const, course: 'creeds', est: 3 },
    { id: `${day}:lesson:westminster-shorter`, kind: 'lesson' as const, course: 'westminster-shorter', est: 6 },
    { id: `${day}:review:psalm-23`, kind: 'review' as const, course: 'psalm-23', est: 2 },
  ];
  let t: Today = withPlan(undefined, day, cards);
  t = withSession(t, day, { id: 's1', at: `${day}T10:00:00Z`, secs: 240, course: 'westminster-shorter', kind: 'lesson' });
  t = withSession(t, day, { id: 's2', at: `${day}T10:10:00Z`, secs: 180, course: 'creeds', kind: 'review' });
  t = withSession(t, day, { id: 's2', at: `${day}T10:10:00Z`, secs: 180, course: 'creeds', kind: 'review' });
  const st = cardStates(t);
  assert.deepEqual(st.map((s) => s.done), [true, true, false], 'a review in a course completes its fix');
  assert.equal(minutesToday(t), 7);
  assert.deepEqual(cardStates(t, (c) => c.course === 'psalm-23').map((s) => s.done), [true, true, true]);
  // A new day starts fresh.
  assert.equal(withSession(t, '2026-11-25', { id: 's3', at: '2026-11-25T08:00:00Z', secs: 60, course: 'creeds', kind: 'review' }).sessions.length, 1);
  // A fix found later joins at the end, once.
  const fix = { id: `${day}:fix:psalm-23`, kind: 'fix' as const, course: 'psalm-23', est: 3 };
  assert.equal(withFix(withFix(t, fix), fix).cards!.length, 4);
});

test('two phones: same day joins sessions and keeps one card order; the later day wins', () => {
  const c = (id: string) => ({ id, kind: 'review' as const, course: id, est: 2 });
  const a: Today = { day, cards: [c('a'), c('b')], sessions: [{ id: 's1', at: `${day}T09:00:00Z`, secs: 60, course: 'a', kind: 'review' }] };
  const b: Today = { day, cards: [c('b'), c('a')], sessions: [{ id: 's2', at: `${day}T09:30:00Z`, secs: 90, course: 'b', kind: 'review' }] };
  const m = mergeToday(a, b)!;
  assert.deepEqual(m.cards!.map((x) => x.id), ['a', 'b']);
  assert.equal(m.sessions.length, 2);
  assert.equal(mergeToday(a, { day: '2026-11-25', sessions: [] })!.day, '2026-11-25');
  // Through the whole progress merge and a save/load round trip.
  const p = { ...emptyProgress(), today: a }, q = { ...emptyProgress(), today: b };
  const merged = mergeProgress(p, q);
  assert.equal(merged.today!.sessions.length, 2);
  assert.deepEqual(parseProgress(JSON.stringify({ m: merged })).m.today, merged.today);
});

test('finishing a lesson keeps today, the night review and explanations', () => {
  const p: MemberProgress = { ...emptyProgress(), today: { day, sessions: [] }, night: { at: `${day}T02:00:00Z`, items: ['wsc-1'] }, explained: { 'wsc-1': `${day}T01:00:00Z` } };
  const next = finishSession(p, { results: [], now });
  assert.deepEqual(next.today, p.today);
  assert.deepEqual(next.night, p.night);
  assert.deepEqual(next.explained, p.explained);
});

test('the Keep going line', () => {
  const p = learn(emptyProgress(), 'psalm-23', 2, later);
  assert.equal(nextLine(p, 'adult', course('psalm-23'), now).text, 'Lesson 3 next');
  const all = learn(emptyProgress(), 'lords-prayer', courseItems(course('lords-prayer')).length, later);
  const line = nextLine({ ...all, checkpoints: ['lords-prayer:1-1', ...all.checkpoints] }, 'adult', course('lords-prayer'), now);
  assert.ok(['All learned', 'Lock-in next'].includes(line.text));
});

test('the brake: when reviews fill most of the day and something new came lately, no new material today', () => {
  let p = learn(emptyProgress(), 'westminster-shorter', 3, later);
  p = learn(p, 'psalm-23', 6, past);
  p = { ...p, log: [{ at: '2026-11-23T10:00:00Z', itemId: 'wsc-3', kind: 'intro', correct: true, hints: 0, ms: 1, review: false }] };
  const started = startedCourses(p, 'adult', 'westminster-shorter');
  assert.deepEqual(planDay({ p, track: 'adult', started, focus: 'westminster-shorter', goal: 4, now }).map((c) => `${c.kind}:${c.course}`), ['review:psalm-23']);
  // Three days without anything new: the lesson comes back.
  const quiet = { ...p, log: [{ ...p.log[0], at: '2026-11-20T10:00:00Z' }] };
  assert.ok(planDay({ p: quiet, track: 'adult', started, focus: 'westminster-shorter', goal: 4, now }).some((c) => c.kind === 'lesson'));
});

test('about three to five new pieces a week: after five new lessons in seven days, the day is for keeping (ADR-003)', () => {
  const p0 = learn(emptyProgress(), 'westminster-shorter', 3, later);
  const intro = (at: string) => ({ at, itemId: 'wsc-3', kind: 'intro' as const, correct: true, hints: 0, ms: 1, review: false });
  const started = startedCourses(p0, 'adult', 'westminster-shorter');
  const days = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'].map((d) => `${d}T10:00:00Z`);
  const four = { ...p0, log: days.slice(0, 4).map(intro) };
  const five = { ...p0, log: days.map(intro) };
  assert.ok(planDay({ p: four, track: 'adult', started, focus: 'westminster-shorter', goal: 15, now }).some((c) => c.kind === 'lesson'), 'four this week: a fifth comes');
  assert.ok(!planDay({ p: five, track: 'adult', started, focus: 'westminster-shorter', goal: 15, now }).some((c) => c.kind === 'lesson'), 'five this week: no new lesson today');
});

test('card events: shown, opened, finished, and merged across phones', () => {
  const cards = [
    { id: `${day}:fix:creeds`, kind: 'fix' as const, course: 'creeds', est: 3 },
    { id: `${day}:lesson:psalm-23`, kind: 'lesson' as const, course: 'psalm-23', est: 6 },
    { id: `${day}:review:westminster-shorter`, kind: 'review' as const, course: 'westminster-shorter', est: 4 },
  ];
  let t: Today = withPlan(undefined, day, cards);
  t = withStarted(t, day, cards[1].id);
  t = withStarted(withStarted(t, day, cards[1].id), day, cards[1].id);
  t = withSession(t, day, { id: 's1', at: `${day}T10:00:00Z`, secs: 240, course: 'creeds', kind: 'review', card: cards[0].id });
  const ev = dayEvents(t).map((e) => `${e.kind}:${e.event}`);
  assert.deepEqual(ev, ['fix:shown', 'fix:started', 'fix:finished', 'lesson:shown', 'lesson:started', 'review:shown']);
  assert.equal(dayEvents(t).find((e) => e.event === 'finished')!.secs, 240);
  assert.equal(t.started!.length, 1);
  const other: Today = { ...withPlan(undefined, day, cards), started: [cards[2].id] };
  assert.deepEqual(mergeToday(t, other)!.started!.sort(), [cards[1].id, cards[2].id].sort());
  assert.deepEqual(dayEvents(undefined), []);
});

test('sessions that finish no card are extras, so the day\'s minutes match what Today shows', () => {
  const cards = [
    { id: `${day}:lesson:westminster-shorter`, kind: 'lesson' as const, course: 'westminster-shorter', est: 6 },
    { id: `${day}:fix:westminster-shorter`, kind: 'fix' as const, course: 'westminster-shorter', est: 3 },
  ];
  let t: Today = withPlan(undefined, day, cards);
  t = withSession(t, day, { id: 'a', at: `${day}T10:00:00Z`, secs: 304, course: 'westminster-shorter', kind: 'lesson', card: cards[0].id });
  t = withSession(t, day, { id: 'b', at: `${day}T10:01:00Z`, secs: 26, course: 'westminster-shorter', kind: 'review', card: cards[1].id });
  t = withSession(t, day, { id: 'c', at: `${day}T11:00:00Z`, secs: 376, course: 'westminster-shorter', kind: 'review' });
  assert.deepEqual(extraSessions(t).map((s) => s.id), ['c']);
  assert.equal(minutesToday(t), 12, 'the day\'s minutes are the cards plus the extra: 5 + 0 + 6, rounded from seconds');
  assert.equal(cardStates(t).filter((s) => s.done).length, 2);
  assert.deepEqual(extraSessions(undefined), []);
});
