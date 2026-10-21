// Makes study guides ahead of time through Anthropic's Message Batches API, at half price.
//
//   node scripts/precompute-guides.ts "Psalm 23" "Romans 8:28-39"      estimate only; sends nothing
//   node scripts/precompute-guides.ts --file refs.txt --yes              send the batch and store guides
//   options: --speaker henry   (a commentator's guides; default: the host)
//
// Needs ANTHROPIC_API_KEY. Guides are stored where the app reads them: MARGIN_DATA_DIR/guides.
// Most batches finish within an hour; the script waits and then stores what passed the checks.

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import { Corpus } from '../src/engine/corpus/store.ts';
import { fileLoader } from '../src/engine/corpus/loaders.ts';
import { isPersona, type Speaker } from '../src/engine/corpus/sources.ts';
import { anthropicAdapter, citeParams, modelsFrom, readCite, tokensOf } from '../src/engine/model/anthropic.ts';
import { costOf, ratesFor } from '../src/engine/model/pricing.ts';
import { addUsage, newUsage, type CitedAnswer } from '../src/engine/model/types.ts';
import { fileGuides } from '../src/engine/pipeline/guides.ts';
import { recordGuideRequests, replayGuides } from '../src/engine/pipeline/precompute.ts';

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['--file', '--speaker']);
const refs = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (opt('file')) refs.push(...(await readFile(opt('file')!, 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean));
const speaker = (opt('speaker') && isPersona(opt('speaker')!) ? opt('speaker') : 'host') as Speaker;
if (!refs.length) {
  console.error('Name passages to prepare, e.g. node scripts/precompute-guides.ts "Psalm 23" "John 3:1-21"');
  process.exit(1);
}

const corpus = await Corpus.open(fileLoader(path.resolve('data/corpus')));
const dir = process.env.MARGIN_DATA_DIR ?? path.join(process.env.TMPDIR ?? '/tmp', 'margin');
const guides = fileGuides(path.join(dir, 'guides'));
const models = modelsFrom();

const { requests, saved, unusable } = await recordGuideRequests({ corpus, refs, speaker, guides });
if (saved.length) console.log(`Already saved: ${saved.join(', ')}`);
if (unusable.length) console.log(`Not a single passage Margin can explain: ${unusable.join(', ')}`);

// An estimate from the size of each request (about 3.5 characters a token) and a typical
// answer with its thinking (about 1,500 tokens out), at half the strong model's rates.
const rates = ratesFor(models.strong);
const estimate = requests.reduce((usd, g) => usd + (JSON.stringify(citeParams(g.req, models)).length / 3.5 * rates.input + 1500 * rates.output) / 1e6 / 2, 0);
console.log(`${requests.length} guide${requests.length === 1 ? '' : 's'} to make with ${models.strong}: about $${estimate.toFixed(2)} at batch prices.`);
if (!requests.length) process.exit(0);
if (!args.includes('--yes')) {
  console.log('Nothing sent. Run again with --yes to make them.');
  process.exit(0);
}

const client = new Anthropic();
const batch = await client.beta.messages.batches.create({
  requests: requests.map((g) => ({ custom_id: g.id, params: citeParams(g.req, models) })),
});
console.log(`Batch ${batch.id} sent; waiting for it to finish (usually under an hour).`);
let status = batch;
while (status.processing_status !== 'ended') {
  await new Promise((resolve) => setTimeout(resolve, 60_000));
  status = await client.beta.messages.batches.retrieve(batch.id);
  console.log(`  ${status.request_counts.succeeded} done, ${status.request_counts.processing} working, ${status.request_counts.errored} failed`);
}

const usage = newUsage();
const answers = new Map<string, CitedAnswer>();
for await (const item of await client.beta.messages.batches.results(batch.id)) {
  if (item.result.type !== 'succeeded') continue;
  const g = requests.find((r) => r.id === item.custom_id);
  if (!g || item.result.message.stop_reason === 'refusal') continue;
  addUsage(usage, item.result.message.model, tokensOf(item.result.message, true));
  answers.set(g.id, readCite(item.result.message, g.req));
}

const live = anthropicAdapter();
const { made, failed } = await replayGuides({ corpus, requests, answers, speaker, guides, live });
console.log(`Made ${made.length}: ${made.join(', ') || 'none'}`);
if (failed.length) console.log(`Didn't pass the checks, so not saved: ${failed.join(', ')}`);
console.log(`Spent about $${(costOf(usage) + (live.usage ? costOf(live.usage) : 0)).toFixed(2)}.`);
