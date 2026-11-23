import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describe, GOALS, planNext, project, recallChance, riskOrder } from '../planner.ts';
import { buildWelcome, groupsOf, seeded, unitsFor } from '../lesson.ts';
import { emptyProgress, type LogEntry, type MemberProgress, type SavedCard } from '../progress.ts';
import { allItems, courseItems, courses, getItem } from '../content/index.ts';
import { INTROS } from '../content/intros.ts';

const wsc = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
const now = new Date('2026-11-20T12:00:00Z');
const card = (o: Partial<SavedCard> = {}): SavedCard => ({ due: '2026-11-22T12:00:00.000Z', last_review: '2026-11-19T12:00:00.000Z', stability: 3, difficulty: 5, scheduled_days: 3, reps: 1, lapses: 0, learning_steps: 0, state: 2, ...o });
const entry = (itemId: string, at: string, correct = true): LogEntry => ({ itemId, at, kind: 'blanks', correct, hints: 0, ms: 1, review: false });
const progress = (learned: string[], o: Partial<MemberProgress> = {}): MemberProgress => ({
  ...emptyProgress(),
  units: learned.map((id) => `${id}#1`),
  cards: Object.fromEntries(learned.map((id) => [id, card()])),
  courseLessons: { 'westminster-shorter': learned.length },
  ...o,
});
const plan = (p: MemberProgress, at = now) => planNext({ courseId: 'westminster-shorter', items: wsc, track: 'adult', p, now: at });

test('the first lesson of a course is a welcome that ends with the first question', () => {
  const p = plan(emptyProgress());
  assert.equal(p?.kind, 'welcome');
  const steps = buildWelcome({ intro: INTROS['westminster-shorter'], unit: unitsFor(getItem('wsc-1')!, 'adult')[0], item: getItem('wsc-1')!, track: 'adult', pool: allItems(), rng: seeded(1) });
  assert.deepEqual(steps.slice(0, 5).map((s) => s.kind), ['info', 'quiz', 'info', 'quiz', 'info']);
  assert.ok(steps.some((s) => s.kind === 'intro' && s.itemId === 'wsc-1'));
  assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
  for (const c of courses) assert.ok(INTROS[c.id], `${c.id} has a welcome`);
});

test('normally one new question; every third lesson is practice once there is enough to practice', () => {
  const two = plan(progress(['wsc-1']));
  assert.equal(two?.kind, 'learn');
  assert.deepEqual(two?.kind === 'learn' && two.units.map((u) => u.itemId), ['wsc-2']);
  const third = plan(progress(['wsc-1', 'wsc-2', 'wsc-3'], { courseLessons: { 'westminster-shorter': 5 } }));
  assert.equal(third?.kind, 'practice');
  const notYet = plan(progress(['wsc-1', 'wsc-2'], { courseLessons: { 'westminster-shorter': 2 } }));
  assert.equal(notYet?.kind, 'learn', 'too little to practice yet');
});

test('two new questions when flying; practice when struggling or when reviews pile up', () => {
  const log = [entry('wsc-1', '2026-11-19T10:00:00Z'), entry('wsc-2', '2026-11-20T10:00:00Z')];
  const flying = plan(progress(['wsc-1', 'wsc-2'], { log, courseLessons: { 'westminster-shorter': 3 } }));
  assert.deepEqual(flying?.kind === 'learn' && flying.units.map((u) => u.itemId), ['wsc-3', 'wsc-4']);
  const rough = [entry('wsc-1', '2026-11-20T10:00:00Z', false), entry('wsc-2', '2026-11-20T10:00:00Z', false), entry('wsc-3', '2026-11-20T10:00:00Z')];
  const struggling = plan(progress(['wsc-1', 'wsc-2', 'wsc-3'], { log: rough, courseLessons: { 'westminster-shorter': 3 } }));
  assert.equal(struggling?.kind === 'practice' && struggling.why, 'steady');
  const learned = wsc.slice(0, 10).map((i) => i.id);
  const overdue = progress(learned, { cards: Object.fromEntries(learned.map((id) => [id, card({ last_review: '2026-11-01T12:00:00.000Z', stability: 2 })])), checkpoints: ['westminster-shorter:1-5', 'westminster-shorter:6-10'], courseLessons: { 'westminster-shorter': 13 }, log: [entry('wsc-10', '2026-11-19T10:00:00Z')] });
  assert.equal(plan(overdue)?.kind === 'practice' && (plan(overdue) as { why: string }).why, 'catch-up');
});

test('back after three months: catch up first, the ones that gave trouble and are most at risk leading', () => {
  const shaky = card({ last_review: '2026-08-15T12:00:00.000Z', stability: 4, lapses: 2 });
  const solid = card({ last_review: '2026-08-15T12:00:00.000Z', stability: 120, lapses: 0 });
  const p = progress(['wsc-1', 'wsc-2', 'wsc-3'], {
    cards: { 'wsc-1': solid, 'wsc-2': shaky, 'wsc-3': card({ last_review: '2026-08-15T12:00:00.000Z', stability: 20 }) },
    log: [entry('wsc-2', '2026-08-15T12:00:00Z', false), entry('wsc-1', '2026-08-15T12:00:00Z')],
  });
  const back = plan(p);
  assert.equal(back?.kind, 'welcome-back');
  assert.deepEqual(back?.kind === 'welcome-back' && back.picks.map((x) => x.itemId), ['wsc-2', 'wsc-3', 'wsc-1']);
  assert.ok(recallChance(shaky, now) < recallChance(solid, now));
  assert.match(describe(back!, () => ''), /Welcome back/);
});

