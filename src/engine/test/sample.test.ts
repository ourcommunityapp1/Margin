import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestCorpus } from './helpers.ts';
import { ask } from '../pipeline/ask.ts';
import { sampleAdapter, type SampleFn } from '../model/sample.ts';

const corpus = await openTestCorpus();

test('the artifact adapter turns tagged pieces into citations the verifier checks', async () => {
  const prompts: string[] = [];
  const steps: string[] = [];
  const sample: SampleFn = {
    async json(input) {
      const p = String(input);
      prompts.push(p);
      if (p.includes('"intent"')) return { intent: 'passage', passages: ['Romans 3:21-26'], contested: false, false_premise: false, search: '' };
      if (p.includes('"claims"')) return { claims: [], takes_side: false, one_sided: false, self_help: false };
      return { answer: [
        { text: 'Paul says all who believe', sources: [] },
        { text: '"are justified freely by His grace through the redemption that is in Christ Jesus."', sources: ['S1.4'] },
        { text: 'The commentary that bears Henry’s name asks, "Must guilty man remain under wrath?"', sources: ['S2.1'] },
      ] };
    },
  };
  const r = await ask({ corpus, model: sampleAdapter(sample) }, { question: 'What does Romans 3:24 mean?', onStep: (s) => steps.push(s) });
  assert.equal(r.status, 'answered', JSON.stringify(r.checks?.problems));
  assert.equal(r.quotes.filter((q) => q.ok).length, 2);
  assert.ok(r.quotes.every((q) => q.cited));
  assert.ok(prompts[1].includes('[S1.1]') && prompts[1].includes('</search_results>'));
  assert.deepEqual(steps.slice(0, 2), ['Choosing passages…', 'Reading Romans 3:24…']);
  assert.ok(r.passages[0] === 'Romans 3:21–26', 'the named verse is read with its paragraph');
});
