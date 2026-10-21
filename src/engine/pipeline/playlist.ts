// Drafts a study playlist with Claude, then checks every passage against the canon and the
// library before anyone listens to it.

import { PSALMS } from '../bible/canon.ts';
import { formatRef, formatSpan, parseRef, spans as refSpans, type Ref } from '../bible/refs.ts';
import { Corpus } from '../corpus/store.ts';
import type { ModelAdapter } from '../model/types.ts';
import { PLAYLIST_SCHEMA, PLAYLIST_SYSTEM, playlistPrompt } from '../prompts.ts';

export type Voices = 'all' | 'henry' | 'spurgeon' | 'fathers';

export interface PlaylistInput {
  topic: string;
  from?: Voices;
  sessions?: number;
  signal?: AbortSignal;
}

export interface PlaylistSession {
  title: string;
  refs: string[];
  idea: string;
  question: string;
  // Who actually has commentary on this passage in the library.
  voices: string[];
  note?: string;
}

export interface PlaylistDraft {
  title: string;
  description: string;
  contested: boolean;
  by: 'claude' | 'outline';
  sessions: PlaylistSession[];
  // Passages the draft named that don't exist.
  dropped: string[];
}

interface Raw { title: string; description: string; contested: boolean; sessions: { title: string; passage: string; idea: string; question: string }[] }

const VOICE_LINE: Record<Voices, string> = {
  all: 'a balanced panel of every voice in the library',
  henry: 'Matthew Henry',
  spurgeon: 'Charles Spurgeon (he covers the Psalms only)',
  fathers: 'the Church Fathers (strongest on the Gospels, Acts, Paul, the Psalms and John)',
};

const MAX_VERSES = 25;

async function voicesOn(corpus: Corpus, r: Ref): Promise<string[]> {
  const s = refSpans(r, corpus.versification)[0];
  const cd = await corpus.chapter(s.bi, s.c);
  const near = Corpus.touching(cd, s.a, s.b);
  const out: string[] = [];
  if (near.some((k) => k.who === 'henry')) out.push('henry');
  if (near.some((k) => k.who === 'spurgeon')) out.push('spurgeon');
  if (near.some((k) => k.work === 'catena' || k.work === 'npnf')) out.push('fathers');
  return out;
}

// Keeps a long passage to its first 25 verses so a session stays listenable.
function trim(r: Ref, corpus: Corpus): Ref {
  if (r.c2 && r.c2 !== r.c1) return { bi: r.bi, c1: r.c1, v1: r.v1 ?? 1, v2: Math.min(corpus.verseCount(r.bi, r.c1), (r.v1 ?? 1) + MAX_VERSES - 1) };
  const a = r.v1 ?? 1;
  const b = r.v2 ?? (r.v1 ? r.v1 : corpus.verseCount(r.bi, r.c1));
  return b - a + 1 > MAX_VERSES ? { ...r, v1: a, v2: a + MAX_VERSES - 1 } : r;
}

// Without Claude, a passage can still be split into paragraph-sized sessions.
export async function outline(corpus: Corpus, topic: string, n: number): Promise<PlaylistDraft | null> {
  const r = parseRef(topic, corpus.versification);
  if (!r) return null;
  const sessions: PlaylistSession[] = [];
  for (const s of refSpans(r, corpus.versification).slice(0, Math.max(n, 12))) {
    const cd = await corpus.chapter(s.bi, s.c);
    const units = corpus.units(cd).filter((u) => u.b >= s.a && u.a <= s.b);
    for (const u of units.length > 1 && refSpans(r, corpus.versification).length === 1 ? units : [s]) {
      const label = formatSpan(u, corpus.versification);
      sessions.push({ title: label, refs: [label], idea: '', question: '', voices: await voicesOn(corpus, parseRef(label, corpus.versification)!) });
    }
  }
  return { title: formatRef(r), description: '', contested: false, by: 'outline', sessions: sessions.slice(0, Math.max(n, 3)), dropped: [] };
}

export async function draftPlaylist(deps: { corpus: Corpus; model: ModelAdapter }, input: PlaylistInput): Promise<PlaylistDraft> {
  const { corpus, model } = deps;
  const n = Math.max(1, Math.min(input.sessions ?? 6, 12));
  const from = input.from ?? 'all';
  const asPassage = await outline(corpus, input.topic, n);
  if (asPassage) return asPassage;

  const raw = await model.json<Raw>({
    route: 'playlist', system: PLAYLIST_SYSTEM, schema: PLAYLIST_SCHEMA as unknown as Record<string, unknown>, signal: input.signal,
    prompt: playlistPrompt({ topic: input.topic, voices: VOICE_LINE[from], sessions: n }),
  });
  const dropped: string[] = [];
  const sessions: PlaylistSession[] = [];
  for (const s of raw.sessions.slice(0, n + 2)) {
    const parsed = parseRef(s.passage, corpus.versification);
    if (!parsed) { dropped.push(s.passage); continue; }
    const r = trim(parsed, corpus);
    const voices = await voicesOn(corpus, r);
    let note: string | undefined;
    if (from === 'spurgeon' && r.bi !== PSALMS) note = 'Spurgeon has no notes here, so Henry speaks.';
    else if (from === 'fathers' && !voices.includes('fathers')) note = 'No Church Father in the library comments here, so Henry speaks.';
    sessions.push({ title: s.title.slice(0, 70), refs: [formatRef(r)], idea: s.idea.slice(0, 240), question: s.question.slice(0, 200), voices, note });
  }
  return { title: raw.title.slice(0, 80) || input.topic, description: raw.description.slice(0, 280), contested: raw.contested, by: 'claude', sessions: sessions.slice(0, n), dropped };
}
