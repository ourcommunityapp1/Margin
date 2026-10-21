// The engine talks to a model only through this interface, so the same pipeline runs on the
// Claude API (server), the artifact's in-page Claude (browser) and a deterministic mock (tests).

import type { Source } from '../retrieve/gather.ts';

export type JsonRoute = 'plan' | 'grade' | 'playlist';

export interface JsonRequest {
  route: JsonRoute;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
  tier?: Tier;
}

// How hard a question is. Ordinary ones go to a cheaper model with little thinking; contested,
// premise-checking, persona and repair work goes to the strongest model.
export type Tier = 'standard' | 'hard';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  // On an answer: the passages it read, so "Are you sure?" stays on the same text.
  refs?: string[];
}

export interface CiteRequest {
  route: 'answer' | 'repair';
  system: string;
  sources: Source[];
  // The listener's question plus Margin's notes, sent after the sources.
  question: string;
  history?: Turn[];
  signal?: AbortSignal;
  tier?: Tier;
}

export interface Citation {
  // Index of the source in CiteRequest.sources.
  sourceIndex: number;
  sourceId: string;
  // The exact source text the citation points at.
  citedText: string;
}

export interface CitedBlock {
  text: string;
  citations: Citation[];
}

export interface CitedAnswer {
  blocks: CitedBlock[];
  model?: string;
}

export interface ModelAdapter {
  json<T>(req: JsonRequest): Promise<T>;
  cite(req: CiteRequest): Promise<CitedAnswer>;
  // Running token totals, where the adapter can count them (the Claude API adapter does).
  usage?: Usage;
}

export interface TokenCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  batch?: boolean;
}

export interface Usage {
  calls: number;
  // Keyed by the model that served the call, which a fallback can change.
  byModel: Record<string, TokenCounts>;
}

export const newUsage = (): Usage => ({ calls: 0, byModel: {} });

export function addUsage(u: Usage, model: string, t: TokenCounts): void {
  const key = t.batch ? `${model} (batch)` : model;
  const m = (u.byModel[key] ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, batch: t.batch });
  u.calls++;
  m.input += t.input; m.output += t.output; m.cacheRead += t.cacheRead; m.cacheWrite += t.cacheWrite;
}

// The model declined. Margin answers with Scripture and a verified note instead.
export class ModelRefusal extends Error {
  readonly category: string | null;

  constructor(category: string | null) {
    super(`Model declined${category ? ` (${category})` : ''}`);
    this.category = category;
  }
}
