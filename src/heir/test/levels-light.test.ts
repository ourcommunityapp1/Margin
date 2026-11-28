import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelFromLog, evidence } from '../levels.ts';
import { unitsFor } from '../lesson.ts';
import { getItem } from '../content/index.ts';
import type { LogEntry } from '../progress.ts';

const item = getItem('wsc-1')!;
const parts = unitsFor(item, 'adult');
let n = 0;
const e = (day: number, kind: string, correct = true, extra: Partial<LogEntry> = {}): LogEntry => ({ id: `e${n++}`, at: new Date(2026, 9, day, 9).toISOString(), itemId: item.id, kind: kind as LogEntry['kind'], correct, hints: 0, ms: 1, review: true, ...(parts.length ? { part: parts[0].key, of: parts.length } : {}), words: 12, misses: correct ? 0 : 6, ...extra });
// The lesson: every part typed in full on day 1 (so it is recited).
const lesson = () => parts.map((u) => e(1, 'type', true, { part: u.key }));
const at = new Date(2026, 11, 1);

test('light recall earns Recalled and Memorized: variety across days, near-perfect on the easy steps, a miss starts the count again', () => {
  // Day 1 recited, then light recall on later days.
  assert.equal(levelFromLog(item, 'adult', lesson(), at), 0, 'recited, nothing yet');
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'order')], at), 2, 'one easy step, right first time, on a later day: Recalled');
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'order', false)], at), 0, 'an easy step missed counts for nothing');
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'blanks')], at), 2, 'filling in the blanks counts');
  // Memorized: three days, and two or more kinds of step.
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'order'), e(4, 'order'), e(7, 'order')], at), 2, 'three days of the same easy step is not enough variety');
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'order'), e(4, 'spot'), e(7, 'blanks')], at), 3, 'three days, three kinds of step: Memorized');
  // A miss in the middle starts the light count again; whole answers still count.
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'order'), e(4, 'spot'), e(5, 'blanks', false), e(7, 'blanks')], at), 2, 'a missed light day resets: only the days after it count');
  assert.equal(levelFromLog(item, 'adult', [...lesson(), e(2, 'order'), e(4, 'type'), e(5, 'blanks', false), e(7, 'blanks')], at), 3, 'a whole answer still counts in full');
  // Proficient needs a gap of three weeks and a whole answer: light steps, however good, stay at Memorized.
  const base = [...lesson(), e(2, 'order'), e(4, 'spot'), e(7, 'blanks')];
  assert.equal(levelFromLog(item, 'adult', [...base, e(30, 'order')], at), 3, 'an easy step after three weeks is not enough for Proficient');
  assert.equal(levelFromLog(item, 'adult', [...base, e(30, 'blanks')], at), 3, 'blanks after three weeks: still Memorized, it takes a whole answer');
  assert.equal(levelFromLog(item, 'adult', [...base, e(30, 'type')], at), 4, 'a typed answer after three weeks: Proficient');
  // Proficient and Expert need whole answers: light recall never reaches them.
  const long = [...base, e(30, 'blanks'), ...[0, 30, 60, 90, 120, 150, 180, 210, 240].map((d) => ({ ...e(1, 'letters'), at: new Date(2026, 10 + Math.floor(d / 30), 1 + (d % 30), 9).toISOString() }))];
  assert.ok(levelFromLog(item, 'adult', long, new Date(2028, 0, 1)) <= 3, 'light recall alone stops at Memorized');
});

test('light evidence is weighed by step: easy steps weigh little, the ones that make you produce words weigh more', () => {
  const s = (...es: LogEntry[]) => ({ at: Date.parse(es[0].at), entries: es });
  assert.equal(evidence(s(e(2, 'type'))), 1);
  assert.ok(evidence(s(e(2, 'match'))) < evidence(s(e(2, 'order'))));
  assert.ok(evidence(s(e(2, 'order'))) < evidence(s(e(2, 'blanks'))));
  assert.ok(evidence(s(e(2, 'blanks'))) < evidence(s(e(2, 'letters'))));
  assert.equal(evidence(s(e(2, 'order'), e(2, 'letters'))), 1, 'capped at one');
  assert.equal(evidence(s(e(2, 'spot', false))), 0, 'an easy miss shows nothing');
  assert.equal(evidence(s(e(2, 'spot', false), e(2, 'spot'))), 0.25, 'missed then put right: half weight');
  assert.ok(evidence(s(e(2, 'blanks', true, { hints: 1 }))) === 0, 'with a hint: nothing');
});
