// Builds a listening session: Scripture, then each commentator, as chapters of short spoken units
// with estimated timings. Deterministic, so it needs no model and costs nothing to rebuild.

import type { Versification } from '../bible/canon.ts';
import { formatSpan, parseRef, spanKey, spans as refSpans, spokenSpan, type Span } from '../bible/refs.ts';
import { authorOf } from '../corpus/sources.ts';
import { Corpus, type ChapterData, type Chunk } from '../corpus/store.ts';
import { rankFathers, widen } from '../retrieve/gather.ts';
import { clipWords, sentences, spokenNumber, words } from '../text.ts';

export interface SessionSpec {
  title?: string;
  refs: string[];
  // read: the whole passage, then the commentators. verse: each paragraph, then its commentary.
  format?: 'read' | 'verse';
  // Narrow the voices: 'henry', 'spurgeon', 'fathers', or a Father's key.
  voices?: string[];
}

export interface SessionUnit {
  text: string;
  say: string;
  // Verse number, on the unit where a verse begins.
  v?: number;
  // A spoken lead-in by the host ("Matthew Henry, on verses one to eight").
  lead?: boolean;
  at: number;
  dur: number;
}

export interface SessionChapter {
  kind: 'scripture' | 'comment';
  who: string;
  sourceId: string;
  title: string;
  subtitle: string;
  ref: string;
  span: Span;
  extra?: boolean;
  units: SessionUnit[];
  start: number;
  dur: number;
}

export interface ListeningSession {
  title: string;
  refs: string[];
  chapters: SessionChapter[];
  // More voices on the same verses, for "Go deeper".
  extras: SessionChapter[];
  total: number;
}

const HENRY_WORDS = 5000;
const SPURGEON_WORDS = 700;
const FATHERS_PER_PASSAGE = 3;
const MAX_EXTRAS = 24;

const spokenRange = (a: number, b: number) => (a === b ? `verse ${spokenNumber(a)}` : `verses ${spokenNumber(a)} to ${spokenNumber(b)}`);

// Expands "ver. 3" and similar so the voice engine reads them naturally.
const speakable = (t: string) => t.replace(/\bver\. (\d+)-(\d+)/g, 'verses $1 to $2').replace(/\bver\. (\d+)/g, 'verse $1')
  .replace(/\bch\. (\d+):(\d+)/g, 'chapter $1, verse $2').replace(/\bi\.e\./g, 'that is').replace(/\bviz\./g, 'namely')
  .replace(/\s*\[…\]\s*$/, '').replace(/--/g, ', ');

function lead(k: Chunk): string {
  const a = authorOf(k.who);
  const r = spokenRange(k.span.a, k.reach);
  if (k.work === 'mhcc') return k.posthumous ? `From the commentary that bears Matthew Henry's name, on ${r}.` : `Matthew Henry, on ${r}.`;
  if (k.work === 'tdavid') return k.kind === 'overview' ? 'Charles Spurgeon introduces the psalm.' : `Charles Spurgeon, from The Treasury of David, on ${spokenRange(k.span.a, k.span.b)}.`;
  if (k.work === 'npnf') return `${a.name}, from his ${k.label ?? 'homilies'}.`;
  if (a.authorship === 'doubtful') return `An early writer the Catena calls ${a.name}. ${a.note ?? ''}`.trim();
  return `${a.name}, from Aquinas's Catena Aurea.`;
}

function subtitle(k: Chunk): string {
  const a = authorOf(k.who);
  if (k.work === 'mhcc') return `Concise Commentary${k.posthumous ? ' · completed from Henry’s notes by others' : ''}`;
  if (k.work === 'tdavid') return 'The Treasury of David';
  if (k.work === 'npnf') return `${k.label ?? ''} · 19th-century translation`;
  return `Catena Aurea${a.authorship === 'genuine' ? '' : ' · ' + (a.note ?? 'doubtful attribution')}`;
}

function timed(units: Omit<SessionUnit, 'at' | 'dur'>[]): { units: SessionUnit[]; dur: number } {
  let t = 0;
  const out = units.map((u) => {
    const dur = Math.max(0.6, words(u.say) / 2.5 + 0.35);
    const unit = { ...u, at: t, dur };
    t += dur;
    return unit;
  });
  return { units: out, dur: t };
}

function scriptureChapter(cd: ChapterData, s: Span, vs: Versification, title?: string): SessionChapter {
  const units: Omit<SessionUnit, 'at' | 'dur'>[] = [];
  const intro = (title ? `${title}. ` : '') + spokenSpan(s, vs) + '.';
  units.push({ text: intro, say: intro, lead: true });
  for (let v = s.a; v <= s.b; v++) {
    const t = cd.verses[v - 1];
    if (t) sentences(t).forEach((c, i) => units.push({ text: c, say: c, v: i === 0 ? v : undefined }));
  }
  const { units: u, dur } = timed(units);
  return { kind: 'scripture', who: 'bsb', sourceId: `bsb:${spanKey(s)}`, title: formatSpan(s, vs), subtitle: 'Berean Standard Bible', ref: formatSpan(s, vs), span: s, units: u, start: 0, dur };
}

