// Turns a checked answer into segments for the voice engine, so the listener can hear the
// difference between Scripture, a commentator's own words and Margin's summary.

import type { Versification } from '../bible/canon.ts';
import { findRefs, spans, spokenSpan } from '../bible/refs.ts';
import { authorOf, type Speaker } from '../corpus/sources.ts';
import type { QuoteCheck } from './verify.ts';

export interface AudioSegment {
  // disclosure: "this is an AI voice"; speech: the host or persona talking; quote: a
  // commentator's exact words; scripture: Bible text from the stored BSB.
  kind: 'disclosure' | 'speech' | 'quote' | 'scripture';
  voice: string;
  text: string;
  say: string;
  sourceId?: string;
}

// Spells out references and drops characters a voice engine would read literally.
export function forSpeech(text: string, vs: Versification): string {
  let out = text;
  for (const { raw, ref } of findRefs(text, vs)) {
    if (ref) out = out.replace(raw, spokenSpan(spans(ref, vs)[0], vs) + (spans(ref, vs).length > 1 ? ' and following' : ''));
  }
  return out.replace(/\bvv?\.\s*/g, 'verse ').replace(/&/g, 'and').replace(/[*_#`[\]]/g, '').replace(/\s+/g, ' ').trim();
}

export function disclosure(speaker: Speaker): AudioSegment | null {
  if (speaker === 'host') return null;
  const text = `An AI voice drawing on ${authorOf(speaker).name}'s published words.`;
  return { kind: 'disclosure', voice: 'host', text, say: text };
}

export function toSegments(text: string, quotes: QuoteCheck[], speaker: Speaker, vs: Versification): AudioSegment[] {
  const out: AudioSegment[] = [];
  const d = disclosure(speaker);
  if (d) out.push(d);
  const push = (seg: Omit<AudioSegment, 'say'>) => {
    if (!seg.text.trim()) return;
    out.push({ ...seg, text: seg.text.trim(), say: forSpeech(seg.text, vs) });
  };
  const re = /[“"]([^”"]{3,}?)[”"]/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    push({ kind: 'speech', voice: speaker, text: text.slice(at, m.index) });
    const q = quotes.find((x) => x.ok && x.text === m[1].trim());
    if (q?.who === 'bsb') push({ kind: 'scripture', voice: 'bsb', text: m[1], sourceId: q.sourceId });
    else if (q?.kind === 'source' && speaker === 'host') push({ kind: 'quote', voice: q.who!, text: m[1], sourceId: q.sourceId });
    else push({ kind: 'speech', voice: speaker, text: m[1] });
    at = m.index! + m[0].length;
  }
  push({ kind: 'speech', voice: speaker, text: text.slice(at) });
  return out;
}
