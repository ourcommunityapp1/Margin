import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rating, State } from 'ts-fsrs';
import { daysUntil, foldTrimmed, mergeSnapshot, gradeRecall, itemChance, markOf, overlap, partChance, partMemories, predictedChance, recallChance, speedBaseline, spreadApart, stepSeconds, weakParts, whyNow, recalledRecently } from '../memory.ts';
import { recallChance as plannerChance } from '../planner.ts';
import { buildReview, seeded, unitsFor } from '../lesson.ts';
import { allItems, getItem } from '../content/index.ts';
import type { LogEntry, MemberProgress, SavedCard, StepResult } from '../progress.ts';

const now = new Date('2026-11-24T12:00:00Z');
const card = (o: Partial<SavedCard> = {}): SavedCard => ({ due: '2026-11-30T12:00:00.000Z', last_review: '2026-11-14T12:00:00.000Z', stability: 10, difficulty: 5, scheduled_days: 16, reps: 3, lapses: 0, learning_steps: 0, state: State.Review, ...o });
const r = (kind: StepResult['kind'], o: Partial<StepResult> = {}): StepResult => ({ itemId: 'wsc-1', kind, correct: true, hints: 0, ms: 6000, review: true, words: 12, ...o });

test('one forgetting curve: 90% at the stability, lower after, the same curve the planner uses', () => {
  assert.ok(Math.abs(recallChance(card(), now) - 0.9) < 1e-9);
  assert.ok(recallChance(card({ last_review: '2026-10-01T12:00:00.000Z' }), now) < 0.9);
  assert.equal(plannerChance, recallChance);
  assert.equal(predictedChance(card({ state: State.New }), now), null);
  assert.ok(Math.abs(daysUntil(card({ last_review: now.toISOString() }), 0.9, now) - 10) < 1e-6);
});

test('grading: whole and unaided is Solid, a slip or a cue is Shaky, more is Forgot', () => {
  assert.equal(markOf(r('type')), 'good');
  assert.equal(markOf(r('type', { correct: false, misses: 1 })), 'hard', 'one slip in twelve words');
  assert.equal(markOf(r('type', { correct: false, misses: 4 })), 'again');
  assert.equal(markOf(r('type', { hints: 1 })), 'hard');
  assert.equal(markOf(r('letters')), 'hard', 'first letters is cued recall');
  assert.equal(markOf(r('say', { correct: false, misses: 1, words: 6 })), 'hard', 'a single misheard word');
  const c = { state: State.Review, reps: 3 };
  assert.equal(gradeRecall([r('type'), r('letters')], c), Rating.Hard, 'the worst recall sets it');
  assert.equal(gradeRecall([r('blanks')], c), null, 'recognition is not recall');
  assert.equal(gradeRecall([r('type')], c), Rating.Good, 'no pace known yet: Solid, not Effortless');
});

test('Effortless needs a seasoned item and a faster pace than your own usual', () => {
  const log: LogEntry[] = Array.from({ length: 24 }, (_, i) => ({ at: `2026-11-${String(1 + (i % 20)).padStart(2, '0')}T10:00:00Z`, itemId: 'x', kind: 'type', correct: true, hints: 0, ms: 12000, words: 12, review: true }));
  const speed = speedBaseline(log);
  assert.equal(speed.type.msPerWord, 1000);
  assert.equal(gradeRecall([r('type', { ms: 6000 })], { state: State.Review, reps: 3 }, speed), Rating.Easy);
  assert.equal(gradeRecall([r('type', { ms: 18000 })], { state: State.Review, reps: 3 }, speed), Rating.Good, 'slower than usual');
  assert.equal(gradeRecall([r('type', { ms: 6000 })], { state: State.Review, reps: 1 }, speed), Rating.Good, 'not reviewed enough yet');
  assert.equal(stepSeconds(log), 12);
  assert.equal(stepSeconds([]), 25);
});

test('weak parts are the ones whose last recall went wrong, and reviews ask them first', () => {
  const e = (part: string, at: string, correct: boolean): LogEntry => ({ at, itemId: part.split('#')[0], part, kind: 'type', correct, hints: 0, ms: 1, review: true });
  const log = [e('wsc-12#1', '2026-11-01T10:00:00Z', false), e('wsc-12#1', '2026-11-02T10:00:00Z', true), e('wsc-12#2', '2026-11-02T10:00:00Z', false)];
  assert.deepEqual([...weakParts(log)], ['wsc-12#2']);
  const item = getItem('wsc-12')!;
  assert.ok(unitsFor(item, 'adult').length >= 2, 'a multi-part answer');
  const steps = buildReview({ due: [{ item, strength: 10, weak: ['wsc-12#2'], chance: 0.9 }], track: 'adult', pool: allItems(), rng: seeded(3) });
  assert.ok(steps.every((s) => !('part' in s) || !s.part || s.part === 'wsc-12#2'), 'only the weak part is asked');
  assert.ok(['type', 'say'].includes(steps[0].kind), 'likely recall: asked whole, no help');
  const shaky = buildReview({ due: [{ item, strength: 10, chance: 0.5 }], track: 'adult', pool: allItems(), rng: seeded(3) });
  assert.ok(['blanks', 'match'].includes(shaky[0].kind), 'shaky: starts with the most help');
  assert.ok(shaky.some((s) => s.kind === 'letters'), 'then first letters');
  assert.equal(steps.length, 1, 'a strong item is asked once, whole');
});

