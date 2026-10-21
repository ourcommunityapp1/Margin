// The Claude API adapter. Answers use search-result blocks with citations, so every cited span
// is guaranteed to point at text Margin supplied; plans, grades and playlists use JSON outputs
// (citations and structured outputs can't share a request).

import Anthropic from '@anthropic-ai/sdk';
import type { CitedAnswer, CiteRequest, JsonRequest, JsonRoute, ModelAdapter, Usage } from './types.ts';
import { ModelRefusal } from './types.ts';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicOptions {
  client?: Anthropic;
  // One model for every route by default; MARGIN_MODEL and MARGIN_GRADER_MODEL override.
  model?: string;
  graderModel?: string;
  effort?: Partial<Record<JsonRoute | 'answer', Effort>>;
}

const DEFAULT_MODEL = 'claude-opus-5-5';

// Spoken answers are short, so moderate effort keeps latency down for a listener in the car.
const DEFAULT_EFFORT: Record<JsonRoute | 'answer', Effort> = { plan: 'low', answer: 'medium', grade: 'medium', playlist: 'medium' };

// Server-side fallback reroutes a declined request to another model inside the same call.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function anthropicAdapter(opts: AnthropicOptions = {}): ModelAdapter {
  const client = opts.client ?? new Anthropic();
  const env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};
  const model = opts.model ?? env.MARGIN_MODEL ?? DEFAULT_MODEL;
  const graderModel = opts.graderModel ?? env.MARGIN_GRADER_MODEL ?? model;
  const effort = { ...DEFAULT_EFFORT, ...opts.effort };

  const usage: Usage = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const check = (msg: Anthropic.Beta.BetaMessage) => {
    usage.calls++;
    usage.input += msg.usage.input_tokens;
    usage.output += msg.usage.output_tokens;
    usage.cacheRead += msg.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += msg.usage.cache_creation_input_tokens ?? 0;
    if (msg.stop_reason === 'refusal') throw new ModelRefusal(msg.stop_details?.category ?? null);
  };

  return {
    usage,
    async json<T>(req: JsonRequest): Promise<T> {
      const msg = await client.beta.messages.create({
        model: req.route === 'grade' ? graderModel : model,
        max_tokens: 8000,
        betas: [FALLBACK_BETA],
        fallbacks: 'default',
        system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: req.prompt }],
        output_config: { effort: effort[req.route], format: { type: 'json_schema', schema: req.schema } },
      }, { signal: req.signal });
      check(msg);
      const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
      return JSON.parse(text) as T;
    },

    async cite(req: CiteRequest): Promise<CitedAnswer> {
      const results: Anthropic.Beta.BetaSearchResultBlockParam[] = req.sources.map((s) => ({
        type: 'search_result',
        source: s.id,
        title: s.title,
        content: s.blocks.map((text) => ({ type: 'text', text })),
        citations: { enabled: true },
      }));
      const history: Anthropic.Beta.BetaMessageParam[] = (req.history ?? []).map((t) => ({ role: t.role, content: t.text }));
      const msg = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        betas: [FALLBACK_BETA],
        fallbacks: 'default',
        system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
        output_config: { effort: effort.answer },
        // Sources first and the question last, as Anthropic recommends for grounded answers.
        messages: [...history, { role: 'user', content: [...results, { type: 'text', text: req.question }] }],
      }, { signal: req.signal });
      check(msg);
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
    },
  };
}
