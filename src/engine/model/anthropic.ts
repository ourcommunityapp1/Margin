// The Claude API adapter. Answers use search-result blocks with citations, so every cited span
// is guaranteed to point at text Margin supplied; plans, grades and playlists use JSON outputs
// (citations and structured outputs can't share a request).
//
// Cost shapes the design: the strongest model only where judgment matters, the least thinking
// that does the job, and the sources placed first and marked for caching, so a follow-up about
// the same passage re-reads them at a twentieth of the price.

import Anthropic from '@anthropic-ai/sdk';
import type { CitedAnswer, CiteRequest, JsonRequest, JsonRoute, ModelAdapter, Tier } from './types.ts';
import { addUsage, ModelRefusal, newUsage } from './types.ts';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicOptions {
  client?: Anthropic;
  // MARGIN_MODEL (hard questions, playlists), MARGIN_FAST_MODEL (everything else) and
  // MARGIN_GRADER_MODEL override these.
  model?: string;
  fastModel?: string;
  graderModel?: string;
}

const STRONG_MODEL = 'claude-opus-5-5';
const FAST_MODEL = 'claude-sonnet-5-5';

// Spoken answers are short; little thinking keeps them quick for a listener in the car.
// (Sonnet 5.5 defaults to high effort, so every call sets it.)
const EFFORT: Record<JsonRoute | 'answer' | 'repair', Record<Tier, Effort>> = {
  plan: { standard: 'low', hard: 'low' },
  grade: { standard: 'low', hard: 'medium' },
  playlist: { standard: 'medium', hard: 'medium' },
  answer: { standard: 'low', hard: 'medium' },
  repair: { standard: 'medium', hard: 'medium' },
};

// Server-side fallback reroutes a declined request to another model inside the same call.
// The Batches API rejects it, so batch requests are built without it.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface Models { strong: string; fast: string; grader: string }

export function modelsFrom(opts: AnthropicOptions = {}): Models {
  const env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};
  const strong = opts.model ?? env.MARGIN_MODEL ?? STRONG_MODEL;
  const fast = opts.fastModel ?? env.MARGIN_FAST_MODEL ?? FAST_MODEL;
  return { strong, fast, grader: opts.graderModel ?? env.MARGIN_GRADER_MODEL ?? fast };
}

// Which model and effort a call gets.
export function routeFor(route: JsonRoute | 'answer' | 'repair', tier: Tier, m: Models): { model: string; effort: Effort } {
  const model = route === 'grade' ? m.grader
    : route === 'playlist' || route === 'repair' || (route === 'answer' && tier === 'hard') ? m.strong
    : m.fast;
  return { model, effort: EFFORT[route][tier] };
}

export function jsonParams(req: JsonRequest, m: Models): Anthropic.Beta.MessageCreateParamsNonStreaming {
  const { model, effort } = routeFor(req.route, req.tier ?? 'standard', m);
  return {
    model,
    max_tokens: 8000,
    system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: req.prompt }],
    output_config: { effort, format: { type: 'json_schema', schema: req.schema } },
  };
}

// The sources come first, in the first user turn, with a cache marker on the last one. A
// follow-up about the same passage sends the same sources in the same place, so everything up
// to that marker is read from the cache; the conversation and the new question follow.
export function citeParams(req: CiteRequest, m: Models): Anthropic.Beta.MessageCreateParamsNonStreaming {
  const { model, effort } = routeFor(req.route, req.tier ?? 'standard', m);
  const results: Anthropic.Beta.BetaSearchResultBlockParam[] = req.sources.map((s, i) => ({
    type: 'search_result',
    source: s.id,
    title: s.title,
    content: s.blocks.map((text) => ({ type: 'text', text })),
    citations: { enabled: true },
    ...(i === req.sources.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const history = req.history ?? [];
  const threaded = history.length > 0 && history[0].role === 'user';
  const messages: Anthropic.Beta.BetaMessageParam[] = threaded
    ? [
        { role: 'user', content: [...results, { type: 'text', text: history[0].text }] },
        ...history.slice(1).map((t): Anthropic.Beta.BetaMessageParam => ({ role: t.role, content: t.text })),
        { role: 'user', content: req.question },
      ]
    : [...history.map((t): Anthropic.Beta.BetaMessageParam => ({ role: t.role, content: t.text })), { role: 'user', content: [...results, { type: 'text', text: req.question }] }];
  return {
    model,
    max_tokens: 16000,
    system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort },
    messages,
  };
}

// Maps a cited response back to Margin's sources.
export function readCite(msg: Anthropic.Beta.BetaMessage, req: CiteRequest): CitedAnswer {
  const index = new Map(req.sources.map((s, i) => [s.id, i]));
  const blocks: CitedAnswer['blocks'] = [];
  for (const b of msg.content) {
    if (b.type !== 'text') continue;
    const citations = (b.citations ?? []).flatMap((c) => c.type === 'search_result_location'
      ? [{ sourceIndex: index.get(c.source) ?? c.search_result_index, sourceId: c.source, citedText: c.cited_text }]
      : []);
    blocks.push({ text: b.text, citations });
  }
  return { blocks, model: msg.model };
}

export const tokensOf = (msg: Anthropic.Beta.BetaMessage, batch = false) => ({
  input: msg.usage.input_tokens,
  output: msg.usage.output_tokens,
  cacheRead: msg.usage.cache_read_input_tokens ?? 0,
  cacheWrite: msg.usage.cache_creation_input_tokens ?? 0,
  batch,
});

export function anthropicAdapter(opts: AnthropicOptions = {}): ModelAdapter {
  const client = opts.client ?? new Anthropic();
  const m = modelsFrom(opts);
  const usage = newUsage();
  const check = (msg: Anthropic.Beta.BetaMessage) => {
    addUsage(usage, msg.model, tokensOf(msg));
    if (msg.stop_reason === 'refusal') throw new ModelRefusal(msg.stop_details?.category ?? null);
  };
  const send = (params: Anthropic.Beta.MessageCreateParamsNonStreaming, signal?: AbortSignal) =>
    client.beta.messages.create({ ...params, betas: [FALLBACK_BETA], fallbacks: 'default' }, { signal });

  return {
    usage,
    async json<T>(req: JsonRequest): Promise<T> {
      const msg = await send(jsonParams(req, m), req.signal);
      check(msg);
      const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
      return JSON.parse(text) as T;
    },

    async cite(req: CiteRequest): Promise<CitedAnswer> {
      const msg = await send(citeParams(req, m), req.signal);
      check(msg);
      return readCite(msg, req);
    },
  };
}
