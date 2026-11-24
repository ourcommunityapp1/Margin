import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rating, State } from 'ts-fsrs';
import { daysUntil, foldTrimmed, gradeRecall, itemChance, markOf, overlap, partChance, partMemories, predictedChance, recallChance, speedBaseline, spreadApart, stepSeconds, weakParts } from '../memory.ts';
import { recallChance as plannerChance } from '../planner.ts';
import { buildReview, seeded, unitsFor } from '../lesson.ts';
import { allItems, getItem } from '../content/index.ts';
import type { LogEntry, SavedCard, StepResult } from '../progress.ts';

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