test('part memories: replayed from the answers, the same whatever order they arrive in', () => {
  const e = (part: string, at: string, correct: boolean, id: string): LogEntry => ({ id, at, day: at.slice(0, 10), itemId: part.split('#')[0], part, kind: 'type', correct, hints: 0, ms: 1, review: true, words: 10 });
  const log = [e('wsc-12#1', '2026-11-01T10:00:00Z', true, 'a'), e('wsc-12#2', '2026-11-01T10:00:00Z', false, 'b'), e('wsc-12#1', '2026-11-05T10:00:00Z', true, 'c'), e('wsc-12#2', '2026-11-05T10:00:00Z', true, 'd'),
    e('wsc-12#1', '2026-11-05T18:00:00Z', false, 'e')];
  const m = partMemories(log);
  assert.deepEqual(partMemories([...log].reverse()), m);
  assert.ok(m['wsc-12#1'].s > m['wsc-12#2'].s, 'the line missed first is weaker');
  assert.equal(m['wsc-12#1'].reps, 2, 'a second session the same day does not move it');
  const at = new Date('2026-11-24T12:00:00Z');
  assert.equal(itemChance('wsc-12', m, at), Math.min(partChance(m['wsc-12#1'], at), partChance(m['wsc-12#2'], at)));
  // Trimming: folding the oldest answers into a snapshot gives the same memories as keeping them all.
  const snap = foldTrimmed(log.slice(0, 2));
  assert.deepEqual(partMemories(log.slice(2), snap), m);
});

test('look-alikes are kept apart in a review', () => {
  const t = { a: 'the lord is my shepherd i shall not want', b: 'the lord is my shepherd he leadeth me', c: 'what is the chief end of man' };
  assert.ok(overlap(t.a, t.b) >= 0.5);
  assert.deepEqual(spreadApart(['a', 'b', 'c'] as const, (k) => t[k]), ['a', 'c', 'b']);
});

test('no strength number on the day something was last practiced; recently recalled items are known', () => {
  const at = new Date('2026-11-24T17:40:00Z');
  const missed: LogEntry = { at: '2026-11-24T13:56:00Z', itemId: 'wsc-10', part: 'wsc-10#1', kind: 'type', correct: false, misses: 6, hints: 0, ms: 1, review: true };
  assert.equal(whyNow('wsc-10', [missed], 0.92, at), '6 words off last time');
  assert.equal(whyNow('wsc-10', [{ ...missed, at: '2026-11-20T13:56:00Z' }], 0.8, at), '6 words off last time · strength 80%');
  assert.deepEqual([...recalledRecently([missed], at)], ['wsc-10']);
  assert.equal(recalledRecently([missed], new Date('2026-11-25T12:00:00Z')).size, 0);
});

test('an item comes back when its weakest line is due, not only when the whole item is', async () => {
  const { finishSession, emptyProgress } = await import('../progress.ts');
  const item = getItem('wsc-12')!;
  const keys = unitsFor(item, 'adult').map((u) => u.key);
  const t0 = new Date('2026-11-01T10:00:00Z');
  const day = (n: number) => new Date(t0.getTime() + n * 86_400_000);
  const rec = (part: string, correct: boolean, hints = 0): StepResult => ({ itemId: 'wsc-12', kind: 'type', part, correct, hints, ms: 5000, review: true, words: 12, ...(correct ? {} : { misses: 8 }) });
  let p: MemberProgress = { ...emptyProgress(), units: keys, cards: { 'wsc-12': card({ state: State.Review, due: day(60).toISOString(), last_review: t0.toISOString(), stability: 40, scheduled_days: 60, reps: 3 }) } };
  // Both lines right on day 1, day 9 and day 21: the item is far off.
  for (const n of [1, 9, 21]) p = finishSession(p, { results: keys.map((k) => rec(k, true)), now: day(n), grading: 'v2', newId: () => `i${n}${Math.random()}` });
  const farDue = Date.parse(p.cards['wsc-12'].due);
  // Line 2 missed on day 22: the item's own schedule is long, but its weakest line is not.
  p = finishSession(p, { results: [rec(keys[0], true), rec(keys[1], false)], now: day(22), grading: 'v2' });
  const due = Date.parse(p.cards['wsc-12'].due);
  assert.ok(due < farDue, 'sooner than before');
  assert.ok(due >= day(22).getTime() + 12 * 3_600_000, 'but not within 12 hours of this session');
  assert.ok(due < day(22).getTime() + 8 * 86_400_000, 'within about a week');
});

