// Builds a lesson: the steps a learner works through, chosen by the app, never by the learner.
//
// A new lesson teaches one "unit": a whole short answer, or one part of a long one (at most four pieces).
//   see it → build each phrase from a word bank → what it means → put the phrases in order →
//   fill the blanks → first letters → say it
// Up to three earlier items that are due come back in between, so lessons mix old and new.
// A review session is only due items, each recalled twice in different ways, spread apart.

import type { Item, MeaningQuestion, Track } from './types.ts';
import { normalizeWord, words } from './words.ts';

export interface Unit {
  key: string;
  itemId: string;
  part: number;
  of: number;
  // Piece range in the item's chunks for the track: [start, end).
  start: number;
  end: number;
}

const MAX_PIECES = 4;

export function unitsFor(item: Item, track: Track): Unit[] {
  const n = item.chunks[track].length;
  const of = Math.max(1, Math.ceil(n / MAX_PIECES));
  const units: Unit[] = [];
  let start = 0;
  for (let p = 0; p < of; p++) {
    const size = Math.floor(n / of) + (p < n % of ? 1 : 0);
    units.push({ key: `${item.id}#${p + 1}`, itemId: item.id, part: p + 1, of, start, end: start + size });
    start += size;
  }
  return units;
}

export function nextUnit(items: Item[], track: Track, learned: Set<string>): Unit | null {
  for (const item of items) for (const u of unitsFor(item, track)) if (!learned.has(u.key)) return u;
  return null;
}

export function unitText(item: Item, track: Track, u: Unit): { text: string; lead: string } {
  const c = item.chunks[track];
  return { text: c.slice(u.start, u.end).join(' '), lead: c.slice(0, u.start).join(' ') };
}

export type StepKind = 'intro' | 'order' | 'meaning' | 'blanks' | 'letters' | 'say';

interface Base { id: string; itemId: string; review: boolean }
// Text steps carry `lead`: the words that come before this part of a long answer, shown as a cue.
export type Step =
  | (Base & { kind: 'intro'; unit: Unit })
  // `tiles` in the right order; `bank` is tiles plus decoys, shuffled, as shown.
  | (Base & { kind: 'order'; tiles: string[]; decoys: string[]; bank: string[]; pieces: boolean; lead: string })
  | (Base & { kind: 'meaning'; question: MeaningQuestion; options: string[] })
  | (Base & { kind: 'blanks'; text: string; blanks: number[]; lead: string })
  | (Base & { kind: 'letters'; text: string; lead: string })
  | (Base & { kind: 'say'; text: string; lead: string });

export type Rng = () => number;

// A small seeded generator, so a lesson can be rebuilt exactly in tests.
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Joins short pieces so each word-bank exercise has at least a few words to arrange.
export function phrases(chunks: string[], min = 4): string[] {
  const out: string[] = [];
  for (const c of chunks) {
    const last = out[out.length - 1];
    if (last !== undefined && words(last).length < min) out[out.length - 1] = `${last} ${c}`;
    else out.push(c);
  }
  if (out.length > 1 && words(out[out.length - 1]).length < min) {
    const tail = out.pop()!;
    out[out.length - 1] = `${out[out.length - 1]} ${tail}`;
  }
  return out;
}

// Plausible wrong words for a word bank: real words from other items, never one that is in the answer.
function decoys(pool: Item[], answer: string, count: number, rng: Rng): string[] {
  const avoid = new Set(words(answer));
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const item of pool) {
    for (const raw of item.text.split(' ')) {
      const w = raw.replace(/[.,;:!?]+$/, '');
      const n = normalizeWord(w);
      if (n.length < 3 || avoid.has(n) || seen.has(n)) continue;
      seen.add(n);
      candidates.push(w);
    }
  }
  return shuffle(candidates, rng).slice(0, count);
}

const COMMON = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'a', 'an', 'his', 'him', 'that', 'are', 'be', 'by', 'for', 'with', 'it', 'who', 'which', 'as', 'unto', 'all', 'we', 'i', 'he', 'our', 'us', 'on', 'from', 'was', 'were', 'what', 'do', 'doth', 'hath']);

// Which words to hide: the ones that carry meaning, spread out, at least one.
export function pickBlanks(text: string, share: number, max: number, rng: Rng): number[] {
  const tokens = text.split(' ');
  const strong = tokens.map((t, i) => [normalizeWord(t), i] as const).filter(([w]) => w.length >= 3 && !COMMON.has(w)).map(([, i]) => i);
  const any = tokens.map((t, i) => [normalizeWord(t), i] as const).filter(([w]) => w.length > 0).map(([, i]) => i);
  const from = strong.length ? strong : any;
  const want = Math.max(1, Math.min(max, Math.round(tokens.length * share)));
  const chosen: number[] = [];
  for (const i of shuffle(from, rng)) {
    if (chosen.length >= want) break;
    if (chosen.some((c) => Math.abs(c - i) < 2) && from.length > want * 2) continue;
    chosen.push(i);
  }
  return chosen.sort((a, b) => a - b);
}

