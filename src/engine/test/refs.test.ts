import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { parseRef, formatRef, spans, spokenSpan, findRefs, formatSpan, booksNamed } from '../bible/refs.ts';
import { BOOKS } from '../bible/canon.ts';

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

test('reads ordinal book names and books named without a chapter', () => {
  const said = (q: string) => findRefs(q, vs, true).map((r) => r.ref && formatRef(r.ref));
  assert.deepEqual(said('Second Peter 2 says they are worse off'), ['2 Peter 2']);
  assert.deepEqual(said('what does first John 4:8 mean'), ['1 John 4:8']);
  const named = (q: string) => booksNamed(q).map((b) => BOOKS[b].name);
  assert.deepEqual(named('Philippians says not to be anxious'), ['Philippians']);
  assert.deepEqual(named('In Acts, why did Paul go to Jerusalem?'), ['Acts']);
  assert.deepEqual(named('Acts of kindness matter, right?'), [], 'an everyday word opening a sentence');
  assert.deepEqual(named('What does Corinthians say about love?'), ['1 Corinthians', '2 Corinthians']);
  assert.deepEqual(named('Did Peter really deny Jesus?'), [], 'Peter alone is the apostle');
  assert.deepEqual(named('Romans 8 is my favorite'), [], 'a chapter makes it a reference instead');
});

test('the library holds every verse the BSB prints, and only the BSB\'s omissions are empty', async () => {
  const empty: string[] = [];
  for (let bi = 0; bi < BOOKS.length; bi++) {
    for (let c = 1; c <= corpus.chapterCount(bi); c++) {
      const cd = await corpus.chapter(bi, c);
      cd.verses.forEach((t, i) => { if (!t) empty.push(`${BOOKS[bi].name} ${c}:${i + 1}`); });
    }
  }
  assert.deepEqual(empty, ['Matthew 17:21', 'Matthew 18:11', 'Matthew 23:14', 'Mark 7:16', 'Mark 9:44', 'Mark 9:46', 'Mark 11:26', 'Mark 15:28',
    'Luke 17:36', 'Luke 23:17', 'John 5:4', 'Acts 8:37', 'Acts 15:34', 'Acts 24:7', 'Acts 28:29', 'Romans 16:24']);
  assert.match((await corpus.chapter(38, 4)).verses[4], /Elijah the prophet/);
});
