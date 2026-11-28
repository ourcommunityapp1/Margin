import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitAndCheck, fitPlatt, logLoss, pointsFrom, type Point } from '../calibrate.ts';
import { calibrate, rawFor, setPopulationCal, setPersonCal, recallChance, predictedChance, daysToChance } from '../memory.ts';
import type { SavedCard } from '../progress.ts';

// A deterministic stream of predictions whose true success rate is `truth(p)`.
function sample(n: number, truth: (p: number) => number): Point[] {
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  return Array.from({ length: n }, (_, i) => { const p = 0.5 + 0.49 * rnd(); return { p, y: (rnd() < truth(p) ? 1 : 0) as 0 | 1, at: `2026-11-${String(1 + Math.floor((i * 28) / n)).padStart(2, '0')}T10:00:${String(i % 60).padStart(2, '0')}Z` }; });
}

test('a well-calibrated model is left alone', () => {
  const pts = sample(800, (p) => p);
  assert.equal(fitAndCheck(pts), null, 'no gain, so nothing adopted');
  const c = fitPlatt(pts);
  assert.ok(Math.abs(c.a - 1) < 0.3 && Math.abs(c.b) < 0.4);
});

test('an over-confident model is pulled down, and the fit helps on answers it has not seen', () => {
  const pts = sample(1000, (p) => Math.max(0.05, p - 0.18));
  const fit = fitAndCheck(pts)!;
  assert.ok(fit, 'adopted');
  assert.ok(fit.lossAfter < fit.lossBefore);
  assert.ok(calibrate(0.9, fit.cal) < 0.85, 'a 90% prediction now reads lower');
  assert.ok(logLoss(pts, fit.cal) < logLoss(pts));
});

test('too little data: nothing fitted; a little data moves the fit only a little', () => {
  assert.equal(fitAndCheck(sample(100, (p) => p - 0.2)), null);
  const c = fitPlatt(sample(30, (p) => p - 0.3));
  assert.ok(c.a > 0.6 && c.b > -1, 'held near no correction');
});

test('calibrated thresholds stay in calibrated terms; the stored prediction stays raw', () => {
  setPopulationCal({ a: 1, b: -0.8 });
  const card: SavedCard = { due: '2026-12-04T12:00:00.000Z', last_review: '2026-11-24T12:00:00.000Z', stability: 10, difficulty: 5, scheduled_days: 10, reps: 3, lapses: 0, learning_steps: 0, state: 2 };
  const at = new Date('2026-11-24T12:00:00Z');
  const later = new Date('2026-12-04T12:00:00Z');
  assert.equal(predictedChance(card, later), 0.9, 'raw');
  assert.ok(recallChance(card, later) < 0.9, 'calibrated is lower');
  assert.ok(Math.abs(calibrate(rawFor(0.7)) - 0.7) < 1e-9);
  assert.ok(daysToChance(10, 0.7) < 10 * 9.3, 'a lower-confidence world crosses 70% sooner');
  setPersonCal({ a: 1, b: 0.8 });
  assert.ok(recallChance(card, later) > 0.9, 'a person’s own fit ranks their reviews');
  setPersonCal(null); setPopulationCal(null);
  assert.ok(Math.abs(recallChance(card, at) - 1) < 1e-9);
});

test('which answers the fit learns from', () => {
  const rows = [
    { kind: 'type', correct: true, hints: 0, misses: 0, words: 12, p_recall: 0.9, session_at: '2026-11-01T10:00:00Z' },
    { kind: 'type', correct: false, hints: 0, misses: 1, words: 12, p_recall: 0.8, session_at: '2026-11-02T10:00:00Z' },
    { kind: 'type', correct: false, hints: 0, misses: 8, words: 12, p_recall: 0.8, session_at: '2026-11-03T10:00:00Z' },
    { kind: 'letters', correct: true, hints: 0, misses: 0, words: 12, p_recall: 0.8, session_at: '2026-11-04T10:00:00Z' },
    { kind: 'type', correct: true, hints: 0, misses: 0, words: 12, p_recall: null, session_at: '2026-11-05T10:00:00Z' },
  ];
  assert.deepEqual(pointsFrom(rows).map((p) => p.y), [1, 1, 0], 'full recalls with a prediction; a slip within the allowance still counts');
});
