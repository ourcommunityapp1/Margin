// Runs the eval set through the engine and scores it.
//
//   node src/engine/eval/run.ts                 mock model: checks the plumbing, costs nothing
//   node src/engine/eval/run.ts --live          Claude API (needs ANTHROPIC_API_KEY); spends credit
//   options: --limit 20  --category contested  --concurrency 4  --out evals/results/run.json
//   compare two runs on the same items:  node src/engine/eval/run.ts --compare a.json b.json
//
// Rerun after every prompt change and every model upgrade, and add real failures as new items.

import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../index.ts';
import { fileLoader } from '../corpus/loaders.ts';
import { anthropicAdapter } from '../model/anthropic.ts';
import { mockAdapter } from '../model/mock.ts';
import type { AskResult } from '../pipeline/ask.ts';
import type { Usage } from '../model/types.ts';
import { costOf } from '../model/pricing.ts';
import { grade, wilson, type Check, type EvalItem } from './graders.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

interface Row { id: string; category: string; ms: number; result: AskResult; followup?: AskResult; checks: Check[]; pass: boolean }

async function compare(a: string, b: string) {
  const load = async (p: string) => new Map((JSON.parse(await readFile(p, 'utf8')).rows as Row[]).map((r) => [r.id, r.pass]));
  const [x, y] = await Promise.all([load(a), load(b)]);
  let fixed = 0, broke = 0, both = 0;
  const changed: string[] = [];
  for (const [id, pa] of x) {
    if (!y.has(id)) continue;
    both++;
    const pb = y.get(id)!;
    if (!pa && pb) { fixed++; changed.push(`+ ${id}`); }
    if (pa && !pb) { broke++; changed.push(`- ${id}`); }
  }
  console.log(`${both} shared items: ${fixed} newly passing, ${broke} newly failing`);
  console.log(changed.join('\n'));
}

// Tokens by model and what they cost at published rates.
function usageLine(u: Usage, items: number): string {
  const models = Object.entries(u.byModel).map(([m, t]) => `${m}: ${t.input + t.cacheRead + t.cacheWrite} in (${t.cacheRead} cached), ${t.output} out`).join('; ');
  const usd = costOf(u);
  return `- Tokens over ${u.calls} calls: ${models || 'none'}\n- Cost: about $${usd.toFixed(2)}, ${((usd / Math.max(1, items)) * 100).toFixed(1)}¢ per item`;
}

async function main() {
  if (flag('compare')) return compare(args[args.indexOf('--compare') + 1], args[args.indexOf('--compare') + 2]);
  const live = flag('live');
  if (live && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error('Set ANTHROPIC_API_KEY to run against Claude, or run without --live to use the mock model.');
    process.exit(1);
  }
  const lines = (await readFile(path.join(here, 'dataset.jsonl'), 'utf8')).split('\n').filter((l) => l.trim());
  let items: EvalItem[] = lines.map((l) => JSON.parse(l));
  if (opt('category')) items = items.filter((i) => i.category === opt('category'));
  if (opt('limit')) items = items.slice(0, Number(opt('limit')));

  const model = live ? anthropicAdapter() : mockAdapter();
  const engine = await createEngine({ loader: fileLoader(path.join(root, 'data/corpus')), model, search: true });
  const vs = engine.corpus.versification;
  const rows: Row[] = [];
  // Items run a few at a time (--concurrency 4) so a live run takes minutes, not an hour.
  const queue = [...items];
  const run = async () => { for (let item = queue.shift(); item; item = queue.shift()) await runItem(item); };
  const runItem = async (item: EvalItem) => {
    const t0 = Date.now();
    const input = { question: item.question, speaker: item.persona ?? 'host', context: item.context } as const;
    const result = await engine.ask(input);
    let followup: AskResult | undefined;
    if (item.followup) {
      followup = await engine.ask({ ...input, question: item.followup, history: [{ role: 'user', text: item.question }, { role: 'assistant', text: result.text, refs: result.passages }] });
    }
    const judged = followup ?? result;
    const checks = grade(item, judged, vs);
    const row: Row = { id: item.id, category: item.category, ms: Date.now() - t0, result, followup, checks, pass: checks.every((c) => c.pass) };
    rows.push(row);
    process.stdout.write(`${row.pass ? '✓' : '✗'} ${item.id} ${judged.status} ${row.ms}ms${row.pass ? '' : '  ' + checks.filter((c) => !c.pass).map((c) => c.name).join(', ')}\n`);
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(opt('concurrency') ?? 1)) }, run));
  rows.sort((a, b) => items.findIndex((i) => i.id === a.id) - items.findIndex((i) => i.id === b.id));

  const byCat = new Map<string, Row[]>();
  for (const r of rows) byCat.set(r.category, [...(byCat.get(r.category) ?? []), r]);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const line = (label: string, rs: Row[]) => {
    const p = rs.filter((r) => r.pass).length;
    const [lo, hi] = wilson(p, rs.length);
    return `| ${label} | ${p}/${rs.length} | ${pct(p / (rs.length || 1))} | ${pct(lo)}–${pct(hi)} |`;
  };
  const answers = rows.map((r) => r.followup ?? r.result);
  const quotes = answers.flatMap((a) => a.quotes);
  const summary = [
    `# Margin eval — ${live ? 'live (Claude API)' : 'mock model'} — ${new Date().toISOString()}`,
    '',
    '| Category | Passed | Rate | 95% interval |', '|---|---|---|---|',
    ...[...byCat].map(([k, rs]) => line(k, rs)),
    line('**all**', rows),
    '',
    `- Quotations verified: ${quotes.filter((q) => q.ok).length}/${quotes.length}`,
    `- Planner references that didn't exist: ${answers.reduce((n, a) => n + a.invalidRefs.length, 0)}`,
    `- Fallback answers: ${answers.filter((a) => a.status === 'fallback').length}; errors: ${answers.filter((a) => a.status === 'error').length}`,
    `- Answers needing a repair round: ${answers.filter((a) => a.attempts > 1).length}`,
    `- Median time per item: ${rows.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)] ?? 0} ms`,
    model.usage ? usageLine(model.usage, rows.length) : '',
    live ? '' : '\nMock mode checks the pipeline, not answer quality. Run with --live for real scores.',
  ].join('\n');
  console.log('\n' + summary);
  const out = opt('out') ?? path.join(root, 'evals/results', `${live ? 'live' : 'mock'}-${Date.now()}.json`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify({ live, summary, rows }, null, 1));
  await writeFile(out.replace(/\.json$/, '.md'), summary + '\n');
  console.log(`\nSaved ${path.relative(root, out)}`);
}

await main();
