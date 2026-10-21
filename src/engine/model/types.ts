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
}

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
}

// The model declined. Margin answers with Scripture and a verified note instead.
export class ModelRefusal extends Error {
  readonly category: string | null;

  constructor(category: string | null) {
    super(`Model declined${category ? ` (${category})` : ''}`);
    this.category = category;
  }
}
