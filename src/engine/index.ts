// Margin's study engine: one object that answers questions, drafts playlists and builds
// listening sessions from the library. See src/engine/README.md for the design.

import { Corpus, type Loader } from './corpus/store.ts';
import { costOf } from './model/pricing.ts';
import type { ModelAdapter } from './model/types.ts';
import { ask, type AskInput, type AskResult } from './pipeline/ask.ts';
import { memoryGuides, type GuideStore } from './pipeline/guides.ts';
import { memorySpend, OverBudget, type SpendStore } from './pipeline/spend.ts';
import { memoryPlain, plainWords, type PlainInput, type PlainResult, type PlainStore } from './pipeline/plain.ts';
import { draftPlaylist, type PlaylistDraft, type PlaylistInput } from './pipeline/playlist.ts';
import { buildSession, type ListeningSession, type SessionSpec } from './pipeline/session.ts';
import { PassageIndex } from './retrieve/search.ts';

export interface EngineOptions {
  loader: Loader;
  model: ModelAdapter;
  // Build the keyword index for topic questions (reads the whole library once).
  search?: boolean;
  // Where study guides are kept (default: in memory, for this process only).
  guides?: GuideStore;
  // A daily spending limit in US dollars for questions, playlists and plain words, and where the day's total is kept.
  dailyBudgetUsd?: number;
  spend?: SpendStore;
  // Where notes put into plain words are kept (default: in memory, for this process only).
  plain?: PlainStore;
}

export interface Engine {
  corpus: Corpus;
  ask(input: AskInput): Promise<AskResult>;
  playlist(input: PlaylistInput): Promise<PlaylistDraft>;
  // An old commentary note in everyday English.
  plain(input: PlainInput): Promise<PlainResult>;
  session(spec: SessionSpec): Promise<ListeningSession>;
}

export async function createEngine(opts: EngineOptions): Promise<Engine> {
  const corpus = await Corpus.open(opts.loader);
  let index: Promise<PassageIndex> | undefined;
  const getIndex = opts.search ? () => (index ??= PassageIndex.build(corpus)) : undefined;
  const guides = opts.guides ?? memoryGuides();
  const spend = opts.spend ?? memorySpend();
  const plainStore = opts.plain ?? memoryPlain();
  const limit = opts.dailyBudgetUsd;
  const overBudget = limit === undefined ? undefined : async () => (await spend.today()) >= limit;
  const spent = () => (opts.model.usage ? costOf(opts.model.usage) : 0);
  return {
    corpus,
    // Each answer's cost is what the model adapter counted while it ran; it goes on the day's
    // tally, which the next question checks against the limit.
    async ask(input) {
      const before = spent();
      const result = await ask({ corpus, model: opts.model, index: getIndex, guides, overBudget }, input);
      const cost = spent() - before;
      if (cost > 0) await spend.add(cost);
      return opts.model.usage ? { ...result, costUsd: result.costUsd ?? cost } : result;
    },
    // Drafting a playlist goes on the same tally, and waits for tomorrow once the day's limit is reached.
    async playlist(input) {
      if (overBudget && await overBudget()) throw new OverBudget();
      const before = spent();
      try {
        return await draftPlaylist({ corpus, model: opts.model }, input);
      } finally {
        const cost = spent() - before;
        if (cost > 0) await spend.add(cost);
      }
    },
    // So does putting a note into plain words, though a note already done costs nothing.
    async plain(input) {
      const before = spent();
      try {
        return await plainWords({ model: opts.model, store: plainStore, overBudget }, input);
      } finally {
        const cost = spent() - before;
        if (cost > 0) await spend.add(cost);
      }
    },
    session: (spec) => buildSession(corpus, spec),
  };
}

export type { AskInput, AskResult, PlaylistDraft, PlaylistInput, PlainInput, PlainResult, ListeningSession, SessionSpec };
