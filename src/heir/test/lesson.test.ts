import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLesson, buildReview, nextUnit, phrases, seeded, unitsFor, unitText, withoutSpeaking } from '../lesson.ts';
import { gradeSpoken, wordMatches, firstLetter, SPOKEN_PASS } from '../grade.ts';
import { dueCards, emptyProgress, finishSession, parseProgress, ratingFor, type StepResult } from '../progress.ts';
import { courses, courseItems, getItem, allItems } from '../content/index.ts';
import { words } from '../words.ts';

const wsc1 = getItem('wsc-1')!;
const wlc4 = getItem('wlc-4')!;

test('units: long answers are learned in parts of at most four pieces', () => {
  assert.deepEqual(unitsFor(wsc1, 'adult').map((u) => [u.start, u.end]), [[0, 2]]);
  assert.deepEqual(unitsFor(wlc4, 'adult').map((u) => [u.start, u.end]), [[0, 4], [4, 8]]);
  assert.deepEqual(unitsFor(wlc4, 'child').map((u) => u.end - u.start), [4, 4, 4, 3]);
  const parts = unitsFor(wlc4, 'child').map((u) => unitText(wlc4, 'child', u).text);
  assert.equal(parts.join(' '), wlc4.text);
});

test('units: the next lesson is the first part not yet learned, in course order', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-larger')!);
  assert.equal(nextUnit(items, 'adult', new Set())?.key, 'wlc-1#1');
  assert.equal(nextUnit(items, 'adult', new Set(['wlc-1#1', 'wlc-2#1', 'wlc-2#2', 'wlc-3#1']))?.key, 'wlc-4#1');
  assert.equal(nextUnit(items, 'adult', new Set(items.flatMap((i) => unitsFor(i, 'adult').map((u) => u.key)))), null);
});

test('phrases: short pieces are joined so a word bank has something to arrange', () => {
  assert.deepEqual(phrases(['Man’s chief end', 'is to glorify God,', 'and to enjoy him', 'forever.']), ['Man’s chief end is to glorify God,', 'and to enjoy him forever.']);
});

test('a first lesson walks from seeing it to saying it, with reviews mixed in', () => {
  const unit = unitsFor(wsc1, 'adult')[0];
  const due = [{ item: getItem('wsc-2')!, strength: 1 }, { item: getItem('wsc-3')!, strength: 5 }, { item: getItem('wsc-4')!, strength: 20 }];
  const steps = buildLesson({ unit, item: wsc1, track: 'adult', due, pool: allItems(), rng: seeded(1) });
  const mine = steps.filter((s) => !s.review).map((s) => s.kind);
  assert.deepEqual(mine, ['intro', 'order', 'order', 'meaning', 'order', 'blanks', 'letters', 'say']);
  assert.deepEqual(steps.filter((s) => s.review).map((s) => s.kind), ['blanks', 'letters', 'say']);
  assert.equal(steps[0].kind, 'intro');
  assert.equal(steps[steps.length - 1].kind, 'say');
  assert.ok(!steps[steps.length - 2].review || steps[steps.length - 2].itemId !== wsc1.id);
  assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
});

test('every part of every course builds a sensible lesson on both tracks', () => {
  for (const course of courses) {
    for (const item of courseItems(course)) {
      for (const track of ['adult', 'child'] as const) {
        for (const unit of unitsFor(item, track)) {
          const steps = buildLesson({ unit, item, track, due: [], pool: allItems(), rng: seeded(7) });
          const { text } = unitText(item, track, unit);
          assert.ok(steps.length >= 5 && steps.length <= 13, `${unit.key} ${track}: ${steps.length} steps`);
          for (const s of steps) {
            if (s.kind === 'order') {
              assert.ok(text.includes(s.tiles.join(' ')), `${unit.key} tiles`);
              for (const d of s.decoys) assert.ok(!words(text).includes(words(d)[0]), `${unit.key} decoy ${d}`);
              assert.deepEqual([...s.bank].sort(), [...s.tiles, ...s.decoys].sort());
              assert.notEqual(s.bank.slice(0, s.tiles.length).join(' '), s.tiles.join(' '), `${unit.key} bank already in order`);
            }
            if (s.kind === 'blanks') {
              assert.ok(s.blanks.length >= 1 && s.blanks.every((i) => i >= 0 && i < s.text.split(' ').length), `${unit.key} blanks`);
            }
            if (s.kind === 'meaning') assert.equal(new Set(s.options).size, 4);
          }
        }
      }
    }
  }
});