test('in memory from the model: a strong item stays well past the old window; a weak line brings it out sooner; unfitted items use the windows', async () => {
  const { heldItems } = await import('../keep.ts');
  const { emptyProgress } = await import('../progress.ts');
  const item = getItem('wsc-12')!;
  const keys = unitsFor(item, 'adult').map((u) => u.key);
  const e = (part: string, at: string, correct: boolean): LogEntry => ({ id: part + at, at, day: at.slice(0, 10), itemId: 'wsc-12', part, kind: 'type', correct, hints: 0, ms: 1, review: true, words: 10, ...(correct ? {} : { misses: 8 }) });
  const days = ['2026-09-01', '2026-09-03', '2026-09-10', '2026-09-24', '2026-10-20'];
  const strong = keys.flatMap((k) => days.map((d) => e(k, `${d}T10:00:00Z`, true)));
  const base = { ...emptyProgress(), levels: { 'wsc-12': 2 }, keep: { 'wsc-12': { good: '2026-10-20T10:00:00Z', full: '2026-10-20T10:00:00Z' } } };
  const o: { launch: Date; tz: string; model?: boolean } = { launch: new Date('2026-06-01T00:00:00Z'), tz: 'UTC' };
  const state = (p: typeof base & { log: LogEntry[] }, at: string, opts = o) => heldItems([item], p, 'adult', new Date(at), opts)[0].state.state;
  // Recalled right five times over seven weeks: well past the old 90-day window it is still kept, and the model keeps it.
  assert.equal(state({ ...base, log: strong }, '2027-03-01T00:00:00Z'), 'kept');
  assert.equal(state({ ...base, log: strong }, '2027-03-01T00:00:00Z', { ...o, model: false }), 'out', 'the fixed window would have dropped it');
  // One line only ever recalled once, long ago: it is the weak line, and the item leaves sooner.
  const weak = [...keys.slice(0, 1).flatMap((k) => days.map((d) => e(k, `${d}T10:00:00Z`, true))), ...keys.slice(1).map((k) => e(k, '2026-09-01T10:00:00Z', true))];
  assert.equal(state({ ...base, log: weak }, '2026-12-15T00:00:00Z'), 'out');
  // No line memories yet (older progress): the fixed windows, as before.
  assert.equal(state({ ...base, log: [] }, '2027-03-01T00:00:00Z'), 'out');
  assert.equal(state({ ...base, log: [] }, '2026-12-15T00:00:00Z'), 'kept');
  // A guard rail while the model is uncalibrated: even a very strong item leaves within twice its stone's old window.
  assert.equal(state({ ...base, log: strong }, '2027-06-01T00:00:00Z'), 'out');
});

test('"strong until about": the weakest line at 80%, never past one stone-window; nothing until every line has a memory', async () => {
  const { strongUntilFor } = await import('../keep.ts');
  const { emptyProgress } = await import('../progress.ts');
  const item = getItem('wsc-12')!;
  const keys = unitsFor(item, 'adult').map((u) => u.key);
  const e = (part: string, at: string): LogEntry => ({ id: part + at, at, day: at.slice(0, 10), itemId: 'wsc-12', part, kind: 'type', correct: true, hints: 0, ms: 1, review: true, words: 10 });
  const p: MemberProgress = { ...emptyProgress(), levels: { 'wsc-12': 2 }, log: keys.flatMap((k) => ['2026-09-01', '2026-09-03', '2026-09-10', '2026-09-24', '2026-10-20'].map((d) => e(k, `${d}T10:00:00Z`))) };
  const d = strongUntilFor(item, p, 'adult')!;
  assert.equal(d.toISOString().slice(0, 10), '2027-01-18', 'capped at 90 days after the last recall');
  assert.equal(strongUntilFor(item, { ...p, log: p.log.filter((x) => x.part === keys[0]) }, 'adult'), null, 'a line with no memory yet');
});

test('two phones that trimmed at different times: each line keeps its most recent memory, and nothing is double counted', () => {
  const e = (part: string, at: string, id: string): LogEntry => ({ id, at, day: at.slice(0, 10), itemId: 'wsc-12', part, kind: 'type', correct: true, hints: 0, ms: 1, review: true, words: 10 });
  const all = [e('wsc-12#1', '2026-11-01T10:00:00Z', 'a'), e('wsc-12#2', '2026-11-02T10:00:00Z', 'b'), e('wsc-12#1', '2026-11-10T10:00:00Z', 'c'), e('wsc-12#2', '2026-11-12T10:00:00Z', 'd'), e('wsc-12#1', '2026-11-20T10:00:00Z', 'f')];
  const full = partMemories(all);
  // Phone A trimmed the first two answers; phone B trimmed the first three. Each holds the rest.
  const snapA = foldTrimmed(all.slice(0, 2)), snapB = foldTrimmed(all.slice(0, 3));
  const merged = mergeSnapshot(snapA, snapB)!;
  assert.deepEqual(partMemories(all.slice(3), merged), full, 'the union of what they hold gives the same memories');
  assert.deepEqual(partMemories(all, merged), full, 'and replaying answers a snapshot already holds changes nothing');
});
