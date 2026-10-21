// Making study guides ahead of time, for the Message Batches API at half price. Each passage's
// answer request is recorded by running the normal pipeline up to its answer call, the requests
// go out as one batch, and the answers are replayed through the same pipeline, so a
// precomputed guide passes every check a live one does and is stored the same way.

import type { Corpus } from '../corpus/store.ts';
import type { Speaker } from '../corpus/sources.ts';
import type { CitedAnswer, CiteRequest, ModelAdapter } from '../model/types.ts';
import { ask } from './ask.ts';
import type { GuideStore } from './guides.ts';

export interface GuideRequest { id: string; ref: string; req: CiteRequest }

const guideQuestion = (ref: string) => `What does ${ref} mean?`;

// A model that answers nothing: it records the answer request and stops the pipeline there.
class Stop extends Error {}

export async function recordGuideRequests(opts: { corpus: Corpus; refs: string[]; speaker?: Speaker; guides: GuideStore }) {
  const requests: GuideRequest[] = [];
  const saved: string[] = [];
  const unusable: string[] = [];
  for (const [i, ref] of opts.refs.entries()) {
    let recorded: CiteRequest | undefined;
    const recorder: ModelAdapter = {
      json: async () => { throw new Stop(); },
      cite: async (req) => { recorded = req; throw new Stop(); },
    };
    const r = await ask({ corpus: opts.corpus, model: recorder, guides: opts.guides }, { question: guideQuestion(ref), speaker: opts.speaker });
    if (r.guide === 'saved') saved.push(ref);
    else if (recorded?.route === 'answer') requests.push({ id: `guide-${i}`, ref, req: recorded });
    else unusable.push(ref);
  }
  return { requests, saved, unusable };
}

// Runs each passage through the pipeline again with the batch's answer in place of a live call.
// A repair or a grading call, which few guides need, goes to the live model at full price.
export async function replayGuides(opts: { corpus: Corpus; requests: GuideRequest[]; answers: Map<string, CitedAnswer>; speaker?: Speaker; guides: GuideStore; live: ModelAdapter }) {
  const made: string[] = [];
  const failed: string[] = [];
  for (const g of opts.requests) {
    const answer = opts.answers.get(g.id);
    const replay: ModelAdapter = {
      json: (req) => opts.live.json(req),
      cite: async (req) => {
        if (req.route !== 'answer') return opts.live.cite(req);
        if (!answer) throw new Error(`No batch answer for ${g.ref}`);
        return answer;
      },
    };
    const r = await ask({ corpus: opts.corpus, model: replay, guides: opts.guides }, { question: guideQuestion(g.ref), speaker: opts.speaker });
    (r.guide === 'made' ? made : failed).push(g.ref);
  }
  return { made, failed };
}
