import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finishSession, emptyProgress, type StepResult } from '../progress.ts';
import { unitsFor } from '../lesson.ts';
import { getItem } from '../content/index.ts';
import { dampedStep, partMemories, itemChance } from '../memory.ts';
import { lightMark, testedPositions } from '../observe.ts';
import { wordCards } from '../item-stats.ts';
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

const id = 'wsc-1';
const item = getItem(id)!;
const us = unitsFor(item, 'adult');
const day = (d: number, h = 9) => new Date(2026, 10, d, h);
const typed = (part: string, review: boolean): StepResult => ({ itemId: id, kind: 'type', correct: true, hints: 0, ms: 1, review, part, of: us.length, words: 12, misses: 0, missed: [] });
const light = (kind: string, part: string, ok = true, extra: Partial<StepResult> = {}): StepResult => ({ itemId: id, kind: kind as StepResult['kind'], correct: ok, hints: 0, ms: 1, review: true, part, of: us.length, ...extra });

function learned() {
  let p = emptyProgress();
  p = finishSession(p, { results: [{ itemId: id, kind: 'intro', correct: true, hints: 0, ms: 1, review: false }, ...us.map((u) => typed(u.key, false))], learned: us, now: day(2), grading: 'v2' });
  p = finishSession(p, { results: us.map((u) => typed(u.key, true)), now: day(3), grading: 'v2' });
  return p;
}

test('a light review spaces the item from today instead of bringing it back tomorrow (the bug)', () => {
  const p = learned();
  const before = p.cards[id];
  const after = finishSession(p, { results: us.flatMap((u) => [light('spot', u.key), light('blanks', u.key, true, { words: 12, misses: 0, missed: [] })]), now: day(12), grading: 'v2' });
  const c = after.cards[id];
  assert.ok(c.stability > before.stability, 'stability grows');
  assert.equal(c.last_review, day(12).toISOString(), 'last review is today');
  assert.ok(Date.parse(c.due) - day(12).getTime() >= 2 * 86_400_000, 'due is at least two days out, not 12 hours');
  assert.equal(c.lapses, before.lapses, 'a quick step is never a lapse');
});

test('a missed easy step weakens, gently', () => {
  const p = learned();
  const after = finishSession(p, { results: us.map((u) => light('match', u.key, false)), now: day(12), grading: 'v2' });
  assert.ok(after.cards[id].stability < p.cards[id].stability);
  assert.ok(after.cards[id].stability > p.cards[id].stability * 0.3, 'one slip is weak evidence: nowhere near a lapse');
});

test('parts remember quick steps too, but only reviews, and never start a memory', () => {
  const p = learned();
  const part = us[0].key;
  const base = partMemories(p.log);
  const withLight = partMemories([...p.log, { ...light('spot', part), at: day(12).toISOString(), day: '2026-11-12' } as never]);
  assert.ok(withLight[part].s > base[part].s);
  assert.equal(withLight[part].last, day(12).toISOString());
  const inLesson = partMemories([...p.log, { ...light('spot', part), review: false, at: day(12).toISOString(), day: '2026-11-12' } as never]);
  assert.equal(inLesson[part].s, base[part].s, 'steps with the words on screen do not count');
  const fresh = partMemories([{ ...light('spot', 'wsc-9#1'), at: day(12).toISOString(), day: '2026-11-12' } as never]);
  assert.equal(fresh['wsc-9#1'], undefined, 'a quick step cannot create a memory');
});

test('the same weights decide everywhere: stronger steps move memory further', () => {
  const engine = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));
  const first = engine.next(createEmptyCard(day(2)), day(2), Rating.Good).card;
  const s = (kind: string) => dampedStep(first, day(9), 'good', lightMark([{ kind, correct: true, hints: 0, review: true }])!.weight, engine).stability;
  assert.ok(s('match') < s('spot') && s('spot') < s('next') && s('next') < s('blanks'));
  assert.ok(s('match') > first.stability);
  assert.equal(dampedStep(first, day(9), 'good', 1, engine).state, State.Review);
});

test('words: fill-in-the-blanks and spot colour only the words they asked', () => {
  const part = us[0].key;
  const at = (d: number) => day(d).toISOString();
  const log = [
    { itemId: id, kind: 'blanks', part, correct: true, hints: 0, ms: 1, review: true, misses: 0, words: 12, tested: [0, 1], missed: [], at: at(5) },
    { itemId: id, kind: 'blanks', part, correct: false, hints: 0, ms: 1, review: true, misses: 1, words: 12, tested: [0, 1], missed: [1], at: at(6) },
    { itemId: id, kind: 'spot', part, correct: false, hints: 0, ms: 1, review: true, tested: [2], missed: [2], at: at(7) },
  ] as never;
  const cards = wordCards(item, 'adult', log);
  assert.equal(cards[0].tries, 2);
  assert.equal(cards[0].misses, 0);
  assert.equal(cards[1].misses, 1);
  assert.equal(cards[2].misses, 1);
  assert.equal(cards[3].tries, 0, 'words nobody asked stay unknown');
});

test('testedPositions names what a step asked', () => {
  assert.deepEqual(testedPositions({ kind: 'blanks', blanks: [3, 5] }), [3, 5]);
  assert.deepEqual(testedPositions({ kind: 'spot', wrongIndex: 4 }), [4]);
  assert.equal(testedPositions({ kind: 'type' }), null);
});

test('strength over the verse reads the quick steps', () => {
  const p = learned();
  const part = us[0].key;
  const w = (extra: unknown[]) => itemChance(id, partMemories([...p.log, ...extra] as never), day(20));
  const none = w([]);
  const some = w([{ ...light('spot', part), at: day(12).toISOString(), day: '2026-11-12' }]);
  assert.ok(some! > none!);
});
