// Server wiring: one engine per process, reading the gzipped corpus from data/corpus and
// calling Claude with the API key in ANTHROPIC_API_KEY.

import path from 'node:path';
import { createEngine, type Engine } from './index.ts';
import { fileLoader } from './corpus/loaders.ts';
import { anthropicAdapter } from './model/anthropic.ts';

let engine: Promise<Engine> | undefined;

export function serverEngine(): Promise<Engine> {
  engine ??= createEngine({
    loader: fileLoader(path.join(process.cwd(), 'data/corpus')),
    model: anthropicAdapter(),
    search: true,
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
