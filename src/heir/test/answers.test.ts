import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, finishSession, mergeProgress, type LogEntry, type StepResult } from '../progress.ts';
import { toAnswerRows, unsent } from '../answers.ts';

const at = new Date('2026-11-24T10:00:00-06:00');
const res = (itemId: string, kind: StepResult['kind'], extra: Partial<StepResult> = {}): StepResult => ({ itemId, kind, correct: true, hints: 0, ms: 900, review: false, ...extra });
let n = 0;
const ids = () => `id-${++n}`;

test('every answer in a lesson is logged with its own id, the day, and the part and misses it was given', () => {
  const p = finishSession(emptyProgress(), { results: [res('wsc-1', 'type', { part: 'wsc-1#1', misses: 0 }), res('wsc-1', 'type', { part: 'wsc-1#2', misses: 2 })], now: at, newId: ids });
  assert.equal(p.log.length, 2);
  assert.equal(new Set(p.log.map((e) => e.id)).size, 2);
  assert.deepEqual(p.log.map((e) => e.part), ['wsc-1#1', 'wsc-1#2']);
  assert.deepEqual(p.log.map((e) => e.misses), [0, 2]);
  assert.equal(p.log[0].day, '2026-11-24');
});

test('two answers of the same kind to the same question in one lesson are both kept when merging (they used to be taken for one)', () => {
  const p = finishSession(emptyProgress(), { results: [res('wsc-1', 'type', { part: 'wsc-1#1' }), res('wsc-1', 'type', { part: 'wsc-1#2' }), res('wsc-1', 'type', { part: 'wsc-1#3' })], now: at, newId: ids });
  const merged = mergeProgress(p, p);
  assert.equal(merged.log.length, 3);
  assert.equal(mergeProgress(merged, emptyProgress()).log.length, 3);
  assert.equal(mergeProgress(emptyProgress(), p).log.length, 3);
});

test('merging copies of the same lesson from two phones never doubles an answer', () => {
  const phone = finishSession(emptyProgress(), { results: [res('wsc-1', 'type'), res('wsc-1', 'blanks')], now: at, newId: ids });
  const account = { ...phone, log: phone.log.map((e) => ({ ...e })) };
  assert.equal(mergeProgress(phone, account).log.length, 2);
});

test('older answers without an id still merge the old way, once each', () => {
  const old = (at: string): LogEntry => ({ at, itemId: 'fv-1', kind: 'type', correct: true, hints: 0, ms: 1, review: false });
  const a = { ...emptyProgress(), log: [old('2026-11-20T10:00:00Z')] };
  const b = { ...emptyProgress(), log: [old('2026-11-20T10:00:00Z'), old('2026-11-21T10:00:00Z')] };
  assert.equal(mergeProgress(a, b).log.length, 2);
});

test('answer rows carry the whole answer, and only answers with an id are sent', () => {
  const p = finishSession(emptyProgress(), { results: [res('wsc-1', 'say', { part: 'wsc-1#1', misses: 1, hints: 1 })], now: at, newId: ids });
  const legacy: LogEntry = { at: '2026-11-19T10:00:00Z', itemId: 'wsc-1', kind: 'type', correct: true, hints: 0, ms: 5, review: false };
  const rows = toAnswerRows('hh', 'mm', [legacy, ...p.log]);
  assert.equal(rows.length, 1);
  assert.deepEqual({ ...rows[0], id: 'x' }, { id: 'x', household_id: 'hh', member_id: 'mm', item_id: 'wsc-1', kind: 'say', correct: true, misses: 1, hints: 1, ms: 900, review: false, part: 'wsc-1#1', session_at: at.toISOString(), local_day: '2026-11-24' });
});

test('only answers newer than the last one sent go up, oldest first', () => {
  const mk = (t: string): LogEntry => ({ id: t, at: t, itemId: 'a', kind: 'type', correct: true, hints: 0, ms: 1, review: false });
  const log = [mk('2026-11-22T10:00:00Z'), mk('2026-11-20T10:00:00Z'), mk('2026-11-21T10:00:00Z')];
  assert.deepEqual(unsent(log, '2026-11-20T10:00:00Z').map((e) => e.id), ['2026-11-21T10:00:00Z', '2026-11-22T10:00:00Z']);
  assert.equal(unsent(log, '').length, 3);
});
