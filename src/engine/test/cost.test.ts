import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORPUS_DIR, openTestCorpus } from './helpers.ts';
import { ask } from '../pipeline/ask.ts';
import { mockAdapter } from '../model/mock.ts';
import { citeParams, jsonParams, routeFor } from '../model/anthropic.ts';
import { costOf } from '../model/pricing.ts';
import { addUsage, newUsage, type ModelAdapter } from '../model/types.ts';
import { memoryGuides } from '../pipeline/guides.ts';
import { recordGuideRequests, replayGuides } from '../pipeline/precompute.ts';
import { createEngine } from '../index.ts';
import { fileLoader } from '../corpus/loaders.ts';
import type { Source } from '../retrieve/gather.ts';

const corpus = await openTestCorpus();
const plan = (passages: string[], extra: Record<string, unknown> = {}) => ({ intent: 'passage', passages, contested: false, false_premise: false, search: '', ...extra });
const models = { strong: 'claude-opus-5-5', fast: 'claude-sonnet-5-5', grader: 'claude-sonnet-5-5' };
const src = (id: string): Source => ({ id, title: id, blocks: [`text of ${id}`], who: 'henry', work: 'mhcc', span: { bi: 44, c: 3, a: 21, b: 26 }, authorship: 'genuine', flags: [] });

test('ordinary work goes to the cheaper model with little thinking; judgment to the strongest', () => {
  assert.deepEqual(routeFor('answer', 'standard', models), { model: 'claude-sonnet-5-5', effort: 'low' });
  assert.deepEqual(routeFor('answer', 'hard', models), { model: 'claude-opus-5-5', effort: 'medium' });
  assert.equal(routeFor('repair', 'standard', models).model, 'claude-opus-5-5');
  assert.equal(routeFor('plan', 'standard', models).model, 'claude-sonnet-5-5');
  assert.equal(routeFor('grade', 'standard', models).effort, 'medium', 'judging paraphrase needs some thought');
  const p = jsonParams({ route: 'plan', system: 's', prompt: 'p', schema: {} }, models);
  assert.equal(p.output_config?.effort, 'low', 'effort is always set: Sonnet 5.5 would otherwise think at high');
});

test('sources come first with a cache marker, so a follow-up re-reads them from the cache', () => {
  const sources = [src('a'), src('b')];
  const first = citeParams({ route: 'answer', system: 'S', sources, question: 'Q1' }, models);
  const follow = citeParams({ route: 'answer', system: 'S', sources, question: 'Q2', history: [{ role: 'user', text: 'Q1' }, { role: 'assistant', text: 'A1' }] }, models);
  const blocks = (m: typeof first.messages[number]) => (Array.isArray(m.content) ? m.content : []);
  const results = (p: typeof first) => blocks(p.messages[0]).filter((b) => b.type === 'search_result');
  assert.deepEqual(JSON.stringify(results(first)), JSON.stringify(results(follow)), 'identical cached prefix');
  assert.ok('cache_control' in results(first)[1] && !('cache_control' in results(first)[0]), 'marker on the last source');
  assert.equal(follow.messages.length, 3);
  assert.equal(follow.messages[2].content, 'Q2');
  assert.ok(!('fallbacks' in first), 'fallbacks are added when sending, so batch requests can leave them out');
});

test('cost follows each model’s rates, cache reads at a twentieth of Opus input, batches at half', () => {
  const u = newUsage();
  addUsage(u, 'claude-sonnet-5-5', { input: 1_000_000, output: 100_000, cacheRead: 0, cacheWrite: 0 });
  assert.equal(costOf(u), 3);
  const v = newUsage();
  addUsage(v, 'claude-opus-5-5', { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0 });
  addUsage(v, 'claude-opus-5-5', { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0, batch: true });
  assert.equal(costOf(v), 0.2 + 2);
});

test('"read me Psalm 23" plays the passage with no model call', async () => {
  const model = mockAdapter();
  const r = await ask({ corpus, model }, { question: 'Read me Psalm 23' });
  assert.equal(r.status, 'command');
  assert.deepEqual(r.command, { type: 'play', refs: ['Psalm 23'] });
  const titled = await ask({ corpus, model }, { question: 'Play the Good Samaritan' });
  assert.deepEqual(titled.command?.refs, ['Luke 10:25–37']);
  const asked = await ask({ corpus, model }, { question: 'Read Romans 8 and tell me why there is no condemnation' });
  assert.notEqual(asked.status, 'command');
  assert.equal(model.calls.filter((c) => c.route !== 'plan').length, 1, 'only the real question reached the model');
});

test('a plain "what does this passage mean?" is answered once with the strongest model, then replayed free', async () => {
  const guides = memoryGuides();
  const first = mockAdapter();
  const a = await ask({ corpus, model: first, guides }, { question: 'What does Psalm 23 mean?' });
  assert.equal(a.guide, 'made');
  assert.equal(first.calls.find((c) => c.route === 'answer')?.tier, 'hard');
  const again = mockAdapter();
  const b = await ask({ corpus, model: again, guides }, { question: 'Explain Psalm 23' });
  assert.equal(b.guide, 'saved');
  assert.equal(again.calls.length, 0);
  assert.equal(b.text, a.text);
  const specific = mockAdapter();
  const c = await ask({ corpus, model: specific, guides }, { question: 'What does Psalm 23 say about death?' });
  assert.equal(c.guide, undefined, 'a question about something in particular gets its own answer');
  assert.equal(specific.calls.find((x) => x.route === 'answer')?.tier, 'standard');
});

