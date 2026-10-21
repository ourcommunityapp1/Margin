// A deterministic stand-in for Claude, used by tests and by the eval runner without an API key.
// It plans from references in the question, answers by quoting the first commentary source,
// and grades everything as supported. It exercises the pipeline, not answer quality.

import { findBook } from '../bible/canon.ts';
import type { Source } from '../retrieve/gather.ts';
import type { CitedAnswer, CiteRequest, JsonRequest, ModelAdapter, Tier } from './types.ts';

export interface MockOptions {
  // Override any route's JSON reply, or the answer, for a specific test.
  json?: Partial<Record<JsonRequest['route'], unknown>>;
  answer?: (req: CiteRequest) => CitedAnswer;
}

const REF_IN_TEXT = /\b((?:[123]\s?)?[A-Z][a-z]+)\.?\s(\d{1,3})(?::(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?)?/g;

interface Call { route: string; prompt?: string; tier?: Tier; sources?: Source[] }

export function mockAdapter(opts: MockOptions = {}): ModelAdapter & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async json<T>(req: JsonRequest): Promise<T> {
      calls.push({ route: req.route, prompt: req.prompt, tier: req.tier });
      if (opts.json?.[req.route] !== undefined) return opts.json[req.route] as T;
      if (req.route === 'plan') {
        const q = req.prompt.split('\nQuestion: ')[1]?.split('\n')[0] ?? '';
        const passages = [...q.matchAll(REF_IN_TEXT)].filter((m) => findBook(m[1]) >= 0).map((m) => m[0]);
        return { intent: passages.length ? 'passage' : 'topic', passages, contested: false, false_premise: false, search: '' } as T;
      }
      if (req.route === 'grade') return { claims: [], takes_side: false, one_sided: false, self_help: false } as T;
      if (req.route === 'plain') return { plain: `In short: ${req.prompt.split('<note>\n')[1]?.split(/(?<=[.!?])\s/)[0] ?? ''}` } as T;
      return { title: 'Study', description: '', contested: false, sessions: [] } as T;
    },
    async cite(req: CiteRequest): Promise<CitedAnswer> {
      calls.push({ route: req.route, prompt: req.question, tier: req.tier, sources: req.sources });
      if (opts.answer) return opts.answer(req);
      const scripture = req.sources.findIndex((s) => s.who === 'bsb' && s.blocks.length);
      const note = req.sources.findIndex((s) => s.who !== 'bsb' && s.blocks.length);
      const blocks: CitedAnswer['blocks'] = [{ text: 'Here is what the passage and its commentators say. ', citations: [] }];
      if (scripture >= 0) {
        const s = req.sources[scripture];
        blocks.push({ text: `The passage reads, "${s.blocks[0].replace(/^\d+\s/, '')}" `, citations: [{ sourceIndex: scripture, sourceId: s.id, citedText: s.blocks[0] }] });
      }
      if (note >= 0) {
        const s = req.sources[note];
        const first = s.blocks[0].split(/(?<=[.!?])\s/)[0];
        blocks.push({ text: `One commentator writes, "${first}" `, citations: [{ sourceIndex: note, sourceId: s.id, citedText: s.blocks[0] }] });
      }
      blocks.push({ text: 'A question to think about: what does this ask of you this week?', citations: [] });
      return { blocks, model: 'mock' };
    },
  };
}
