import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { parseRef, formatRef, spans, spokenSpan, findRefs, formatSpan } from '../bible/refs.ts';

const corpus = await openTestCorpus();
const vs = corpus.versification;

test('parses common reference forms', () => {
  assert.equal(formatRef(parseRef('Romans 3:21-26', vs)!), 'Romans 3:21–26');
  assert.equal(formatRef(parseRef('rom 8', vs)!), 'Romans 8');
  assert.equal(formatRef(parseRef('Ps 23', vs)!), 'Psalm 23');
  assert.equal(formatRef(parseRef('1 Cor 13:4–7', vs)!), '1 Corinthians 13:4–7');
  assert.equal(formatRef(parseRef('John 3:16-4:2', vs)!), 'John 3:16–4:2');
  assert.equal(formatRef(parseRef('Jude 3', vs)!), 'Jude 1:3');
  assert.equal(formatRef(parseRef('John chapter 3 verse 16', vs)!), 'John 3:16');
});

test('rejects references outside the versification', () => {
  assert.equal(parseRef('Romans 17', vs), null);
  assert.equal(parseRef('John 3:99', vs), null);
  assert.equal(parseRef('Hezekiah 3:1', vs), null);
  assert.equal(parseRef('Romans', vs), null);
});

test('expands references into chapter spans', () => {
  assert.deepEqual(spans(parseRef('John 3:16-4:2', vs)!, vs).map((s) => [s.c, s.a, s.b]), [[3, 16, 36], [4, 1, 2]]);
  assert.deepEqual(spans(parseRef('Romans 8', vs)!, vs).map((s) => [s.c, s.a, s.b]), [[8, 1, 39]]);
});

test('speaks and finds references', () => {
  const [s] = spans(parseRef('Romans 3:21-26', vs)!, vs);
  assert.equal(spokenSpan(s, vs), 'Romans chapter three, verses twenty-one to twenty-six');
  assert.equal(spokenSpan(spans(parseRef('Psalm 119', vs)!, vs)[0], vs), 'Psalm one hundred nineteen');
  assert.equal(formatSpan(spans(parseRef('Psalm 23', vs)!, vs)[0], vs), 'Psalm 23');
  const found = findRefs('As Paul says in Romans 4:5, and in Song of Songs 2:4, but not in Hezekiah 3:1.', vs);
  assert.deepEqual(found.map((f) => [f.raw, !!f.ref]), [['Romans 4:5', true], ['Song of Songs 2:4', true]]);
  assert.deepEqual(findRefs('what does psalm 23 mean, and is 5 enough?', vs, true).map((f) => f.raw), ['psalm 23']);
});
