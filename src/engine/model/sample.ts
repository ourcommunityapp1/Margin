// Adapter for Claude inside a published Claude artifact (the `sample` capability). It has no
// system prompt and no citations API, so the answer comes back as JSON pieces that name the
// numbered source blocks they rely on; the same verifier then checks them.

import type { CitedAnswer, CiteRequest, JsonRequest, ModelAdapter } from './types.ts';
import { ModelRefusal } from './types.ts';

// The shape of `await claude.use("sample")`, reduced to what Margin calls.
export interface SampleFn {
  json(input: string | { role: 'user' | 'assistant'; content: string }[], options?: { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal; cache?: boolean }): Promise<unknown>;
}

interface Piece { text: string; sources: string[] }

const FORMAT = `Reply with only JSON in this shape:
{"answer": [{"text": "one sentence or a short run of sentences", "sources": ["S2.1"]}]}
Split the answer into pieces in reading order. "sources" lists the numbered blocks (like "S2.1", source 2, block 1) that a piece quotes or relies on; use [] for your own connecting words. Joined in order, the pieces' text must read as the finished spoken answer.`;

export function sampleAdapter(sample: SampleFn): ModelAdapter {
  const wrap = async <T>(p: Promise<unknown>): Promise<T> => {
    try {
      return (await p) as T;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'refused') throw new ModelRefusal(null);
      throw e;
    }
  };

  return {
    json<T>(req: JsonRequest): Promise<T> {
      const prompt = `${req.system}\n\n${req.prompt}\n\nReply with only JSON that matches this JSON Schema:\n${JSON.stringify(req.schema)}`;
      return wrap<T>(sample.json(prompt, { modelTier: req.route === 'plan' ? 'quick' : 'default', signal: req.signal, cache: req.route === 'plan' }));
    },

    async cite(req: CiteRequest): Promise<CitedAnswer> {
      const listing = req.sources.map((s, i) => `<source id="S${i + 1}" title="${s.title.replace(/"/g, '\'')}">\n${s.blocks.map((b, j) => `[S${i + 1}.${j + 1}] ${b}`).join('\n')}\n</source>`).join('\n\n');
      const history = (req.history ?? []).map((t) => `${t.role === 'user' ? 'Listener' : 'Margin'}: ${t.text}`).join('\n');
      const prompt = `${req.system}\n\n<search_results>\n${listing}\n</search_results>\n\n${history ? `Conversation so far:\n${history}\n\n` : ''}${req.question}\n\n${FORMAT}`;
      const res = await wrap<{ answer?: Piece[] }>(sample.json(prompt, { modelTier: 'default', signal: req.signal, cache: false }));
      const blocks: CitedAnswer['blocks'] = [];
      for (const p of Array.isArray(res?.answer) ? res.answer : []) {
        if (!p || typeof p.text !== 'string') continue;
        const citations = (Array.isArray(p.sources) ? p.sources : []).flatMap((ref) => {
          const m = /^S(\d+)(?:\.(\d+))?$/.exec(String(ref).trim());
          const i = m ? Number(m[1]) - 1 : -1;
          const s = req.sources[i];
          if (!s) return [];
          const j = m![2] ? Number(m![2]) - 1 : -1;
          return [{ sourceIndex: i, sourceId: s.id, citedText: s.blocks[j] ?? s.blocks.join(' ') }];
        });
        // Pieces are joined with a space unless the model already ended one with whitespace.
        blocks.push({ text: /\s$/.test(p.text) ? p.text : p.text + ' ', citations });
      }
      return { blocks, model: 'claude (artifact)' };
    },
  };
}