test('"what does this mean?" while listening reads what is playing, without planning', async () => {
  const model = mockAdapter();
  const r = await ask({ corpus, model }, { question: 'What does this mean?', context: { refs: ['Romans 8:28-30'] } });
  assert.ok(r.passages[0].startsWith('Romans 8'), r.passages.join(', '));
  assert.ok(!model.calls.some((c) => c.route === 'plan'));
});

test('a follow-up sends exactly the sources of the question before it', async () => {
  const model = mockAdapter();
  const q1 = 'What does James 2:14-26 say about dead faith?';
  const first = await ask({ corpus, model }, { question: q1 });
  const second = await ask({ corpus, model }, {
    question: 'Are you sure?',
    history: [{ role: 'user', text: q1 }, { role: 'assistant', text: first.text, refs: first.passages }],
  });
  const sent = model.calls.filter((c) => c.route === 'answer').map((c) => JSON.stringify(c.sources));
  assert.equal(sent.length, 2);
  assert.equal(sent[0], sent[1]);
  assert.deepEqual(second.passages, first.passages);
  assert.ok(!model.calls.some((c) => c.route === 'plan'));
});

test('the double-check runs only where it is needed, and reads only what the answer used', async () => {
  const plain = mockAdapter({ json: { plan: plan(['Romans 3:21-26']) } });
  await ask({ corpus, model: plain }, { question: 'What does Romans 3:24 mean by redemption?' });
  assert.ok(!plain.calls.some((c) => c.route === 'grade'));
  const contested = mockAdapter({ json: { plan: plan(['Romans 3:21-26'], { contested: true }) } });
  const r = await ask({ corpus, model: contested }, { question: 'Is justification by faith alone?' });
  const grade = contested.calls.find((c) => c.route === 'grade');
  assert.ok(grade, 'contested answers are graded');
  assert.equal(contested.calls.find((c) => c.route === 'answer')?.tier, 'hard');
  const listed = (grade!.prompt!.match(/^\[[a-z]+:/gm) ?? []).length;
  assert.ok(listed > 0 && listed < r.sources.length, `${listed} of ${r.sources.length} sources sent to the grader`);
});

test('the engine adds each answer’s cost to the day, and past the limit answers for free', async () => {
  const inner = mockAdapter();
  const usage = newUsage();
  const model: ModelAdapter = {
    usage,
    json: (req) => inner.json(req),
    cite: async (req) => { addUsage(usage, 'claude-sonnet-5-5', { input: 10_000, output: 1_000, cacheRead: 0, cacheWrite: 0 }); return inner.cite(req); },
  };
  const engine = await createEngine({ loader: fileLoader(CORPUS_DIR), model, dailyBudgetUsd: 0.05 });
  const a = await engine.ask({ question: 'What does Romans 3:24 mean by redemption?' });
  assert.equal(Number(a.costUsd?.toFixed(4)), 0.03);
  await engine.ask({ question: 'What does James 2:17 mean by dead faith?' });
  const capped = await engine.ask({ question: 'What does John 3:16 mean by eternal life?' });
  assert.equal(capped.status, 'fallback');
  assert.ok(capped.notes.some((n) => /spending limit/.test(n)));
  assert.equal(capped.costUsd, 0);
});

test('guides made ahead in a batch pass the same checks and are stored like live ones', async () => {
  const guides = memoryGuides();
  const { requests, saved, unusable } = await recordGuideRequests({ corpus, refs: ['Psalm 23', 'John 3:1-21', 'Hezekiah 4'], guides });
  assert.deepEqual(requests.map((r) => r.ref), ['Psalm 23', 'John 3:1-21']);
  assert.deepEqual(unusable, ['Hezekiah 4']);
  assert.equal(saved.length, 0);
  assert.ok(requests.every((r) => r.req.tier === 'hard' && r.req.sources.length > 0));
  // Stand-in for the batch: the mock answers each recorded request.
  const batch = mockAdapter();
  const answers = new Map(await Promise.all(requests.map(async (r) => [r.id, await batch.cite(r.req)] as const)));
  const live = mockAdapter();
  const { made, failed } = await replayGuides({ corpus, requests, answers, guides, live });
  assert.deepEqual(made, ['Psalm 23', 'John 3:1-21']);
  assert.deepEqual(failed, []);
  assert.equal(live.calls.length, 0, 'no live calls were needed');
  const again = await recordGuideRequests({ corpus, refs: ['Psalm 23'], guides });
  assert.deepEqual(again.saved, ['Psalm 23'], 'a stored guide is not made twice');
  const served = await ask({ corpus, model: mockAdapter(), guides }, { question: 'What does Psalm 23 mean?' });
  assert.equal(served.guide, 'saved');
});