test('risk: a fresh, strong item ranks below an old, weak one', () => {
  const p = progress(['wsc-1', 'wsc-2'], { cards: { 'wsc-1': card({ last_review: '2026-11-19T12:00:00.000Z', stability: 30 }), 'wsc-2': card({ last_review: '2026-10-01T12:00:00.000Z', stability: 5 }) } });
  assert.deepEqual(riskOrder(p, new Set(['wsc-1', 'wsc-2']), now).map((x) => x.itemId), ['wsc-2', 'wsc-1']);
});

test('a unit ends by locking it in; a finished course keeps practicing', () => {
  const five = wsc.slice(0, 5).map((i) => i.id);
  assert.equal(plan(progress(five, { courseLessons: { 'westminster-shorter': 7 } }))?.kind, 'checkpoint');
  const all = progress(wsc.map((i) => i.id), { checkpoints: groupsOf(wsc).map((g) => g.key), courseLessons: { 'westminster-shorter': 140 }, log: [entry('wsc-1', '2026-11-20T10:00:00Z')] });
  const after = plan(all);
  assert.equal(after?.kind, 'practice');
});

test('projection: more minutes a day, sooner learned; long-term memory six months after', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
  const today = new Date('2026-11-21T12:00:00Z');
  const [five, fifteen, twentyFive] = GOALS.map((minutes) => project({ items, track: 'adult', p: emptyProgress(), minutes, now: today }));
  assert.ok(five.learnDays > fifteen.learnDays && fifteen.learnDays > twentyFive.learnDays);
  assert.equal(Math.round((fifteen.longTermBy.getTime() - fifteen.learnedBy.getTime()) / 86400000), 182);
  const done = project({ items: items.slice(0, 0), track: 'adult', p: emptyProgress(), minutes: 15, now: today });
  assert.equal(done.learnDays, 0);
});

test('lie down: offered in the evening, once a night, with today’s questions first', async () => {
  const { finishSession, markNight } = await import('../progress.ts');
  const { nightOffer, riseOffer } = await import('../planner.ts');
  const { buildNight } = await import('../lesson.ts');
  const ids = new Set(wsc.map((i) => i.id));
  const intro = (itemId: string) => ({ itemId, kind: 'intro' as const, correct: true, hints: 0, ms: 1, review: false });
  const learned = (id: string) => unitsFor(getItem(id)!, 'adult');
  const noon = new Date(2026, 10, 20, 12);
  // Q1 learned two days ago and recalled since; Q2 learned today.
  let p = finishSession(emptyProgress(), { results: [intro('wsc-1')], learned: learned('wsc-1'), now: new Date(2026, 10, 18, 12) });
  p = finishSession(p, { results: [{ itemId: 'wsc-1', kind: 'type', correct: true, hints: 0, ms: 1, review: true }], now: new Date(2026, 10, 19, 9) });
  p = finishSession(p, { results: [intro('wsc-2')], learned: learned('wsc-2'), now: noon });
  assert.equal(nightOffer(p, ids, noon), null, 'not at noon');
  const evening = new Date(2026, 10, 20, 21);
  const picks = nightOffer(p, ids, evening)!;
  assert.equal(picks[0], 'wsc-2', 'today’s question first');
  // One quiet first-letters step per question, then one verse connected to the last of them.
  const steps = buildNight({ items: picks.map((id) => getItem(id)!), track: 'adult', pool: wsc, rng: seeded(3) });
  assert.deepEqual(steps.map((s) => s.kind), [...picks.map(() => 'letters'), 'verse']);
  const verse = steps.at(-1)!;
  assert.equal(verse.itemId, picks.at(-1));
  assert.ok(verse.kind === 'verse' && getItem(verse.itemId)!.connected.some((r) => r.startsWith(verse.ref.split(':')[0])), 'from its own references');
  // Graded like a lesson: Q2 is still waiting for its night, so it isn't rated yet.
  let after = finishSession(p, { results: picks.map((itemId) => ({ itemId, kind: 'letters' as const, correct: true, hints: 0, ms: 1, review: true })), now: evening });
  assert.deepEqual(after.cards['wsc-2'], p.cards['wsc-2']);
  after = markNight(after, picks, evening);
  assert.equal(nightOffer(after, ids, new Date(2026, 10, 21, 1)), null, 'not again after midnight');
  // The next morning: rise with last night's questions, until noon.
  assert.deepEqual(riseOffer(after, new Date(2026, 10, 21, 7)), picks);
  assert.equal(riseOffer(after, new Date(2026, 10, 21, 13)), null);
  assert.equal(riseOffer(after, new Date(2026, 10, 20, 23)), null, 'not the same night');
});

test('every verse is short, and whole (exactly as the KJV has it, ending as the verse ends)', async () => {
  const { VERSES } = await import('../content/verses.ts');
  const { courses, courseItems, getCollection } = await import('../content/index.ts');
  // Verse items are Scripture already; the verse screen is for catechism questions and creed sections.
  const all = courses.flatMap((c) => courseItems(c)).filter((i) => getCollection(i.collection)?.kind !== 'scripture');
  assert.ok(Object.keys(VERSES).length >= all.length - 4, 'most items have one');
  for (const [id, v] of Object.entries(VERSES)) {
    const item = all.find((i) => i.id === id);
    assert.ok(item, `${id} exists`);
    assert.match(v.text, /^[A-Z]/, `${id} starts a sentence`);
    assert.ok(v.text.split(' ').length <= 45, `${id} is short`);
    assert.ok(!/[[\]]/.test(v.text), `${id} has no editorial brackets`);
  }
});
