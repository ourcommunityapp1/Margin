import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainOf, localFormat, realLinks } from '../ai.ts';
import { sameWords } from '../words.ts';

test('only links the search really returned are passed on', () => {
  const seen = new Map([['https://en.wikipedia.org/wiki/Sunk_cost', 'Sunk cost - Wikipedia'], ['https://heathbrothers.com/books/decisive/', 'Decisive']]);
  const out = realLinks([
    { url: 'https://en.wikipedia.org/wiki/Sunk_cost', title: 'Sunk cost, the idea' },
    { url: 'https://example.com/made-up-from-memory', title: 'Invented' },
    { url: 'https://en.wikipedia.org/wiki/Sunk_cost', title: 'Duplicate' },
    { url: 'https://heathbrothers.com/books/decisive/', title: '' },
  ], seen);
  assert.deepEqual(out, [
    { url: 'https://en.wikipedia.org/wiki/Sunk_cost', title: 'Sunk cost, the idea', domain: 'en.wikipedia.org' },
    { url: 'https://heathbrothers.com/books/decisive/', title: 'Decisive', domain: 'heathbrothers.com' },
  ]);
  assert.equal(domainOf('not a url'), '');
});

test('with no AI the words still reach the page, unchanged', () => {
  const raw = 'so i was thinking\n\nabout the move';
  const out = localFormat(raw);
  assert.equal(out.accepted, false);
  assert.equal(sameWords(raw, out.paragraphs.join(' ')).ok, true);
});
