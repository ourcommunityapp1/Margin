import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyCourse, emptyHousehold, inPlan, parseHousehold, removeFromPlan, setPlan } from '../household.ts';
import { startedCourses } from '../dayplan.ts';
import { emptyProgress, finishSession } from '../progress.ts';
import { unitsFor } from '../lesson.ts';
import { getItem } from '../content/index.ts';

const withPlan = (course: string, minutes?: number) => setPlan(emptyHousehold(), { course, minutes });

test('adding a course makes it the daily course and keeps the others in the plan', () => {
  let h = withPlan('westminster-shorter', 7);
  h = setPlan(h, { course: 'creeds' });
  assert.equal(h.plan?.course, 'creeds');
  assert.equal(h.plan?.minutes, 7);
  assert.equal(inPlan(h.plan, 'westminster-shorter', true), true, 'a started course stays in the plan');
  assert.equal(inPlan(h.plan, 'westminster-shorter', false), false, 'an unstarted one is not');
});

test('removing a course takes it out of the plan, keeps the rest, and hands over the daily course', () => {
  let h = setPlan(withPlan('westminster-shorter', 7), { course: 'creeds' });
  h = removeFromPlan(h, 'creeds', 'westminster-shorter');
  assert.equal(h.plan?.course, 'westminster-shorter');
  assert.deepEqual(h.plan?.removed, ['creeds']);
  assert.equal(inPlan(h.plan, 'creeds', true), false);
  assert.equal(dailyCourse(h.plan), 'westminster-shorter');
  // Removing the daily course with nothing to take over leaves no daily course.
  const none = removeFromPlan(withPlan('creeds'), 'creeds', null);
  assert.equal(dailyCourse(none.plan), null);
});

test('adding a removed course back brings it back', () => {
  let h = removeFromPlan(setPlan(withPlan('westminster-shorter'), { course: 'creeds' }), 'westminster-shorter', null);
  assert.deepEqual(h.plan?.removed, ['westminster-shorter']);
  h = setPlan(h, { course: 'westminster-shorter' });
  assert.equal(h.plan?.removed, undefined);
  assert.equal(dailyCourse(h.plan), 'westminster-shorter');
});

test('the plan survives being saved and read back', () => {
  const h = removeFromPlan(setPlan(withPlan('westminster-shorter', 15), { course: 'creeds' }), 'creeds', 'westminster-shorter');
  assert.deepEqual(parseHousehold(JSON.stringify(h)).plan, h.plan);
  assert.equal(parseHousehold(JSON.stringify({ members: [], plan: { course: 'creeds', removed: [3, 'x'] } })).plan?.removed?.[0], 'x');
});

test('a removed course is not in the day: no lessons, no reviews', () => {
  const us = unitsFor(getItem('wsc-1')!, 'adult');
  const p = finishSession(emptyProgress(), { results: [{ itemId: 'wsc-1', kind: 'intro', correct: true, hints: 0, ms: 1, review: false }], learned: us, courseId: 'westminster-shorter', now: new Date(2026, 10, 2, 9) });
  assert.deepEqual(startedCourses(p, 'adult', null).map((c) => c.id), ['westminster-shorter']);
  assert.deepEqual(startedCourses(p, 'adult', null, ['westminster-shorter']), []);
  assert.deepEqual(startedCourses(p, 'adult', 'westminster-shorter', ['westminster-shorter']).map((c) => c.id), ['westminster-shorter'], 'the daily course is always kept');
});

test('a single verse can be added to the plan on its own, without its course, and taken out again', async () => {
  const { addVerse, removeVerse } = await import('../household.ts');
  let h = withPlan('westminster-shorter', 7);
  h = addVerse(h, 'fv-3', 'first-verses');
  assert.deepEqual(h.plan?.verses, ['fv-3']);
  assert.equal(h.plan?.course, 'westminster-shorter');
  assert.equal(addVerse(h, 'fv-3', 'first-verses').plan?.verses?.length, 1, 'adding twice is the same as once');
  assert.equal(removeVerse(h, 'fv-3').plan?.verses, undefined);
  assert.deepEqual(parseHousehold(JSON.stringify(h)).plan?.verses, ['fv-3']);
  // With no plan yet, the verse alone makes one, with no daily course.
  const alone = addVerse(emptyHousehold(), 'fv-3', 'first-verses');
  assert.equal(dailyCourse(alone.plan), null);
  assert.deepEqual(alone.plan?.verses, ['fv-3']);
});

test('learning one verse of a course on its own does not bring the whole course into the plan', () => {
  const us = unitsFor(getItem('fv-3')!, 'adult');
  const p = finishSession(emptyProgress(), { results: [{ itemId: 'fv-3', kind: 'intro', correct: true, hints: 0, ms: 1, review: false }], learned: us, courseId: 'first-verses', now: new Date(2026, 10, 2, 9) });
  assert.deepEqual(startedCourses(p, 'adult', null).map((c) => c.id), ['first-verses'], 'before: the course counts as started');
  assert.deepEqual(startedCourses(p, 'adult', null, [], ['fv-3']), [], 'with the verse added on its own it does not');
});

test('Today offers a lesson for a verse added on its own, and reviews it once learned', async () => {
  const { planDay } = await import('../dayplan.ts');
  const now = new Date(2026, 10, 20, 9);
  const base = { p: emptyProgress(), track: 'adult' as const, started: [], focus: null, goal: 7, now, verses: ['fv-3'] };
  const cards = planDay(base);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, 'lesson');
  assert.equal(cards[0].item, 'fv-3');
  assert.equal(cards[0].course, 'first-verses');
  assert.match(cards[0].id, /^2026-11-20:lesson:fv-3$/);
  // Learned on Nov 2: due for a review later, as its own course's review card, though the course is not in the plan.
  const us = unitsFor(getItem('fv-3')!, 'adult');
  let p = finishSession(emptyProgress(), { results: [{ itemId: 'fv-3', kind: 'intro', correct: true, hints: 0, ms: 1, review: false }, ...us.map((u) => ({ itemId: 'fv-3', kind: 'type' as const, correct: true, hints: 0, ms: 1, review: false, part: u.key, of: us.length }))], learned: us, courseId: 'first-verses', now: new Date(2026, 10, 2, 9) });
  p = finishSession(p, { results: us.map((u) => ({ itemId: 'fv-3', kind: 'type' as const, correct: true, hints: 0, ms: 1, review: true, part: u.key, of: us.length })), now: new Date(2026, 10, 3, 9) });
  const later = planDay({ ...base, p, now: new Date(2026, 10, 30, 9) });
  assert.deepEqual(later.map((c) => [c.kind, c.course]), [['review', 'first-verses']]);
});

test('plan fields this version does not know are kept through parse, setPlan, remove', () => {
  const raw = JSON.stringify({ members: [{ id: 'a', name: 'A', track: 'adult', createdAt: '2026-01-01' }], activeMemberId: 'a', plan: { course: 'fv', minutes: 7, newer: { x: 1 } } });
  const h = parseHousehold(raw);
  assert.deepEqual((h.plan as unknown as Record<string, unknown>).newer, { x: 1 });
  const h2 = setPlan(h, { course: 'psalms' });
  assert.deepEqual((h2.plan as unknown as Record<string, unknown>).newer, { x: 1 });
  const h3 = removeFromPlan(h2, 'psalms', 'fv');
  assert.deepEqual((h3.plan as unknown as Record<string, unknown>).newer, { x: 1 });
});
