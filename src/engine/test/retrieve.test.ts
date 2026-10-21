import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { parseRef, spans, formatSpan } from '../bible/refs.ts';
import { gather, rankFathers } from '../retrieve/gather.ts';
import { PassageIndex } from '../retrieve/search.ts';

const corpus = await openTestCorpus();
const vs = corpus.versification;
const span = (r: string) => spans(parseRef(r, vs)!, vs);

test('host gathers Scripture, Henry and the Fathers with attribution in titles', async () => {
  const g = await gather(corpus, span('Romans 3:24'), { speaker: 'host' });
  assert.equal(g.sources[0].who, 'bsb');
  assert.ok(g.spans[0].a < 24 && g.spans[0].b >= 24, 'a lone verse widens to its paragraph');
  const henry = g.sources.find((s) => s.who === 'henry')!;
  assert.match(henry.title, /completed from his notes/);
  assert.ok(g.sources.some((s) => s.who === 'chrysostom'));
  assert.ok(g.traditions.includes('reformed') && g.traditions.includes('fathers'));
  assert.equal(g.silent, false);
});

test('a persona hears only his own works, never the Catena', async () => {
  const g = await gather(corpus, span('John 1:1-5'), { speaker: 'augustine' });
  assert.ok(g.sources.filter((s) => s.who !== 'bsb').every((s) => s.who === 'augustine' && s.work === 'npnf'));
  const ch = await gather(corpus, span('Matthew 5:1-12'), { speaker: 'chrysostom' });
  assert.ok(ch.sources.every((s) => s.work !== 'catena'));
  assert.equal(ch.silent, true, 'no genuine Chrysostom homily on Matthew in the library');
});

test('doubtful writers rank last and say so in their titles', async () => {
  const cd = await corpus.chapter(39, 5);
  const ranked = rankFathers(cd.catena.filter((k) => k.span.a <= 12), 4);
  assert.ok(ranked.every((k) => !k.who.startsWith('pseudo_')));
  const g = await gather(corpus, span('Matthew 23:13-36'), { speaker: 'host' });
  for (const s of g.sources.filter((x) => x.authorship === 'doubtful')) assert.match(s.title, /anonymous|doubtful|falsely|unnamed/i);
});

test('topic search finds passages that name no reference', async () => {
  const t0 = Date.now();
  const idx = await PassageIndex.build(corpus);
  const ms = Date.now() - t0;
  const hits = idx.search('do not be anxious about anything, pray with thanksgiving', 5).map((h) => formatSpan(h.span, vs));
  assert.ok(hits.some((h) => h.startsWith('Philippians 4')), hits.join(', '));
  const shepherd = idx.search('the Lord is my shepherd', 3).map((h) => formatSpan(h.span, vs));
  assert.ok(shepherd.some((h) => h.startsWith('Psalm 23')), shepherd.join(', '));
  console.log(`index: ${idx.size} units in ${ms} ms`);
});
