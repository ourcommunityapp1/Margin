import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describe, planNext, recallChance, riskOrder } from '../planner.ts';
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
