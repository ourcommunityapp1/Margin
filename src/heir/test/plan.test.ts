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