function commentChapter(k: Chunk, limit: number, extra = false): SessionChapter {
  const { text } = clipWords(k.text.replace(/\s*\[…\]\s*$/, ''), limit);
  const intro = (extra ? 'Going deeper. ' : '') + lead(k);
  const units: Omit<SessionUnit, 'at' | 'dur'>[] = [{ text: intro, say: intro, lead: true }];
  for (const s of sentences(text)) units.push({ text: s, say: speakable(s) });
  const { units: u, dur } = timed(units);
  const span = { ...k.span, b: k.reach };
  return { kind: 'comment', who: k.who, sourceId: k.id, title: authorOf(k.who).name, subtitle: subtitle(k), ref: formatSpan(span), span, extra, units: u, start: 0, dur };
}

const wants = (voices: string[] | undefined, k: Chunk) => {
  if (!voices?.length || voices.includes('all')) return true;
  return voices.includes(k.who) || (voices.includes('fathers') && !['henry', 'spurgeon'].includes(k.who));
};

export async function buildSession(corpus: Corpus, spec: SessionSpec): Promise<ListeningSession> {
  const vs = corpus.versification;
  const chapters: SessionChapter[] = [];
  const extras: SessionChapter[] = [];
  const refs: string[] = [];
  let first = true;
  for (const raw of spec.refs.slice(0, 6)) {
    const ref = parseRef(raw, vs);
    if (!ref) continue;
    refs.push(formatSpan(refSpans(ref, vs)[0], vs));
    for (const sp of refSpans(ref, vs)) {
      const cd = await corpus.chapter(sp.bi, sp.c);
      const s = sp.b - sp.a + 1 < 4 ? widen(corpus, cd, sp) : sp;
      const touching = Corpus.touching(cd, s.a, s.b).filter((k) => wants(spec.voices, k));
      const henry = touching.filter((k) => k.work === 'mhcc');
      const spurgeon = touching.filter((k) => k.work === 'tdavid');
      const fathers = touching.filter((k) => k.work === 'catena' || k.work === 'npnf');
      const picked = new Set<Chunk>();
      const title = first ? spec.title : undefined;
      first = false;
      if (spec.format === 'verse' && (henry.length || spurgeon.length)) {
        const groups = (spurgeon.length ? spurgeon : henry).map((k) => ({ k, a: Math.max(s.a, k.span.a), b: Math.min(s.b, k.reach) }));
        let at = s.a;
        let opened = false;
        if (spurgeon.length && cd.spurgeonOverview && s.a === 1 && wants(spec.voices, cd.spurgeonOverview)) chapters.push(commentChapter(cd.spurgeonOverview, SPURGEON_WORDS));
        for (const g of groups) {
          if (g.b < g.a) continue;
          if (g.a > at) chapters.push(scriptureChapter(cd, { ...s, a: at, b: g.a - 1 }, vs, opened ? undefined : title));
          chapters.push(scriptureChapter(cd, { ...s, a: g.a, b: g.b }, vs, opened ? undefined : title));
          opened = true;
          chapters.push(commentChapter(g.k, g.k.work === 'tdavid' ? SPURGEON_WORDS : HENRY_WORDS));
          for (const f of rankFathers(fathers.filter((k) => !picked.has(k) && k.span.a >= g.a && k.span.a <= g.b), 1)) { picked.add(f); chapters.push(commentChapter(f, HENRY_WORDS)); }
          at = g.b + 1;
        }
        if (at <= s.b) chapters.push(scriptureChapter(cd, { ...s, a: at, b: s.b }, vs, opened ? undefined : title));
        if (spurgeon.length) henry.forEach((k) => chapters.push(commentChapter(k, HENRY_WORDS)));
      } else {
        chapters.push(scriptureChapter(cd, s, vs, title));
        henry.forEach((k) => chapters.push(commentChapter(k, HENRY_WORDS)));
        spurgeon.forEach((k) => chapters.push(commentChapter(k, SPURGEON_WORDS)));
        for (const f of rankFathers(fathers, FATHERS_PER_PASSAGE)) { picked.add(f); chapters.push(commentChapter(f, HENRY_WORDS)); }
      }
      for (const f of rankFathers(fathers.filter((k) => !picked.has(k)), MAX_EXTRAS - extras.length)) extras.push(commentChapter(f, HENRY_WORDS, true));
    }
  }
  let t = 0;
  for (const ch of chapters) { ch.start = t; t += ch.dur; }
  return { title: spec.title ?? refs.join(', '), refs, chapters, extras, total: t };
}
