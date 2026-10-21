// Margin's study engine: one object that answers questions, drafts playlists and builds
// listening sessions from the library. See src/engine/README.md for the design.

import { Corpus, type Loader } from './corpus/store.ts';
import type { ModelAdapter } from './model/types.ts';
import { ask, type AskInput, type AskResult } from './pipeline/ask.ts';
import { draftPlaylist, type PlaylistDraft, type PlaylistInput } from './pipeline/playlist.ts';
import { buildSession, type ListeningSession, type SessionSpec } from './pipeline/session.ts';
import { PassageIndex } from './retrieve/search.ts';

export interface EngineOptions {
  loader: Loader;
  model: ModelAdapter;
  // Build the keyword index for topic questions (reads the whole library once).
  search?: boolean;
}

export interface Engine {
  corpus: Corpus;
  ask(input: AskInput): Promise<AskResult>;
  playlist(input: PlaylistInput): Promise<PlaylistDraft>;
  session(spec: SessionSpec): Promise<ListeningSession>;
}

export async function createEngine(opts: EngineOptions): Promise<Engine> {
  const corpus = await Corpus.open(opts.loader);
  let index: Promise<PassageIndex> | undefined;
  const getIndex = opts.search ? () => (index ??= PassageIndex.build(corpus)) : undefined;
  return {
    corpus,
    ask: (input) => ask({ corpus, model: opts.model, index: getIndex }, input),
    playlist: (input) => draftPlaylist({ corpus, model: opts.model }, input),
    session: (spec) => buildSession(corpus, spec),
  };
}

export type { AskInput, AskResult, PlaylistDraft, PlaylistInput, ListeningSession, SessionSpec };
