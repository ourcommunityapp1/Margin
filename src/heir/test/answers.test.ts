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

import { keepFromLog, updateKeep, parseProgress } from '../progress.ts';

test('the keep record holds when each question was last recalled right, and last not, apart from the trimmed log', () => {
  const p1 = finishSession(emptyProgress(), { results: [res('wsc-1', 'type'), res('wsc-2', 'say', { correct: false })], now: new Date('2026-11-20T10:00:00Z'), newId: ids });
  assert.equal(p1.keep?.['wsc-1']?.good, '2026-11-20T10:00:00.000Z');
  assert.equal(p1.keep?.['wsc-2']?.miss, '2026-11-20T10:00:00.000Z');
  const p2 = finishSession(p1, { results: [res('wsc-2', 'type'), res('wsc-1', 'type', { hints: 1 })], now: new Date('2026-11-25T10:00:00Z'), newId: ids });
  assert.equal(p2.keep?.['wsc-2']?.good, '2026-11-25T10:00:00.000Z');
  assert.equal(p2.keep?.['wsc-2']?.miss, '2026-11-20T10:00:00.000Z');
  assert.equal(p2.keep?.['wsc-1']?.good, '2026-11-20T10:00:00.000Z', 'a hint is not a right recall');
  assert.equal(p2.keep?.['wsc-1']?.miss, '2026-11-25T10:00:00.000Z');
});

test('quick checks (blanks, spot, match, order) never count as recall for keeping', () => {
  const k = updateKeep(undefined, [res('a', 'blanks'), res('a', 'letters'), res('a', 'spot'), res('a', 'match'), res('a', 'order')], '2026-11-20T10:00:00.000Z');
  assert.deepEqual(k, {});
});

test('progress saved before the keep record existed gets it from its log, once', () => {
  const old = (at: string, correct = true): LogEntry => ({ at, itemId: 'fv-1', kind: 'type', correct, hints: 0, ms: 1, review: false });
  assert.deepEqual(keepFromLog([old('2026-11-01T10:00:00Z'), old('2026-11-10T10:00:00Z', false), old('2026-11-05T10:00:00Z')]), { 'fv-1': { good: '2026-11-05T10:00:00Z', miss: '2026-11-10T10:00:00Z' } });
  const seeded = finishSession({ ...emptyProgress(), log: [old('2026-11-01T10:00:00Z')] }, { results: [res('fv-2', 'type')], now: at, newId: ids });
  assert.equal(seeded.keep?.['fv-1']?.good, '2026-11-01T10:00:00Z');
});

test('merging takes the latest right and latest missed recall from either copy, and survives saving and loading', () => {
  const a = { ...emptyProgress(), keep: { x: { good: '2026-11-01T00:00:00Z', miss: '2026-11-09T00:00:00Z' } } };
  const b = { ...emptyProgress(), keep: { x: { good: '2026-11-05T00:00:00Z' }, y: { good: '2026-11-02T00:00:00Z' } } };
  const m = mergeProgress(a, b);
  assert.deepEqual(m.keep, { x: { good: '2026-11-05T00:00:00Z', miss: '2026-11-09T00:00:00Z' }, y: { good: '2026-11-02T00:00:00Z' } });
  assert.deepEqual(mergeProgress(b, a).keep, m.keep);
  assert.deepEqual(parseProgress(JSON.stringify({ m1: m })).m1.keep, m.keep);
});
