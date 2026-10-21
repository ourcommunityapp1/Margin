import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { booksNamed, parseRef, spans, formatSpan } from '../bible/refs.ts';
import { gather, rankFathers } from '../retrieve/gather.ts';
import { PassageIndex } from '../retrieve/search.ts';
import { knownPassages } from '../retrieve/known.ts';

const isFather = (who: string) => !['bsb', 'henry', 'spurgeon'].includes(who);

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
  assert.ok(ch.sources.some((s) => s.who === 'chrysostom' && /Homily on the Gospel of Matthew/.test(s.title)), 'his own homilies on Matthew');
  const jn = await gather(corpus, span('John 3:1-8'), { speaker: 'augustine' });
  assert.ok(jn.sources.some((s) => s.who === 'augustine' && /Tractates on John/.test(s.title)), 'his Tractates on John');
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

test('search finds quoted and recalled lines of Scripture, and stays quiet on sayings', async () => {
  const idx = await PassageIndex.build(corpus);
  const exact = (q: string) => idx.search(q, 4, { books: booksNamed(q) }).filter((h) => h.score === Infinity).map((h) => formatSpan(h.span, vs));
  assert.ok(exact("What does 'The Lord is my shepherd' actually mean?").some((h) => h.startsWith('Psalm 23')));
  assert.ok(exact('What did Jesus mean by ‘blessed are the poor in spirit’?').some((h) => h.startsWith('Matthew 5')));
  assert.ok(exact('Proverbs says lean not on your own understanding. So I shouldn’t think?').some((h) => h.startsWith('Proverbs 3')));
  assert.ok(exact('Is money the root of all evil?').some((h) => h.startsWith('1 Timothy 6')));
  assert.deepEqual(exact('Where does the Bible say God helps those who help themselves?'), []);
  assert.deepEqual(exact('What does it mean to be saved?'), []);
  const genesis = idx.search('Genesis says we are made in God’s image', 2, { books: booksNamed('Genesis says we are made in God’s image') });
  assert.ok(formatSpan(genesis[0].span, vs).startsWith('Genesis 1'), 'a named book is searched first');
});

test('well-known passage names point at real passages', () => {
  assert.deepEqual(knownPassages('What was the point of the Good Samaritan?'), ['Luke 10:25–37']);
  assert.deepEqual(knownPassages('Tell me about the rich man and Lazarus'), ['Luke 16:19–31']);
  assert.ok(knownPassages('Why did Jesus wait to raise Lazarus?').includes('John 11:17–44'));
  const all = knownPassages('good samaritan prodigal son sermon on the mount beatitudes lord\'s prayer great commission golden rule ten commandments shema last supper road to damascus fruit of the spirit armor of god love chapter hall of faith transfiguration pentecost tower of babel noah\'s ark burning bush red sea goliath lions den fiery furnace five loaves cana lazarus nicodemus woman at the well zacchaeus mary and martha binding of isaac jacob wrestled suffering servant dry bones new covenant magnificat nativity temptation of jesus gethsemane doubting thomas peter\'s denial empty tomb kenosis new heaven and new earth proverbs 31 woman still small voice mount carmel walls of jericho seventy weeks unforgivable sin faith and works judge not rich man and lazarus');
  assert.ok(all.length >= 55, `${all.length} passages`);
  for (const r of all) assert.ok(parseRef(r, vs), r);
});

test('a bare reference keeps every voice on the verse it names', async () => {
  const g = await gather(corpus, span('John 3:1-21'), { speaker: 'host', focus: 'What does   mean?', focusSpans: span('John 3:16') });
  assert.ok(g.sources.some((s) => isFather(s.who) && s.span.a <= 16 && s.span.b >= 16), g.sources.map((s) => s.id).join(', '));
});

test('on a whole chapter, the notes come from the verses the question is about', async () => {
  const q = 'Second Peter 2 says people who knew Jesus and went back are worse off at the end. Can you lose your salvation?';
  const g = await gather(corpus, span('2 Peter 2'), { speaker: 'host', focus: q });
  const henry = g.sources.filter((s) => s.who === 'henry');
  assert.ok(henry.some((s) => s.span.b >= 20), henry.map((s) => s.id).join(', '));
  const plain = await gather(corpus, span('2 Peter 2'), { speaker: 'host' });
  assert.ok(plain.sources.some((s) => s.who === 'henry' && s.span.a === 1), 'without a question, notes run in order');
});

test('a name in the question is not mistaken for a remembered line', async () => {
  const idx = await PassageIndex.build(corpus);
  const exact = idx.search('What did Chrysostom make of Paul and Silas singing in jail at midnight?', 4).filter((h) => h.score === Infinity);
  assert.deepEqual(exact.map((h) => formatSpan(h.span, vs)), []);
});

test('Fathers come only from 19th-century translations', async () => {
  for (const [bi, c] of [[42, 3], [18, 51], [44, 8], [0, 1]] as const) {
    const cd = await corpus.chapter(bi, c);
    for (const k of cd.fathers) assert.match(k.label ?? '', /^(expositions? (on|of) (the )?psalms?|on the psalms|tractates? on|ten homilies|(the )?harmony|homil|concerning the statues)/i, k.id);
  }
});