// Shuffled so the bank never starts out already in order.
function bankFor(tiles: string[], decoyWords: string[], rng: Rng): string[] {
  const all = [...tiles, ...decoyWords];
  for (let tries = 0; tries < 5; tries++) {
    const b = shuffle(all, rng);
    if (b.slice(0, tiles.length).join(' ') !== tiles.join(' ')) return b;
  }
  return [...all.slice(1), all[0]];
}

interface Counter { n: number }
const nextId = (c: Counter, kind: StepKind, itemId: string) => `${kind}:${itemId}:${c.n++}`;

// One recall of an earlier item, harder as it grows stronger. Long answers review one part at a time.
function reviewStep(item: Item, track: Track, strength: number, rng: Rng, c: Counter, prefer?: 'say'): Step {
  const units = unitsFor(item, track);
  const u = units.length > 1 ? units[Math.floor(rng() * units.length)] : units[0];
  const { text, lead } = unitText(item, track, u);
  const base = { itemId: item.id, review: true, lead, text };
  if (prefer === 'say' || strength >= 10) return { ...base, id: nextId(c, 'say', item.id), kind: 'say' };
  if (strength >= 3) return { ...base, id: nextId(c, 'letters', item.id), kind: 'letters' };
  return { ...base, id: nextId(c, 'blanks', item.id), kind: 'blanks', blanks: pickBlanks(text, 0.4, 6, rng) };
}

export interface Due { item: Item; strength: number }

export function buildLesson(o: { unit: Unit; item: Item; track: Track; due: Due[]; pool: Item[]; rng: Rng }): Step[] {
  const { unit, item, track, rng } = o;
  const c: Counter = { n: 0 };
  const { text, lead } = unitText(item, track, unit);
  const pieces = item.chunks[track].slice(unit.start, unit.end);
  const id = item.id;

  const learn: Step[] = [{ id: nextId(c, 'intro', id), itemId: id, review: false, kind: 'intro', unit }];
  let soFar = lead;
  for (const p of phrases(pieces)) {
    const tiles = p.split(' ');
    if (tiles.length >= 2) {
      const extra = decoys(o.pool.filter((i) => i.id !== id), text, tiles.length > 4 ? 2 : 1, rng);
      learn.push({ id: nextId(c, 'order', id), itemId: id, review: false, kind: 'order', tiles, decoys: extra, bank: bankFor(tiles, extra, rng), pieces: false, lead: soFar });
    }
    soFar = soFar ? `${soFar} ${p}` : p;
  }
  const lastPart = unit.part === unit.of;
  const q = item.meaning.find((m) => text.includes(m.phrase)) ?? (lastPart ? item.meaning.find((m) => !lead.includes(m.phrase)) : undefined);
  if (q) learn.push({ id: nextId(c, 'meaning', id), itemId: id, review: false, kind: 'meaning', question: q, options: shuffle([q.answer, ...q.distractors], rng) });
  if (pieces.length >= 2) learn.push({ id: nextId(c, 'order', id), itemId: id, review: false, kind: 'order', tiles: pieces, decoys: [], bank: bankFor(pieces, [], rng), pieces: true, lead });
  learn.push({ id: nextId(c, 'blanks', id), itemId: id, review: false, kind: 'blanks', text, blanks: pickBlanks(text, 0.3, 4, rng), lead });
  learn.push({ id: nextId(c, 'letters', id), itemId: id, review: false, kind: 'letters', text, lead });
  const say: Step = { id: nextId(c, 'say', id), itemId: id, review: false, kind: 'say', text, lead };

  // Interleave up to three due reviews: after the first phrases, before the blanks, and before saying it.
  const reviews = o.due.slice(0, 3).map((d) => reviewStep(d.item, track, d.strength, rng, c));
  const blanksAt = learn.findIndex((s) => s.kind === 'blanks');
  const slots = [Math.min(3, blanksAt), blanksAt, learn.length];
  const steps = [...learn];
  reviews.forEach((r, i) => {
    const at = slots[i] + i;
    steps.splice(at, 0, r);
  });
  steps.push(say);
  return steps;
}

// Reviews only: each due item twice, first written then said, with the other items in between.
export function buildReview(o: { due: Due[]; track: Track; rng: Rng; max?: number }): Step[] {
  const c: Counter = { n: 0 };
  const chosen = o.due.slice(0, o.max ?? 6);
  const first = chosen.map((d) => reviewStep(d.item, o.track, Math.min(d.strength, 9), o.rng, c));
  const second = chosen.map((d) => reviewStep(d.item, o.track, d.strength, o.rng, c, 'say'));
  return [...first, ...shuffle(second, o.rng)];
}

// When speaking isn't possible right now, a say step becomes first letters of the same words.
export function withoutSpeaking(step: Step): Step {
  return step.kind === 'say' ? { ...step, kind: 'letters', id: `${step.id}:typed` } : step;
}
