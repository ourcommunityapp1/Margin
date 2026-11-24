// Fitting the model to real answers (ADR-001 Decision 7). The model says "92% likely"; did 92% of those come back right?
// A calibration is two numbers (a, b) that correct its chance: corrected = sigmoid(a * logit(chance) + b). It is fitted by
// logistic regression with a pull toward "no correction" (a = 1, b = 0), so with little data it barely moves, and it is
// adopted only if it predicts the newest answers better than the model as it is. Pure, so it is tested without a database.

import { markOf, type Cal } from './memory.ts';
import type { StepResult } from './progress.ts';

export interface Point { p: number; y: 0 | 1; at: string }

const clamp = (p: number) => Math.min(0.999, Math.max(0.001, p));
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Average log loss (lower is better) of a calibration on some points. */
export function logLoss(points: Point[], c: Cal = { a: 1, b: 0 }): number {
  if (!points.length) return 0;
  return -points.reduce((n, pt) => { const q = clamp(sigmoid(c.a * logit(clamp(pt.p)) + c.b)); return n + (pt.y ? Math.log(q) : Math.log(1 - q)); }, 0) / points.length;
}

/** Newton's method for the two numbers, with a ridge pulling toward (1, 0) worth `lambda` answers. */
export function fitPlatt(points: Point[], lambda = 20): Cal {
  let a = 1, b = 0;
  for (let it = 0; it < 25; it++) {
    let ga = lambda * (a - 1), gb = lambda * b, haa = lambda, hab = 0, hbb = lambda;
    for (const pt of points) {
      const x = logit(clamp(pt.p)), q = sigmoid(a * x + b), w = q * (1 - q), r = q - pt.y;
      ga += r * x; gb += r; haa += w * x * x; hab += w * x; hbb += w;
    }
    const det = haa * hbb - hab * hab;
    if (Math.abs(det) < 1e-12) break;
    const da = (hbb * ga - hab * gb) / det, db = (haa * gb - hab * ga) / det;
    a -= da; b -= db;
    if (Math.abs(da) + Math.abs(db) < 1e-7) break;
  }
  return { a: Math.min(3, Math.max(0.3, a)), b: Math.min(2, Math.max(-2, b)) };
}

export interface Fit { cal: Cal; n: number; lossBefore: number; lossAfter: number }

/** Fit on the older 80% of answers, check on the newest 20%, and keep the fit only if it helps there by at least `margin`. */
export function fitAndCheck(points: Point[], minN = 300, margin = 0.002): Fit | null {
  if (points.length < minN) return null;
  const sorted = [...points].sort((x, y) => x.at.localeCompare(y.at));
  const cut = Math.floor(sorted.length * 0.8);
  const train = sorted.slice(0, cut), test = sorted.slice(cut);
  const cal = fitPlatt(train);
  const lossBefore = logLoss(test), lossAfter = logLoss(test, cal);
  if (lossBefore - lossAfter < margin) return null;
  // The adopted calibration is refitted on everything, so it also learns from the newest answers.
  return { cal: fitPlatt(sorted), n: sorted.length, lossBefore, lossAfter };
}

export interface AnswerForFit { kind: string; correct: boolean; hints: number; misses: number | null; words: number | null; p_recall: number | null; session_at: string }

/** The answers the fit learns from: full recalls (typed or said) with the model's chance given before them. A recall
 *  "worked" if it was right, or within a couple of slips (the same rule the grading uses). */
export function pointsFrom(rows: AnswerForFit[]): Point[] {
  return rows.filter((r) => (r.kind === 'type' || r.kind === 'say') && typeof r.p_recall === 'number')
    .map((r) => ({ p: r.p_recall!, at: r.session_at, y: (markOf({ itemId: '', kind: r.kind as StepResult['kind'], correct: r.correct, hints: r.hints, ms: 0, review: true, ...(r.misses !== null ? { misses: r.misses } : {}), ...(r.words !== null ? { words: r.words } : {}) }) !== 'again' ? 1 : 0) as 0 | 1 }));
}
