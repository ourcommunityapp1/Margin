import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress } from '../progress.ts';
import { statsFor } from '../stats.ts';
import { getItem, courses, courseItems } from '../content/index.ts';
import { unitsFor } from '../lesson.ts';

const q1 = getItem('wsc-1')!, q2 = getItem('wsc-2')!;
const wc = (t: string) => t.split(/\s+/).filter(Boolean).length;
const course = courses.find((c) => c.id === 'westminster-shorter')!;
const inputs = [{ id: course.id, items: courseItems(course) }];
const all = [q1, q2];

test('stats count words, stones (each keeps the lower ones), days kept and courses from progress', () => {
  const p = {
    ...emptyProgress(),
    units: unitsFor(q1, 'adult').map((u) => u.key),
    levels: { 'wsc-1': 3, 'wsc-2': 1 },
    days: ['2026-11-22', '2026-11-23', '2026-11-24'],
    log: [{ at: '2026-11-20T10:00:00Z', itemId: 'wsc-1', kind: 'type' as const, correct: true, hints: 0, ms: 1, review: false }],
  };
  const s = statsFor(inputs, all, 'adult', p, '2026-11-24');
  assert.deepEqual(s.stones, [2, 1, 1, 0, 0, 0]);
  assert.equal(s.wordsInMemory, wc(q1.chunks.adult.join(' ')) + wc(q2.chunks.adult.join(' ')));
  assert.equal(s.streak, 3);
  assert.equal(s.lastDay, '2026-11-24');
  assert.deepEqual(s.courses, [{ course: 'westminster-shorter', learned: 1, total: inputs[0].items.length }]);
});

test('a person with nothing yet has zeros, no courses and no last day', () => {
  const s = statsFor(inputs, all, 'adult', emptyProgress(), '2026-11-24');
  assert.deepEqual(s, { wordsInMemory: 0, stones: [0, 0, 0, 0, 0, 0], streak: 0, lastDay: null, courses: [] });
});
