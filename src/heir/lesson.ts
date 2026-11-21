// Builds lessons: the steps a learner works through, chosen by the app, never by the learner.
//
// A course is split into groups of up to five items. Inside a group:
//   - each lesson teaches one new item (or one part of a long answer) and practices every earlier item
//     in the group, harder the more it has been seen (cumulative rehearsal);
//   - once all its items are learned, a "lock it in" checkpoint recalls each one the hard way;
//   - after that the group's items leave the lessons and come back on the spaced schedule (FSRS).
// Due items from finished groups are mixed into lessons too, and have their own review sessions.

import type { Item, MeaningQuestion, Track } from './types.ts';
import { normalizeWord, words } from './words.ts';
import { SWAPS } from './swaps.ts';

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
const GROUP_SIZE = 5;
const MAX_STEPS = 16;

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

// The words of one part, and the piece just before it (shown as the start of the sentence).
export function unitText(item: Item, track: Track, u: Unit): { text: string; lead: string } {
  const c = item.chunks[track];
  return { text: c.slice(u.start, u.end).join(' '), lead: c[u.start - 1] ?? '' };
}

// Groups of up to five, never mixing collections, as even as possible (6 → 3 + 3).
export interface Group { key: string; collection: string; items: Item[] }

export function groupsOf(items: Item[]): Group[] {
  const byCollection: Item[][] = [];
  for (const item of items) {
    const last = byCollection[byCollection.length - 1];
    if (last && last[0].collection === item.collection) last.push(item); else byCollection.push([item]);
  }
  return byCollection.flatMap((list) => {
    const k = Math.ceil(list.length / GROUP_SIZE);
    const out: Group[] = [];
    let at = 0;
    for (let g = 0; g < k; g++) {
      const size = Math.floor(list.length / k) + (g < list.length % k ? 1 : 0);
      const slice = list.slice(at, at + size);
      at += size;
      out.push({ key: `${slice[0].collection}:${slice[0].number}-${slice[slice.length - 1].number}`, collection: slice[0].collection, items: slice });
    }
    return out;
  });
}

export type Activity =
  | { kind: 'learn'; group: Group; unit: Unit }
  | { kind: 'checkpoint'; group: Group };

// `waiting`: units whose lock-in waits for a night's sleep. Learning carries on into the next unit meanwhile,
// and the lock-in comes first the next day.
export function nextActivity(items: Item[], track: Track, learned: Set<string>, checkpoints: Set<string>, waiting?: Set<string>): Activity | null {
  for (const group of groupsOf(items)) {
    for (const item of group.items) for (const unit of unitsFor(item, track)) if (!learned.has(unit.key)) return { kind: 'learn', group, unit };
    if (!checkpoints.has(group.key) && !waiting?.has(group.key)) return { kind: 'checkpoint', group };
  }
  return null;
}

// Units fully learned whose lock-in should wait: one of their questions hasn't had its night's sleep yet.
export function lockInsWaiting(items: Item[], isWaiting: (itemId: string) => boolean): Set<string> {
  return new Set(groupsOf(items).filter((g) => g.items.some((i) => isWaiting(i.id))).map((g) => g.key));
}

export type StepKind = 'intro' | 'order' | 'meaning' | 'blanks' | 'letters' | 'say' | 'type' | 'next' | 'match' | 'spot' | 'info' | 'quiz';

interface Base { id: string; itemId: string; review: boolean }
// `lead` is the piece that comes just before the words being practiced, shown as the start of the answer.
export type Step =
  | (Base & { kind: 'intro'; unit: Unit })
  // Welcome lesson: a short card to read, and an easy question about it (neither is graded as memory).
  | (Base & { kind: 'info'; title: string; body: string })
  | (Base & { kind: 'quiz'; question: MeaningQuestion; options: string[] })
  // `tiles` in the right order; `bank` is tiles plus decoys, shuffled, as shown.
  // `slots`: the guided version, with a grey box for each word still to place.
  | (Base & { kind: 'order'; tiles: string[]; decoys: string[]; bank: string[]; pieces: boolean; slots: boolean; lead: string })
  | (Base & { kind: 'meaning'; question: MeaningQuestion; options: string[] })
  | (Base & { kind: 'blanks'; text: string; blanks: number[]; lead: string })
  | (Base & { kind: 'letters'; text: string; lead: string })
  | (Base & { kind: 'say'; text: string; lead: string })
  | (Base & { kind: 'type'; text: string; lead: string })
  // Pick the phrase that comes after `lead`.
  | (Base & { kind: 'next'; lead: string; answer: string; options: string[] })
  // Which question does `text` answer?
  | (Base & { kind: 'match'; text: string; answer: string; options: string[] })
  // `text` has one word swapped at `wrongIndex`; `rightWord` is the original.
  | (Base & { kind: 'spot'; text: string; wrongIndex: number; rightWord: string; correctText: string });

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

