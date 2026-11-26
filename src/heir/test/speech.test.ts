import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTerms } from '../speech.ts';

test('speech hints are made safe for ElevenLabs: no brackets, at most five words and fifty characters, fifty in all', () => {
  assert.deepEqual(cleanTerms(['Melchizedek', ' hath ', '[unto]', 'hath', 'one two three four five six', 'x'.repeat(51), '']), ['Melchizedek', 'hath', 'unto']);
  assert.equal(cleanTerms(Array.from({ length: 80 }, (_, i) => `w${i}`)).length, 50);
});
