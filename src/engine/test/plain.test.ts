import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORPUS_DIR } from './helpers.ts';
import { createEngine } from '../index.ts';
import { fileLoader } from '../corpus/loaders.ts';
import { mockAdapter } from '../model/mock.ts';
import { modelsFrom, routeFor } from '../model/anthropic.ts';
import { addUsage, newUsage, type ModelAdapter } from '../model/types.ts';
import { memoryPlain, plainWords } from '../pipeline/plain.ts';
import { OverBudget } from '../pipeline/spend.ts';

const NOTE = 'Whatever good there is in us, it is not of ourselves; it is the gift of God, and the effect of his power. Faith itself is his gift. […]';

test('plain words go to the cheaper model with little thinking', () => {
  const models = modelsFrom({});
  assert.deepEqual(routeFor('plain', 'standard', models), { model: 'claude-sonnet-5-5', effort: 'low' });
});

test('a note is put into plain words once, naming its writer, and kept', async () => {
  const model = mockAdapter();
  const store = memoryPlain();
  const first = await plainWords({ model, store }, { who: 'henry', text: NOTE, ref: 'Ephesians 2:8–10' });
  assert.ok(!first.saved && first.text.length > 0);
  const prompt = model.calls[0].prompt ?? '';
  assert.match(prompt, /^Writer: Matthew Henry \(English Presbyterian \(Puritan\), 1662–1714\), on Ephesians 2:8–10/);
  assert.ok(!prompt.includes('[…]'), 'the mark of a shortened note isn’t sent');
  const again = await plainWords({ model, store }, { who: 'henry', text: `${NOTE.replace(/ /g, '  ')}`, ref: 'Ephesians 2:8–10' });
  assert.ok(again.saved && again.text === first.text);
  assert.equal(model.calls.length, 1);
  const other = await plainWords({ model, store }, { who: 'augustine', text: NOTE });
  assert.ok(!other.saved, 'the same words from another writer are another note');
});

test('plain words count against the day’s limit, and wait for tomorrow past it', async () => {
  const inner = mockAdapter();
  const usage = newUsage();
  const model: ModelAdapter = {
    usage,
    json: async (req) => { addUsage(usage, 'claude-sonnet-5-5', { input: 10_000, output: 1_000, cacheRead: 0, cacheWrite: 0 }); return inner.json(req); },
    cite: (req) => inner.cite(req),
  };
  const engine = await createEngine({ loader: fileLoader(CORPUS_DIR), model, dailyBudgetUsd: 0.05 });
  await engine.plain({ who: 'henry', text: NOTE });
  await engine.plain({ who: 'spurgeon', text: NOTE });
  const kept = await engine.plain({ who: 'henry', text: NOTE });
  assert.ok(kept.saved);
  await assert.rejects(engine.plain({ who: 'chrysostom', text: NOTE }), OverBudget);
});
