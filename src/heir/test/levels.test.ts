import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awardsMet, bestDaysKept, countsFor, daysKept, levelFromLog, needsRefresh, nextStep, recited, settle } from '../levels.ts';
import { emptyProgress, type LogEntry, type MemberProgress } from '../progress.ts';
import { allItems, getItem } from '../content/index.ts';

const wsc1 = getItem('wsc-1')!;
const at = (iso: string) => new Date(iso);
const e = (when: string, kind: LogEntry['kind'], correct = true, itemId = 'wsc-1'): LogEntry => ({ at: `${when}T15:00:00.000Z`, itemId, kind, correct, hints: 0, ms: 1000, review: false });
const withLog = (log: LogEntry[], extra: Partial<MemberProgress> = {}): MemberProgress => ({ ...emptyProgress(), log, ...extra });

test('Recited: every part typed in full and right, with no hints', () => {
  assert.ok(recited(wsc1, 'adult', [e('2026-11-02', 'type')]));
  assert.ok(!recited(wsc1, 'adult', [{ ...e('2026-11-02', 'type'), hints: 1 }]), 'a hint means it was not unaided');
  assert.ok(!recited(wsc1, 'adult', [e('2026-11-02', 'type', false)]));
});

test('Amethyst (Remembered): recited, then recalled unaided after a night’s sleep', () => {
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'blanks'), e('2026-11-02', 'say')], at('2026-11-02T20:00:00Z')), 0);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type', false)], at('2026-11-02T20:00:00Z')), 0);
  // Typed perfectly while learning is not yet knowing it.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type')], at('2026-11-02T20:00:00Z')), 0);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), { ...e('2026-11-02', 'say'), at: '2026-11-02T21:00:00.000Z' }], at('2026-11-02T22:00:00Z')), 0);
  // Recalled the next day: remembered.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), e('2026-11-03', 'say')], at('2026-11-03T20:00:00Z')), 1);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), e('2026-11-03', 'say', false)], at('2026-11-03T20:00:00Z')), 0);
  // With a hint the next day, it doesn't count.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), { ...e('2026-11-03', 'say'), hints: 2 }], at('2026-11-03T20:00:00Z')), 0);
});

test('Topaz (Memorized): unaided on three different days, not three times in one day', () => {
  const sameDay = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), { ...e('2026-11-03', 'say'), at: '2026-11-03T16:00:00.000Z' }, { ...e('2026-11-03', 'say'), at: '2026-11-03T17:00:00.000Z' }];
  assert.equal(levelFromLog(wsc1, 'adult', sameDay, at('2026-11-03T20:00:00Z')), 1);
  const three = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), e('2026-11-05', 'type')];
  assert.equal(levelFromLog(wsc1, 'adult', three, at('2026-11-05T20:00:00Z')), 2);
});

const base = [e('2025-01-02', 'type'), e('2025-01-03', 'say'), e('2025-01-05', 'type')];

test('Carnelian (Lasting): unaided after three weeks away', () => {
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-19', 'say')], at('2025-01-19T20:00:00Z')), 2, 'two weeks is not enough');
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-26', 'say')], at('2025-01-26T20:00:00Z')), 3);
  // Practising in between resets the gap: it measures time truly away.
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-15', 'blanks'), e('2025-01-26', 'say')], at('2025-01-26T20:00:00Z')), 2);
});

