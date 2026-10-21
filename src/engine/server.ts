// Server wiring: one engine per process, reading the gzipped corpus from data/corpus and
// calling Claude with the API key in ANTHROPIC_API_KEY.

import path from 'node:path';
import { createEngine, type Engine } from './index.ts';
import { fileLoader } from './corpus/loaders.ts';
import { anthropicAdapter } from './model/anthropic.ts';
import { fileGuides } from './pipeline/guides.ts';
import { fileSpend } from './pipeline/spend.ts';

let engine: Promise<Engine> | undefined;

// Study guides and the day's spending are kept under MARGIN_DATA_DIR (default: the system's
// temporary folder, which a serverless host may clear; point it at lasting storage to keep them).
// MARGIN_DAILY_BUDGET_USD caps what questions can spend in a day (default $2).
export function serverEngine(): Promise<Engine> {
  const dir = process.env.MARGIN_DATA_DIR ?? path.join(process.env.TMPDIR ?? '/tmp', 'margin');
  const limit = Number(process.env.MARGIN_DAILY_BUDGET_USD ?? 2);
  engine ??= createEngine({
    loader: fileLoader(path.join(process.cwd(), 'data/corpus')),
    model: anthropicAdapter(),
    search: true,
    guides: fileGuides(path.join(dir, 'guides')),
    dailyBudgetUsd: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    spend: fileSpend(path.join(dir, 'spend.json')),
  });
  engine.catch(() => { engine = undefined; });
  return engine;
}

// The routes spend API credit, so a deployed copy must be locked with MARGIN_API_TOKEN.
// Locally (next dev) they stay open for convenience.
export function authorize(request: Request): Response | null {
  const token = process.env.MARGIN_API_TOKEN;
  if (!token) {
    return process.env.NODE_ENV === 'production'
      ? Response.json({ error: 'Set MARGIN_API_TOKEN to enable the study API.' }, { status: 503 })
      : null;
  }
  return request.headers.get('authorization') === `Bearer ${token}` ? null : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
