import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, type LogEntry } from '../progress.ts';
import { weekSummary } from '../week.ts';

const e = (at: string, itemId: string, kind: string, correct = true, review = true): LogEntry => ({ at, itemId, kind: kind as LogEntry['kind'], correct, hints: 0, ms: 1, review });

test('the week in one line: learned, kept, strengthened, days kept (last seven days only)', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  const p = {
    ...emptyProgress(),
    days: ['2026-11-18', '2026-11-21', '2026-11-22', '2026-11-24', '2026-11-25'],
    log: [
      e('2026-11-10T09:00:00Z', 'wsc-1', 'intro', true, false), // too old
      e('2026-11-22T09:00:00Z', 'wsc-2', 'intro', true, false), e('2026-11-22T09:00:00Z', 'wsc-3', 'intro', true, false), // one lesson, two pieces
      e('2026-11-24T09:00:00Z', 'wsc-4', 'intro', true, false),
      e('2026-11-23T09:00:00Z', 'wsc-1', 'order'), e('2026-11-25T09:00:00Z', 'wsc-1', 'blanks'),
      e('2026-11-23T09:00:00Z', 'wsc-5', 'letters', false), e('2026-11-25T09:00:00Z', 'wsc-5', 'letters'),
    ],
  };
  const w = weekSummary(p, now);
  assert.deepEqual(w, { learned: 2, kept: 2, strengthened: 1, days: 4 });
  assert.deepEqual(weekSummary(emptyProgress(), now), { learned: 0, kept: 0, strengthened: 0, days: 0 });
});
