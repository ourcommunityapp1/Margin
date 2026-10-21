import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { BOOKS, findBook } from '../bible/canon.ts';
import { Corpus } from '../corpus/store.ts';
import { authorOf } from '../corpus/sources.ts';

const corpus = await openTestCorpus();

test('loads a chapter with Bible text and attributed commentary', async () => {
  const cd = await corpus.chapter(findBook('Romans'), 3);
  assert.equal(cd.nv, 31);
  assert.match(cd.verses[23], /justified freely/i);
  assert.ok(cd.henry.length >= 2);
  assert.ok(cd.henry.every((h) => h.posthumous), 'Henry on Romans is flagged as completed by others');
  assert.ok(cd.fathers.some((f) => f.who === 'chrysostom' && /Homily on Romans/.test(f.label ?? '')));
  assert.equal(new Set([...cd.henry, ...cd.fathers].map((k) => k.id)).size, cd.henry.length + cd.fathers.length);
});

test('Henry notes reach to the next section, and units tile the chapter', async () => {
  const cd = await corpus.chapter(findBook('John'), 3);
  assert.equal(cd.henry[0].span.a, 1);
  assert.equal(cd.henry[0].reach, cd.henry[1].span.a - 1);
  const units = corpus.units(cd);
  assert.equal(units[0].a, 1);
  assert.equal(units[units.length - 1].b, cd.nv);
  for (let i = 1; i < units.length; i++) assert.equal(units[i].a, units[i - 1].b + 1);
});

test('Psalms carry Spurgeon, and the Gospels carry the Catena with honest labels', async () => {
  const ps = await corpus.chapter(findBook('Psalm'), 23);
  assert.ok(ps.spurgeon.length > 0 && ps.spurgeonOverview);
  assert.equal(ps.henry[0].posthumous, false);
  const mt = await corpus.chapter(findBook('Matthew'), 5);
  const whos = new Set(mt.catena.map((k) => k.who));
  assert.ok(whos.has('pseudo_chrysostom'));
  assert.equal(authorOf('pseudo_chrysostom').authorship, 'doubtful');
  let chrysologus = 0;
  for (let c = 1; c <= corpus.chapterCount(findBook('Matthew')); c++) {
    const cd = await corpus.chapter(findBook('Matthew'), c);
    chrysologus += cd.catena.filter((k) => k.who === 'chrysostom' && /^Chrysol/.test(k.label ?? '')).length;
  }
  assert.equal(chrysologus, 0, 'Peter Chrysologus is no longer filed under Chrysostom');
  assert.equal(BOOKS.length, 66);
  assert.ok(Corpus.touching(mt, 3, 3).length > 0);
});