const pick = <T>(list: T[], rng: Rng): T => list[Math.floor(rng() * list.length)];

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

// Real words from other items that are not in the answer: decoys for word banks and swapped words.
function otherWords(pool: Item[], answer: string): string[] {
  const avoid = new Set(words(answer));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of pool) {
    for (const raw of item.text.split(' ')) {
      const w = raw.replace(/^[“‘"'(]+/, '').replace(/[.,;:!?”’")]+$/, '');
      const n = normalizeWord(w);
      if (n.length < 3 || avoid.has(n) || seen.has(n)) continue;
      seen.add(n);
      out.push(w);
    }
  }
  return out;
}

const COMMON = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'a', 'an', 'his', 'him', 'that', 'are', 'be', 'by', 'for', 'with', 'it', 'who', 'which', 'as', 'unto', 'all', 'we', 'i', 'he', 'our', 'us', 'on', 'from', 'was', 'were', 'what', 'do', 'doth', 'hath', 'but', 'there', 'they', 'their', 'this', 'these', 'man']);
const strongIndexes = (tokens: string[]) => tokens.map((t, i) => [normalizeWord(t), i] as const).filter(([w]) => w.length >= 3 && !COMMON.has(w)).map(([, i]) => i);

// Which words to hide: the ones that carry meaning, spread out, at least one.
export function pickBlanks(text: string, share: number, max: number, rng: Rng): number[] {
  const tokens = text.split(' ');
  const strong = strongIndexes(tokens);
  const from = strong.length ? strong : tokens.map((_, i) => i);
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

interface Ctx { n: number; rng: Rng; track: Track; pool: Item[] }
const nextId = (c: Ctx, kind: StepKind, itemId: string) => `${kind}:${itemId}:${c.n++}`;

function orderStep(c: Ctx, item: Item, tiles: string[], lead: string, pieces: boolean, review: boolean, slots = false): Step {
  // Never a decoy that appears anywhere in this answer: that would be a trick, not a test.
  const extra = pieces ? [] : otherWords(c.pool.filter((i) => i.id !== item.id), item.text).slice(0, 40);
  const decoys = shuffle(extra, c.rng).slice(0, pieces ? 0 : tiles.length > 4 ? 2 : 1);
  return { id: nextId(c, 'order', item.id), itemId: item.id, review, kind: 'order', tiles, decoys, bank: bankFor(tiles, decoys, c.rng), pieces, slots, lead };
}

// Swaps one word for a believable mix-up ("the only rule to guide us"), keeping its capital letter and
// punctuation. Returns the changed phrase and which word changed, or null when no word has a mix-up.
function mixUp(c: Ctx, phrase: string, avoid: string): { text: string; at: number } | null {
  const tokens = phrase.split(' ');
  const inAnswer = new Set(words(avoid));
  const options = tokens.flatMap((t, at) => {
    const core = normalizeWord(t).replace(/'/g, '');
    return (SWAPS[core] ?? []).filter((w) => !inAnswer.has(w)).map((w) => ({ at, w }));
  });
  if (!options.length) return null;
  const { at, w } = pick(options, c.rng);
  const m = tokens[at].match(/^([“‘"'(]*)(.*?)([.,;:!?”’")]*)$/);
  const [before, core, after] = [m?.[1] ?? '', m?.[2] ?? tokens[at], m?.[3] ?? ''];
  const swap = core[0] === core[0].toUpperCase() ? w[0].toUpperCase() + w.slice(1) : w;
  const out = [...tokens];
  out[at] = `${before}${swap}${after}`;
  return { text: out.join(' '), at };
}

// What comes next: the right phrase, the same phrase with one word changed, and a real phrase from
// nearby (later in this answer, or from the same catechism or creed). Close calls, not giveaways.
function nextPhraseStep(c: Ctx, item: Item, unit: Unit, review: boolean): Step | null {
  const chunks = item.chunks[c.track];
  const choices: number[] = [];
  for (let j = Math.max(1, unit.start); j < unit.end; j++) choices.push(j);
  if (!choices.length) return null;
  const j = pick(choices, c.rng);
  const answer = chunks[j];
  const near = c.pool.filter((i) => i.id !== item.id && i.collection === item.collection);
  const others = near.length ? near : c.pool.filter((i) => i.id !== item.id);
  // Two different mix-ups of the right phrase when the words allow it; real phrases fill any gap.
  const mixed: string[] = [];
  for (let t = 0; t < 8 && mixed.length < 2; t++) {
    const m = mixUp(c, answer, item.text)?.text;
    if (m && !mixed.includes(m)) mixed.push(m);
  }
  const seen = new Set([answer, ...mixed].map(normalizeWord));
  const real = shuffle([
    ...chunks.filter((_, k) => k > j + 1),
    ...others.flatMap((i) => i.chunks[c.track]),
  ], c.rng).filter((x) => {
    const key = normalizeWord(x);
    if (seen.has(key) || words(x).length < 2) return false;
    seen.add(key);
    return true;
  });
  const wrong = [...mixed, ...real].slice(0, 2);
  if (wrong.length < 2) return null;
  return { id: nextId(c, 'next', item.id), itemId: item.id, review, kind: 'next', lead: chunks[j - 1], answer, options: shuffle([answer, ...wrong], c.rng) };
}

function matchStep(c: Ctx, item: Item, unit: Unit, review: boolean): Step | null {
  const same = c.pool.filter((i) => i.id !== item.id && i.collection === item.collection);
  const rest = c.pool.filter((i) => i.id !== item.id && i.collection !== item.collection);
  const prompts = [...new Set([...shuffle(same, c.rng), ...shuffle(rest, c.rng)].map((i) => i.prompt))].filter((p) => p !== item.prompt).slice(0, 3);
  if (prompts.length < 2) return null;
  const { text } = unitText(item, c.track, unit);
  return { id: nextId(c, 'match', item.id), itemId: item.id, review, kind: 'match', text, answer: item.prompt, options: shuffle([item.prompt, ...prompts], c.rng) };
}

function spotStep(c: Ctx, item: Item, unit: Unit, review: boolean): Step | null {
  const { text } = unitText(item, c.track, unit);
  const m = mixUp(c, text, item.text);
  if (!m) return null;
  return { id: nextId(c, 'spot', item.id), itemId: item.id, review, kind: 'spot', text: m.text, wrongIndex: m.at, rightWord: text.split(' ')[m.at], correctText: text };
}

function textStep(c: Ctx, kind: 'blanks' | 'letters' | 'say' | 'type', item: Item, unit: Unit, review: boolean, blankShare = 0.3): Step {
  const { text, lead } = unitText(item, c.track, unit);
  const base = { id: nextId(c, kind, item.id), itemId: item.id, review, text, lead };
  if (kind === 'blanks') return { ...base, kind, blanks: pickBlanks(text, blankShare, review ? 6 : 4, c.rng) };
  return { ...base, kind };
}

type PracticeKind = 'blanks' | 'next' | 'spot' | 'letters' | 'match' | 'type' | 'say';

// Practice gets harder with each session an item has been in: recognize and fill in, then partial
// recall, then the whole thing from memory.
export function practiceKinds(sessions: number): PracticeKind[] {
  if (sessions < 2) return ['blanks', 'next', 'spot'];
  if (sessions < 4) return ['letters', 'spot', 'match', 'blanks'];
  return ['type', 'say', 'match', 'letters'];
}

function practiceStep(c: Ctx, item: Item, units: Unit[], kinds: PracticeKind[], review: boolean, avoid?: StepKind, inOrder = false): Step {
  const unit = pick(units, c.rng);
  for (const kind of inOrder ? kinds : shuffle(kinds, c.rng)) {
    if (kind === avoid && kinds.length > 1) continue;
    const step =
      kind === 'next' ? nextPhraseStep(c, item, unit, review)
      : kind === 'match' ? matchStep(c, item, unit, review)
      : kind === 'spot' ? spotStep(c, item, unit, review)
      : textStep(c, kind, item, unit, review, review ? 0.4 : 0.3);
    if (step) return step;
  }
  return textStep(c, 'blanks', item, unit, review);
}

// An item already in progress: the parts learned so far and how many times it has been practiced.
export interface Mate { item: Item; units: Unit[]; seen: number }
// An item from a finished group that is due on the schedule; strength is FSRS stability in days.
export interface Due { item: Item; strength: number }

function dueStep(c: Ctx, d: Due, avoid?: StepKind): Step {
  const kinds: PracticeKind[] = d.strength < 7 ? ['letters', 'spot', 'match', 'blanks'] : ['type', 'say', 'match'];
  return practiceStep(c, d.item, unitsFor(d.item, c.track), kinds, true, avoid);
}

// A second new question in the same lesson, learned more briefly: see it, build it, fill it in, type it.
export function buildLite(o: { unit: Unit; item: Item; track: Track; pool: Item[]; rng: Rng; idStart?: number }): Step[] {
  const c: Ctx = { n: o.idStart ?? 500, rng: o.rng, track: o.track, pool: o.pool };
  const { unit, item } = o;
  const pieces = item.chunks[o.track].slice(unit.start, unit.end);
  const steps: Step[] = [{ id: nextId(c, 'intro', item.id), itemId: item.id, review: false, kind: 'intro', unit }];
  if (pieces.length >= 2) steps.push(orderStep(c, item, pieces, item.chunks[o.track][unit.start - 1] ?? '', true, false));
  else steps.push(orderStep(c, item, pieces[0].split(' '), item.chunks[o.track][unit.start - 1] ?? '', false, false, true));
  steps.push(textStep(c, 'blanks', item, unit, false), textStep(c, 'type', item, unit, false));
  return steps;
}

export interface Intro { cards: { title: string; body: string }[]; quiz: MeaningQuestion[] }

// The welcome lesson: a few cards on what this is, an easy question after each pair, then the first question.
export function buildWelcome(o: { intro: Intro; unit: Unit; item: Item; track: Track; pool: Item[]; rng: Rng }): Step[] {
  const c: Ctx = { n: 900, rng: o.rng, track: o.track, pool: o.pool };
  const id = o.item.id;
  const opening: Step[] = [];
  o.intro.cards.forEach((card, i) => {
    opening.push({ id: nextId(c, 'info', id), itemId: id, review: false, kind: 'info', title: card.title, body: card.body });
    const q = o.intro.quiz[i];
    if (q) opening.push({ id: nextId(c, 'quiz', id), itemId: id, review: false, kind: 'quiz', question: q, options: shuffle([q.answer, ...q.distractors], c.rng) });
  });
  return [...opening, ...buildLesson({ unit: o.unit, item: o.item, track: o.track, mates: [], due: [], pool: o.pool, rng: o.rng })];
}

export function buildLesson(o: { unit: Unit; item: Item; track: Track; mates: Mate[]; due: Due[]; pool: Item[]; rng: Rng }): Step[] {
  const { unit, item, track } = o;
  const c: Ctx = { n: 0, rng: o.rng, track, pool: o.pool };
  const { text } = unitText(item, track, unit);
  const pieces = item.chunks[track].slice(unit.start, unit.end);
  const id = item.id;

  // Learning the new words: see them, rebuild them, understand them, then recall them.
  const learn: Step[] = [{ id: nextId(c, 'intro', id), itemId: id, review: false, kind: 'intro', unit }];
  const ph = phrases(pieces);
  let lead = item.chunks[track][unit.start - 1] ?? '';
  ph.forEach((p, i) => {
    const tiles = p.split(' ');
    const middle = ph.length > 2 && i === 1;
    const choose = middle ? nextPhraseStep(c, item, unit, false) : null;
    if (choose) learn.push(choose);
    // The first word bank is guided (a slot per word); later ones leave the count to memory.
    else if (tiles.length >= 2) learn.push(orderStep(c, item, tiles, lead, false, false, !learn.some((s) => s.kind === 'order')));
    lead = p;
  });
  const lastPart = unit.part === unit.of;
  const priorLead = item.chunks[track].slice(0, unit.start).join(' ');
  const q = item.meaning.find((m) => text.includes(m.phrase)) ?? (lastPart ? item.meaning.find((m) => !priorLead.includes(m.phrase)) : undefined);
  if (q) learn.push({ id: nextId(c, 'meaning', id), itemId: id, review: false, kind: 'meaning', question: q, options: shuffle([q.answer, ...q.distractors], c.rng) });
  if (pieces.length >= 2) learn.push(orderStep(c, item, pieces, item.chunks[track][unit.start - 1] ?? '', true, false));
  learn.push(textStep(c, 'blanks', item, unit, false));
  learn.push(textStep(c, 'letters', item, unit, false));
  const say = textStep(c, 'say', item, unit, false);

  // Practice the group's earlier items: twice each while there are few, once each after that.
  const perMate = o.mates.length <= 2 ? 2 : 1;
  const practice: Step[] = [];
  for (const m of o.mates) {
    let last: StepKind | undefined;
    for (let k = 0; k < perMate; k++) {
      const s = practiceStep(c, m.item, m.units, practiceKinds(m.seen), false, last);
      last = s.kind;
      practice.push(s);
    }
  }
  const due = o.due.slice(0, 2).map((d) => dueStep(c, d));

  // Room left for practice once the new item and due reviews are in.
  const room = Math.max(o.mates.length, MAX_STEPS - learn.length - 1 - due.length);
  const kept = practice.length > room ? practice.filter((_, i) => i % perMate === 0) : practice;

  // Warm up with an earlier item first, then spread the rest between the new steps, never next to a
  // step of the same kind.
  const steps: Step[] = [];
  const queue = [...kept];
  if (queue.length) steps.push(queue.shift()!);
  steps.push(...learn);
  const rest = [...queue, ...due];
  rest.forEach((step, n) => {
    const target = Math.round(((n + 1) * steps.length) / (rest.length + 1)) + 1;
    const fits = (k: number) => k >= 2 && steps[k - 1]?.kind !== step.kind && steps[k]?.kind !== step.kind;
    let at = steps.length;
    for (let d = 0; d < steps.length; d++) {
      if (fits(target + d) && target + d <= steps.length) { at = target + d; break; }
      if (fits(target - d)) { at = target - d; break; }
    }
    steps.splice(at, 0, step);
  });
  // End by saying it aloud, then typing it in full: the first clean typing earns Amethyst.
  steps.push(say, textStep(c, 'type', item, unit, false));
  return steps;
}

// "Lock it in": every item in the group recalled in full, typed or said, with a quick check in between.
export function buildCheckpoint(o: { group: Group; track: Track; pool: Item[]; rng: Rng }): Step[] {
  const c: Ctx = { n: 0, rng: o.rng, track: o.track, pool: o.pool };
  const hard: Step[] = [];
  const light: Step[] = [];
  const quick: PracticeKind[] = ['match', 'spot', 'next'];
  let k = 0;
  o.group.items.forEach((item, i) => {
    const units = unitsFor(item, o.track);
    for (const u of units) hard.push(textStep(c, k++ % 2 === 0 ? 'type' : 'say', item, u, true));
    // Take turns with the quick checks, so the five items don't all get the same one.
    light.push(practiceStep(c, item, units, [...quick.slice(i % 3), ...quick.slice(0, i % 3)], true, undefined, true));
  });
  const h = shuffle(hard, c.rng);
  const l = shuffle(light, c.rng);
  const out: Step[] = [];
  while (h.length || l.length) {
    if (h.length) out.push(h.shift()!);
    if (l.length) out.push(l.shift()!);
  }
  return out;
}

// Reviews only: each due item twice, first a quicker recall, then said or typed in full, spread apart.
export function buildReview(o: { due: Due[]; track: Track; pool: Item[]; rng: Rng; max?: number }): Step[] {
  const c: Ctx = { n: 0, rng: o.rng, track: o.track, pool: o.pool };
  const chosen = o.due.slice(0, o.max ?? 6);
  const first = chosen.map((d) => dueStep(c, { ...d, strength: Math.min(d.strength, 6) }));
  const second = chosen.map((d, i) => practiceStep(c, d.item, unitsFor(d.item, o.track), ['say', 'type'], true, first[i].kind));
  return [...first, ...shuffle(second, o.rng)];
}

// When speaking isn't possible right now, a say step becomes typing the same words.
export function withoutSpeaking(step: Step): Step {
  return step.kind === 'say' ? { ...step, kind: 'type', id: `${step.id}:typed` } : step;
}

// "When you lie down": short and quiet. One first-letters step per question: real recall, checked as you
// type, silent so it won't wake anyone, and quick enough for the end of the day.
export function buildNight(o: { items: Item[]; track: Track; pool: Item[]; rng: Rng }): Step[] {
  const c: Ctx = { n: 0, rng: o.rng, track: o.track, pool: o.pool };
  return o.items.map((item) => textStep(c, 'letters', item, pick(unitsFor(item, o.track), c.rng), true));
}

// "When you rise": last night's questions recalled in full from the question alone, said or typed in turn.
export function buildRise(o: { items: Item[]; track: Track; pool: Item[]; rng: Rng }): Step[] {
  const c: Ctx = { n: 0, rng: o.rng, track: o.track, pool: o.pool };
  let k = 0;
  return o.items.flatMap((item) => unitsFor(item, o.track).map((u) => textStep(c, k++ % 2 === 0 ? 'say' : 'type', item, u, true)));
}
