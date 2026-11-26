import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTerms, speechHints } from '../speech.ts';

test('speech hints are made safe for ElevenLabs: no brackets, at most five words and fifty characters, fifty in all', () => {
  assert.deepEqual(cleanTerms(['Melchizedek', ' hath ', '[unto]', 'hath', 'one two three four five six', 'x'.repeat(51), '']), ['Melchizedek', 'hath', 'unto']);
  assert.equal(cleanTerms(Array.from({ length: 80 }, (_, i) => `w${i}`)).length, 50);
});

test('hints are the rare words of an answer: names, old words, long words; never the whole answer', () => {
  const h = speechHints('The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.');
  for (const w of ['Lord', 'maketh', 'leadeth']) assert.ok(h.includes(w), `${w} is a hint`);
  for (const w of ['The', 'He', 'I', 'green']) assert.ok(!h.includes(w), `${w} is not a hint`);
  assert.deepEqual(speechHints('Melchizedek, king of Salem, blessed Abraham.'), ['Melchizedek', 'Salem', 'Abraham']);
  assert.equal(speechHints('Hath hath HATH thee').length, 2, 'no duplicates, ignoring case');
  assert.ok(speechHints(Array.from({ length: 200 }, (_, i) => `Abcdefghij${i}`).join(' ')).length <= 50);
});
