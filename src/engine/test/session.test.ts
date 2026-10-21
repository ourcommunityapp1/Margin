import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { buildSession } from '../pipeline/session.ts';
import { draftPlaylist } from '../pipeline/playlist.ts';
import { mockAdapter } from '../model/mock.ts';

const corpus = await openTestCorpus();

test('a read-format session plays Scripture first, then commentators, with timings', async () => {
  const s = await buildSession(corpus, { title: 'Abraham believed', refs: ['Romans 4:1-8'] });
  assert.equal(s.chapters[0].kind, 'scripture');
  assert.match(s.chapters[0].units[0].say, /^Abraham believed\. Romans chapter four, verses one to eight\.$/);
  assert.ok(s.chapters.some((c) => c.who === 'henry' && /completed from Henry’s notes/.test(c.subtitle)));
  assert.ok(s.chapters.filter((c) => c.kind === 'comment' && c.who !== 'henry').length <= 3);
  assert.equal(s.chapters[1].start, s.chapters[0].dur);
  assert.ok(s.total > 60);
});

test('a verse-format psalm interleaves Spurgeon by verse and labels doubtful writers', async () => {
  const ps = await buildSession(corpus, { refs: ['Psalm 23'], format: 'verse' });
  const kinds = ps.chapters.slice(0, 4).map((c) => `${c.kind}:${c.who}`);
  assert.equal(kinds[0], 'comment:spurgeon', 'Spurgeon introduces the psalm');
  assert.equal(kinds[1], 'scripture:bsb');
  const mt = await buildSession(corpus, { refs: ['Matthew 5:1-12'] });
  for (const c of [...mt.chapters, ...mt.extras].filter((x) => x.who === 'pseudo_chrysostom')) {
    assert.match(c.subtitle, /anonymous/);
    assert.match(c.units[0].say, /calls Pseudo-Chrysostom/);
  }
  assert.ok(mt.extras.length > 0 && mt.extras.every((x) => x.extra));
});

test('a playlist keeps only real passages and trims long ones', async () => {
  const model = mockAdapter({ json: { playlist: { title: 'Faith and works', description: 'd', contested: true, sessions: [
    { title: 'Justified freely', passage: 'Romans 3:21–31', idea: 'i', question: 'q' },
    { title: 'Not real', passage: 'Hezekiah 3:1', idea: 'i', question: 'q' },
    { title: 'Long', passage: 'Romans 8', idea: 'i', question: 'q' },
  ] } } });
  const d = await draftPlaylist({ corpus, model }, { topic: 'faith and works', from: 'spurgeon', sessions: 6 });
  assert.deepEqual(d.dropped, ['Hezekiah 3:1']);
  assert.deepEqual(d.sessions.map((s) => s.refs[0]), ['Romans 3:21–31', 'Romans 8:1–25']);
  assert.match(d.sessions[0].note ?? '', /Spurgeon has no notes here/);
  const outline = await draftPlaylist({ corpus, model }, { topic: 'John 3', sessions: 6 });
  assert.equal(outline.by, 'outline');
  assert.ok(outline.sessions.length >= 2);
});
