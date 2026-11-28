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

test('Recalled: recited, then recalled unaided after a night’s sleep (level 2; Familiar is learned, level 1)', () => {
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'blanks'), e('2026-11-02', 'say')], at('2026-11-02T20:00:00Z')), 0);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type', false)], at('2026-11-02T20:00:00Z')), 0);
  // Typed perfectly while learning is not yet knowing it.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type')], at('2026-11-02T20:00:00Z')), 0);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), { ...e('2026-11-02', 'say'), at: '2026-11-02T21:00:00.000Z' }], at('2026-11-02T22:00:00Z')), 0);
  // Recalled the next day: remembered.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), e('2026-11-03', 'say')], at('2026-11-03T20:00:00Z')), 2);
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), e('2026-11-03', 'say', false)], at('2026-11-03T20:00:00Z')), 0);
  // With a hint the next day, it doesn't count.
  assert.equal(levelFromLog(wsc1, 'adult', [e('2026-11-02', 'type'), { ...e('2026-11-03', 'say'), hints: 2 }], at('2026-11-03T20:00:00Z')), 0);
});

test('Memorized: unaided on three different days, not three times in one day', () => {
  const sameDay = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), { ...e('2026-11-03', 'say'), at: '2026-11-03T16:00:00.000Z' }, { ...e('2026-11-03', 'say'), at: '2026-11-03T17:00:00.000Z' }];
  assert.equal(levelFromLog(wsc1, 'adult', sameDay, at('2026-11-03T20:00:00Z')), 2);
  const three = [e('2026-11-02', 'type'), e('2026-11-03', 'say'), e('2026-11-05', 'type')];
  assert.equal(levelFromLog(wsc1, 'adult', three, at('2026-11-05T20:00:00Z')), 3);
});

const base = [e('2025-01-02', 'type'), e('2025-01-03', 'say'), e('2025-01-05', 'type')];

test('Proficient: typed or said in full after three weeks away (whole answers only)', () => {
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-19', 'say')], at('2025-01-19T20:00:00Z')), 3, 'two weeks is not enough');
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-26', 'say')], at('2025-01-26T20:00:00Z')), 4);
  // Practising in between resets the gap: it measures time truly away.
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-15', 'blanks'), e('2025-01-26', 'say')], at('2025-01-26T20:00:00Z')), 3);
  // Light steps alone never make Proficient, however well they go.
  assert.equal(levelFromLog(wsc1, 'adult', [...base, e('2025-01-26', 'blanks'), e('2025-01-26', 'letters')], at('2025-01-26T20:00:00Z')), 3);
});

test('Expert: six months known, three whole answers in that time all right, one after two months away', () => {
  const lasting = [...base, e('2025-01-26', 'say')];
  const expert = [...lasting, e('2025-03-30', 'say'), e('2025-07-10', 'say')];
  assert.equal(levelFromLog(wsc1, 'adult', expert, at('2025-07-01T20:00:00Z')), 4, 'not six months yet');
  assert.equal(levelFromLog(wsc1, 'adult', expert, at('2025-07-10T20:00:00Z')), 5);
  assert.equal(levelFromLog(wsc1, 'adult', [...expert.slice(0, -1), e('2025-07-01', 'say', false), e('2025-07-10', 'say')], at('2025-07-10T20:00:00Z')), 4, 'a miss in the last six months');
  // Only two whole answers in the six months is not enough (it used to be two; it is three now).
  assert.equal(levelFromLog(wsc1, 'adult', [...lasting, e('2025-07-10', 'say')], at('2025-07-10T20:00:00Z')), 4);
  // Expert is the top: years later it is still Expert, not something higher.
  assert.equal(levelFromLog(wsc1, 'adult', [...expert, e('2028-02-10', 'say')], at('2028-02-10T20:00:00Z')), 5);
});

test('levels never go down, level-ups are reported once, awards are stamped once', () => {
  const p = withLog([e('2026-11-02', 'type'), e('2026-11-03', 'say')], { lessons: 2 });
  const first = settle(p, allItems(), 'adult', at('2026-11-03T20:00:00Z'));
  assert.deepEqual(first.ups, [{ itemId: 'wsc-1', from: 0, to: 2 }]);
  assert.ok(first.awards.includes('first-lesson') && first.awards.includes('first-amethyst'));
  const again = settle(first.progress, allItems(), 'adult', at('2026-11-04T20:00:00Z'));
  assert.deepEqual(again.ups, []);
  assert.deepEqual(again.awards, []);
  const lostLog = settle({ ...first.progress, log: [] }, allItems(), 'adult', at('2026-11-05T20:00:00Z'));
  assert.equal(lostLog.progress.levels['wsc-1'], 2);
});

test('counts and hints follow the levels', () => {
  const p = { ...emptyProgress(), levels: { 'wsc-1': 4, 'wsc-2': 3, 'wsc-3': 2 } };
  assert.deepEqual(countsFor(allItems(), p), { know: 3, memorized: 2, mastered: 1, longTerm: 0 });
  assert.equal(nextStep(getItem('wsc-4')!, 'adult', p, at('2026-11-20T12:00:00Z')), 'Finish its lesson to make it Familiar');
  const one = { ...withLog([e('2026-11-19', 'type')]), levels: { 'wsc-1': 2 } };
  assert.equal(nextStep(wsc1, 'adult', one, at('2026-11-20T12:00:00Z')), 'Memorized, once you recall it on 2 more days');
});

test('an overdue item needs a refresh', () => {
  const card = { due: '2026-11-10T12:00:00.000Z', stability: 3, difficulty: 5, scheduled_days: 3, reps: 1, lapses: 0, learning_steps: 0, state: 2 as const };
  const p = { ...emptyProgress(), cards: { 'wsc-1': card } };
  assert.ok(needsRefresh(p, 'wsc-1', at('2026-11-20T12:00:00Z')));
  assert.ok(!needsRefresh(p, 'wsc-1', at('2026-11-10T13:00:00Z')));
});

test('days kept: Sunday is a rest day, and each week has one more free day; neither breaks the run, both count when used', () => {
  // 2026-11-22 is a Sunday.
  assert.equal(daysKept(['2026-11-20', '2026-11-21', '2026-11-23'], '2026-11-23'), 3);
  assert.equal(daysKept(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'], '2026-11-23'), 4);
  assert.equal(daysKept(['2026-11-19', '2026-11-21'], '2026-11-21'), 2, 'one missed Friday in a week is the free day');
  assert.equal(daysKept(['2026-11-18', '2026-11-21'], '2026-11-21'), 1, 'a second missed day in the same week breaks it');
  assert.equal(daysKept(['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-21'], '2026-11-21'), 3, 'Thursday is the free day; the second missed day (Tuesday) ends the run');
  assert.equal(daysKept(['2026-11-12', '2026-11-14', '2026-11-16', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'], '2026-11-21'), 7, 'a free day in each of two weeks, plus the Sunday between, all forgiven');
  assert.equal(daysKept(['2026-11-21'], '2026-11-22'), 1, 'today not done yet does not break it');
  assert.equal(bestDaysKept(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10']), 3);
});

test('awards: memorizing a whole collection', () => {
  const all = allItems();
  const levels = Object.fromEntries(all.filter((i) => i.collection === 'apostles-creed').map((i) => [i.id, 3]));
  const met = awardsMet({ ...emptyProgress(), levels }, all, '2026-11-20');
  assert.ok(met.includes('apostles-memorized'));
  assert.ok(!met.includes('nicene-memorized'));
});