test('a review session recalls each due item twice, written first, then said', () => {
  const due = ['wsc-1', 'wsc-2', 'wsc-3'].map((id) => ({ item: getItem(id)!, strength: 2 }));
  const steps = buildReview({ due, track: 'adult', rng: seeded(3) });
  assert.equal(steps.length, 6);
  assert.deepEqual(steps.slice(0, 3).map((s) => s.kind), ['blanks', 'blanks', 'blanks']);
  assert.ok(steps.slice(3).every((s) => s.kind === 'say'));
  assert.equal(withoutSpeaking(steps[3]).kind, 'letters');
});

test('grading forgives punctuation, capitals, one slip in a long word, and split words', () => {
  assert.ok(wordMatches('glorfy', 'glorify'));
  assert.ok(wordMatches('Man’s', "man's"));
  assert.ok(!wordMatches('god', 'gods'));
  assert.ok(!wordMatches('', 'God'));
  assert.equal(firstLetter('“Man’s'), 'm');
  const all = gradeSpoken(wsc1.text, 'mans chief end is to glorify god and to enjoy him for ever');
  assert.equal(all.score, 1);
  const half = gradeSpoken(wsc1.text, 'mans chief end is to glorify god');
  assert.ok(half.score < SPOKEN_PASS && half.score > 0.5);
  assert.deepEqual(half.heard.slice(-3), [false, false, false]);
});

const at = (iso: string) => new Date(iso);
const ok = (itemId: string, kind: StepResult['kind'] = 'blanks'): StepResult => ({ itemId, kind, correct: true, hints: 0, ms: 1000, review: false });

test('progress: an item gets a schedule only once all its parts are learned', () => {
  const units = unitsFor(wlc4, 'adult');
  const now = at('2026-11-19T12:00:00Z');
  let p = finishSession(emptyProgress(), { results: [ok('wlc-4')], learned: units[0], now });
  assert.deepEqual(p.units, ['wlc-4#1']);
  assert.equal(p.cards['wlc-4'], undefined);
  p = finishSession(p, { results: [ok('wlc-4')], learned: units[1], now });
  assert.ok(p.cards['wlc-4']);
  assert.equal(p.lessons, 2);
  assert.equal(p.days.length, 1);
});

test('progress: a clean first lesson comes back in a few days; a rough one tomorrow', () => {
  const now = at('2026-11-19T12:00:00Z');
  const unit = unitsFor(wsc1, 'adult')[0];
  const good = finishSession(emptyProgress(), { results: [ok('wsc-1', 'intro'), ok('wsc-1')], learned: unit, now });
  const rough = finishSession(emptyProgress(), { results: [{ ...ok('wsc-1'), correct: false }, { ...ok('wsc-1', 'say'), correct: false }], learned: unit, now });
  const days = (p: typeof good) => (new Date(p.cards['wsc-1'].due).getTime() - now.getTime()) / 86400000;
  assert.ok(days(good) >= 2 && days(good) <= 4, `good ${days(good)}`);
  assert.ok(days(rough) <= 1, `rough ${days(rough)}`);
  assert.equal(dueCards(good, now).length, 0);
  assert.deepEqual(dueCards(good, at('2026-11-25T12:00:00Z')).map((c) => c.itemId), ['wsc-1']);
});

test('progress: ratings come from first-try answers and hints, not from reading', () => {
  assert.equal(ratingFor([{ ...ok('x', 'intro'), correct: false }, ok('x')]), 3);
  assert.equal(ratingFor([{ ...ok('x'), hints: 1 }]), 2);
  assert.equal(ratingFor([{ ...ok('x'), correct: false }, { ...ok('x'), correct: false }]), 1);
});

test('progress: stored data that is broken is ignored', () => {
  assert.deepEqual(parseProgress('nope'), {});
  assert.deepEqual(parseProgress(JSON.stringify({ m1: { units: ['a', 3], lessons: 'x' } })).m1, { units: ['a'], cards: {}, lessons: 0, days: [], log: [] });
});
