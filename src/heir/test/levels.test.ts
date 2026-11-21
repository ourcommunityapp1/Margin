import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awardsMet, bestDaysKept, countsFor, daysKept, levelFromLog, needsRefresh, nextStep, settle } from '../levels.ts';
import { emptyProgress, type LogEntry, type MemberProgress } from '../progress.ts';
import { allItems, getItem } from '../content/index.ts';

const wsc1 = getItem('wsc-1')!;
const at = (iso: string) => new Date(iso);
const e = (when: string, kind: LogEntry['kind'], correct = true, itemId = 'wsc-1'): LogEntry => ({ at: `${when}T15:00:00.000Z`, itemId, kind, correct, hints: 0, ms: 1000, review: false });
const withLog = (log: LogEntry[], extra: Partial<MemberProgress> = {}): MemberProgress => ({ ...emptyProgress(), log, ...extra });

test('Amethyst: typed in full, then recalled after a night’s sleep', () => {
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'blanks'), e('2026-11-02', 'say')], at('2026-11-02T20:00:00Z')), 0);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type', false)], at('2026-11-02T20:00:00Z')), 0);
  // Typed perfectly while learning is not yet knowing it.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type')], at('2026-11-02T20:00:00Z')), 0);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), { ...e('2026-11-02', 'say'), at: '2026-11-02T21:00:00.000Z' }], at('2026-11-02T22:00:00Z')), 0);
  // Recalled the next day: known.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), e('2026-11-03', 'say')], at('2026-11-03T20:00:00Z')), 1);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), e('2026-11-03', 'say', false)], at('2026-11-03T20:00:00Z')), 0);
});

test('Topaz: said or typed right on three different days, not three times in one day', () => {
  const sameDay = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), { ...e('2026-11-03', 'say'), at: '2026-11-03T16:00:00.000Z' }, { ...e('2026-11-03', 'say'), at: '2026-11-03T17:00:00.000Z' }];
  assert.equal(levelFromLog(wsc1, 'adult', sameDay, at('2026-11-03T20:00:00Z')), 1);
  const three = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), e('2026-11-05', 'type')];
  assert.equal(levelFromLog(wsc1, 'adult', three, at('2026-11-05T20:00:00Z')), 2);
});

test('Carnelian: right after a two-week gap, and matched answer to question', () => {
  const base = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), e('2026-11-05', 'type')];
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2026-11-12', 'say'), e('2026-11-12', 'match')], at('2026-11-12T20:00:00Z')), 2, 'gap too short');
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2026-11-20', 'say')], at('2026-11-20T20:00:00Z')), 2, 'not both ways');
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2026-11-20', 'say'), e('2026-11-20', 'match')], at('2026-11-20T20:00:00Z')), 3);
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
  assert.equal(nextStep(getItem('wsc-4')!, 'adult', p, at('2026-11-20T12:00:00Z')), 'Recall it after a night’s sleep to earn Amethyst');
  const one = { ...withLog([e('2026-11-19', 'type')]), levels: { 'wsc-1': 1 } };
  assert.equal(nextStep(wsc1, 'adult', one, at('2026-11-20T12:00:00Z')), '2 more days to Topaz');
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
