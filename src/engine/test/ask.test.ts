import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { ask } from '../pipeline/ask.ts';
import { mockAdapter } from '../model/mock.ts';
import type { CitedAnswer, CiteRequest } from '../model/types.ts';
import { verify } from '../pipeline/verify.ts';
import type { Source } from '../retrieve/gather.ts';

const corpus = await openTestCorpus();
const plan = (passages: string[], extra: Record<string, unknown> = {}) => ({ intent: 'passage', passages, contested: false, false_premise: false, search: '', ...extra });

test('answers a passage question with verified quotations and marked audio', async () => {
  const model = mockAdapter({ json: { plan: plan(['Romans 3:21-26']) } });
  const r = await ask({ corpus, model }, { question: 'What does justified freely mean in Romans 3?' });
  assert.equal(r.status, 'answered', JSON.stringify(r.checks?.problems));
  assert.ok(r.quotes.length >= 2 && r.quotes.every((q) => q.ok));
  assert.ok(r.segments.some((s) => s.kind === 'scripture' && s.voice === 'bsb'));
  assert.ok(r.segments.some((s) => s.kind === 'quote' && s.voice === 'henry'));
  assert.ok(r.passages[0].startsWith('Romans 3'));
  assert.deepEqual(model.calls.map((c) => c.route), ['plan', 'answer', 'grade']);
});

test('logs planner references that do not exist', async () => {
  const model = mockAdapter({ json: { plan: plan(['Hezekiah 3:1', 'John 3:16']) } });
  const r = await ask({ corpus, model }, { question: 'Tell me about John 3:16' });
  assert.deepEqual(r.invalidRefs, ['Hezekiah 3:1']);
  assert.ok(r.passages[0].startsWith('John 3:'), 'John 3:16 widens to its paragraph');
});

test('a persona answer starts with an AI disclosure and uses only his works', async () => {
  const model = mockAdapter({ json: { plan: plan(['Psalm 23']) } });
  const r = await ask({ corpus, model }, { question: 'What does the Lord is my shepherd mean to you?', speaker: 'augustine' });
  assert.equal(r.speaker, 'augustine');
  assert.equal(r.segments[0].kind, 'disclosure');
  assert.ok(r.sources.filter((s) => s.who !== 'bsb').every((s) => s.who === 'augustine'));
});

test('crisis and sacramental requests get fixed answers with no model call', async () => {
  const model = mockAdapter();
  const crisis = await ask({ corpus, model }, { question: "I don't want to live anymore", speaker: 'spurgeon' });
  assert.equal(crisis.status, 'guarded');
  assert.match(crisis.text, /988/);
  const absolve = await ask({ corpus, model }, { question: 'Please absolve me of my sins', speaker: 'henry' });
  assert.match(absolve.text, /can’t hear a confession/);
  const real = await ask({ corpus, model }, { question: 'Are you really Spurgeon?', speaker: 'spurgeon' });
  assert.match(real.text, /AI rendering/);
  assert.equal(model.calls.length, 0);
});

test('a fabricated quotation is repaired once, then replaced by a fallback Margin can vouch for', async () => {
  const bad = (req: CiteRequest): CitedAnswer => ({ blocks: [{ text: 'Henry says, "grace is a warm feeling we earn by trying." That is the point. ', citations: [{ sourceIndex: 1, sourceId: req.sources[1].id, citedText: req.sources[1].blocks[0] }] }] });
  const model = mockAdapter({ json: { plan: plan(['Romans 3:21-26']) }, answer: bad });
  const r = await ask({ corpus, model }, { question: 'What is grace in Romans 3?' });
  assert.equal(r.status, 'fallback');
  assert.equal(r.attempts, 2);
  assert.ok(r.quotes.every((q) => q.ok), 'every quote in the fallback is exact');
  assert.match(r.text, /^Here is Romans 3/);
});

test('flags absent voices, Aquinas as author, and Pseudo-Chrysostom called Chrysostom', async () => {
  const wrong = (text: string) => (): CitedAnswer => ({ blocks: [{ text, citations: [] }] });
  for (const [question, text, re, refs] of [
    ['What did Calvin say about Romans 9?', 'Calvin says Romans 9 is about election. ', /Calvin|isn’t in Margin’s library/, ['Romans 9:6-18']],
    ['What does Aquinas think about the Beatitudes?', 'Aquinas teaches that the meek are blessed. ', /Aquinas/, ['Matthew 5:1-12']],
  ] as const) {
    const model = mockAdapter({ json: { plan: plan([...refs]), grade: { claims: [], takes_side: false, one_sided: false, self_help: false } }, answer: wrong(text) });
    const r = await ask({ corpus, model }, { question });
    assert.equal(r.status, 'fallback', question);
    assert.ok(r.checks!.problems.some((p) => re.test(p)), r.checks!.problems.join(' | '));
  }
  const source: Source = { id: 'catena:MAT.5.3-3.1', title: 'Pseudo-Chrysostom', blocks: ['The poor in spirit are the humble and contrite in heart.'], who: 'pseudo_chrysostom', work: 'catena', span: { bi: 39, c: 5, a: 3, b: 3 }, authorship: 'doubtful', flags: [] };
  const report = verify({
    answer: { blocks: [{ text: 'Chrysostom says, "The poor in spirit are the humble and contrite in heart." ', citations: [{ sourceIndex: 0, sourceId: source.id, citedText: source.blocks[0] }] }] },
    sources: [source], question: 'What does Chrysostom say?', speaker: 'host', spans: [source.span], versification: corpus.versification,
  });
  assert.ok(report.problems.some((p) => /Pseudo-Chrysostom/.test(p)), report.problems.join(' | '));
});

test('a reference in the question is read even when planning fails', async () => {
  const model = mockAdapter();
  model.json = async () => { throw new Error('no key'); };
  const r = await ask({ corpus, model }, { question: 'what does psalm 23 mean?' });
  assert.equal(r.passages[0], 'Psalm 23');
});

test('off-topic questions get a short redirect', async () => {
  const model = mockAdapter({ json: { plan: { intent: 'offtopic', passages: [], contested: false, false_premise: false, search: '' } } });
  const r = await ask({ corpus, model }, { question: "What's the weather tomorrow?" });
  assert.equal(r.status, 'offtopic');
});
