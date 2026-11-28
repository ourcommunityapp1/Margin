import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, mergeProgress, sameProgress, type LogEntry, type MemberProgress } from '../progress.ts';

const entry = (at: string, itemId: string, kind: LogEntry['kind'] = 'type'): LogEntry => ({ at, itemId, kind, correct: true, hints: 0, ms: 1, review: false });
const phone = (): MemberProgress => ({
  ...emptyProgress(), units: ['fv-1#1', 'fv-2#1'], checkpoints: ['first-verses:1-3'], lessons: 4, courseLessons: { 'first-verses': 4 },
  levels: { 'fv-1': 2, 'fv-2': 1 }, awards: { 'first-lesson': '2026-11-19T10:00:00Z' }, days: ['2026-11-19', '2026-11-20'],
  log: [entry('2026-11-19T10:00:00Z', 'fv-1'), entry('2026-11-20T10:00:00Z', 'fv-2')],
  cards: { 'fv-1': { due: '2026-11-25T00:00:00Z', last_review: '2026-11-20T10:00:00Z', stability: 3, difficulty: 5, elapsed_days: 1, scheduled_days: 5, learning_steps: 0, reps: 2, lapses: 0, state: 2 } as MemberProgress['cards'][string] },
});
const account = (): MemberProgress => ({
  ...emptyProgress(), units: ['fv-1#1', 'xm-1#1'], lessons: 5, courseLessons: { 'first-verses': 3, christmas: 2 },
  levels: { 'fv-1': 1, 'xm-1': 1 }, awards: { 'first-lesson': '2026-11-18T09:00:00Z', 'three-days': '2026-11-21T09:00:00Z' }, days: ['2026-11-18', '2026-11-20', '2026-11-21'],
  log: [entry('2026-11-20T10:00:00Z', 'fv-2'), entry('2026-11-21T09:00:00Z', 'xm-1')], related: { 'Romans 5:8': '2026-11-21T09:00:00Z' },
  cards: { 'fv-1': { due: '2026-11-30T00:00:00Z', last_review: '2026-11-21T09:00:00Z', stability: 6, difficulty: 5, elapsed_days: 1, scheduled_days: 9, learning_steps: 0, reps: 3, lapses: 0, state: 2 } as MemberProgress['cards'][string] },
  night: { at: '2026-11-21T21:00:00Z', items: ['xm-1'] },
});

test('merging keeps everything from both copies and never lowers anything', () => {
  const m = mergeProgress(phone(), account());
  assert.deepEqual(m.units, ['fv-1#1', 'fv-2#1', 'xm-1#1']);
  assert.deepEqual(m.checkpoints, ['first-verses:1-3']);
  assert.equal(m.lessons, 5);
  assert.deepEqual(m.courseLessons, { 'first-verses': 4, christmas: 2 });
  assert.deepEqual(m.levels, { 'fv-1': 2, 'fv-2': 1, 'xm-1': 1 });
  assert.deepEqual(m.awards, { 'first-lesson': '2026-11-18T09:00:00Z', 'three-days': '2026-11-21T09:00:00Z' });
  assert.deepEqual(m.days, ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
  assert.equal(m.log.length, 3, 'the answer in both copies is kept once');
  assert.deepEqual(m.log.map((e) => e.at), ['2026-11-19T10:00:00Z', '2026-11-20T10:00:00Z', '2026-11-21T09:00:00Z']);
  assert.equal(m.cards['fv-1'].last_review, '2026-11-21T09:00:00Z', 'the schedule reviewed most recently wins');
  assert.deepEqual(m.related, { 'Romans 5:8': '2026-11-21T09:00:00Z' });
  assert.equal(m.night?.at, '2026-11-21T21:00:00Z');
});

test('merging is the same either way round, and merging again changes nothing', () => {
  const ab = mergeProgress(phone(), account()), ba = mergeProgress(account(), phone());
  assert.deepEqual({ ...ab, units: [...ab.units].sort() }, { ...ba, units: [...ba.units].sort() });
  assert.ok(sameProgress(mergeProgress(ab, ab), ab));
  assert.ok(sameProgress(mergeProgress(ab, phone()), ab));
  assert.ok(sameProgress(mergeProgress(emptyProgress(), phone()), mergeProgress(phone(), emptyProgress())));
});