test('Emerald (Long-term): six months right, with a two-month gap; Sapphire a year on; Diamond three years on', () => {
  const lasting = [...base, e('2025-01-26', 'say')];
  const emerald = [...lasting, e('2025-03-30', 'say'), e('2025-07-10', 'say')];
  assert.equal(levelFromLog(wsc1, 'adult', emerald, at('2025-07-01T20:00:00Z')), 3, 'not six months yet');
  assert.equal(levelFromLog(wsc1, 'adult', emerald, at('2025-07-10T20:00:00Z')), 4);
  assert.equal(levelFromLog(wsc1, 'adult', [...emerald.slice(0, -1), e('2025-07-01', 'say', false), e('2025-07-10', 'say')], at('2025-07-10T20:00:00Z')), 3, 'a miss in the last six months');
  // Sapphire: known a year, and recalled after half a year away.
  const sapphire = [...emerald, e('2026-01-20', 'say')];
  assert.equal(levelFromLog(wsc1, 'adult', sapphire, at('2026-01-20T20:00:00Z')), 5);
  assert.equal(levelFromLog(wsc1, 'adult', [...emerald, e('2025-12-01', 'say')], at('2026-01-20T20:00:00Z')), 4, 'a gap under six months');
  // Diamond: known three years, and recalled after a whole year away.
  const diamond = [...sapphire, e('2026-11-01', 'say'), e('2028-02-10', 'say')];
  assert.equal(levelFromLog(wsc1, 'adult', diamond, at('2028-02-10T20:00:00Z')), 6);
  assert.equal(levelFromLog(wsc1, 'adult', diamond.slice(0, -1), at('2028-02-10T20:00:00Z')), 5);
});

test('levels never go down, level-ups are reported once, awards are stamped once', () => {
  const p = withLog([e('2026-11-02', 'type'), e('2026-11-03', 'say')], { lessons: 2 });
  const first = settle(p, allItems(), 'adult', at('2026-11-03T20:00:00Z'));
  assert.deepEqual(first.ups, [{ itemId: 'wsc-1', from: 0, to: 1 }]);
  assert.ok(first.awards.includes('first-lesson') && first.awards.includes('first-amethyst'));
  const again = settle(first.progress, allItems(), 'adult', at('2026-11-04T20:00:00Z'));
  assert.deepEqual(again.ups, []);
  assert.deepEqual(again.awards, []);
  const lostLog = settle({ ...first.progress, log: [] }, allItems(), 'adult', at('2026-11-05T20:00:00Z'));
  assert.equal(lostLog.progress.levels['wsc-1'], 1);
});

test('counts and hints follow the levels', () => {
  const p = { ...emptyProgress(), levels: { 'wsc-1': 3, 'wsc-2': 2, 'wsc-3': 1 } };
  assert.deepEqual(countsFor(allItems(), p), { know: 3, memorized: 2, mastered: 1, longTerm: 0 });
  assert.equal(nextStep(getItem('wsc-4')!, 'adult', p, at('2026-11-20T12:00:00Z')), 'Type it in full with no hints to recite it');
  const one = { ...withLog([e('2026-11-19', 'type')]), levels: { 'wsc-1': 1 } };
  assert.equal(nextStep(wsc1, 'adult', one, at('2026-11-20T12:00:00Z')), 'Recall it on 2 more days for Topaz');
});

test('an overdue item needs a refresh', () => {
  const card = { due: '2026-11-10T12:00:00.000Z', stability: 3, difficulty: 5, scheduled_days: 3, reps: 1, lapses: 0, learning_steps: 0, state: 2 as const };
  const p = { ...emptyProgress(), cards: { 'wsc-1': card } };
  assert.ok(needsRefresh(p, 'wsc-1', at('2026-11-20T12:00:00Z')));
  assert.ok(!needsRefresh(p, 'wsc-1', at('2026-11-10T13:00:00Z')));
});

test('days kept: Sunday is a rest day that never breaks the run, but still counts when used', () => {
  // 2026-11-22 is a Sunday.
  assert.equal(daysKept(['2026-11-20', '2026-11-21', '2026-11-23'], '2026-11-23'), 3);
  assert.equal(daysKept(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'], '2026-11-23'), 4);
  assert.equal(daysKept(['2026-11-19', '2026-11-21'], '2026-11-21'), 1, 'a missed Friday breaks it');
  assert.equal(daysKept(['2026-11-21'], '2026-11-22'), 1, 'today not done yet does not break it');
  assert.equal(bestDaysKept(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10']), 3);
});

test('awards: memorizing a whole collection', () => {
  const all = allItems();
  const levels = Object.fromEntries(all.filter((i) => i.collection === 'apostles-creed').map((i) => [i.id, 2]));
  const met = awardsMet({ ...emptyProgress(), levels }, all, '2026-11-20');
  assert.ok(met.includes('apostles-memorized'));
  assert.ok(!met.includes('nicene-memorized'));
});
