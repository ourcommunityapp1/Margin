// Turns chosen passages into the attributed sources Claude answers from. Each source carries
// who wrote it, in which edition, and how sure that attribution is, in its title.

import { BOOKS, PSALMS } from '../bible/canon.ts';
import { formatSpan, type Span } from '../bible/refs.ts';
import { Corpus, type Chunk, type ChapterData } from '../corpus/store.ts';
import { authorOf, WORKS, type Speaker, type Tradition } from '../corpus/sources.ts';
import { blocks, clipWords, words } from '../text.ts';
import { tokenize } from './bm25.ts';

export interface Source {
  id: string;
  title: string;
  blocks: string[];
  who: string;
  work: 'bsb' | Chunk['work'];
  span: Span;
  authorship: 'genuine' | 'doubtful' | 'compiled';
  flags: string[];
}

// Which commentators may speak in this answer.
export interface VoicePolicy {
  speaker: Speaker;
  // Optional narrowing, e.g. ['henry'] or ['fathers'] from a playlist's "From" setting.
  voices?: string[];
  // The question with its references taken out, and the short spans it names, so a long
  // passage brings the notes on what the listener asked about.
  focus?: string;
  focusSpans?: Span[];
}

export interface Gathered {
  sources: Source[];
  spans: Span[];
  // Traditions represented among the commentary, for the "library leans one way" disclosure.
  traditions: Tradition[];
  // True when the requested voice has nothing on these passages.
  silent: boolean;
}

const FATHER_RANK = ['chrysostom', 'augustine', 'jerome', 'ambrose', 'gregory', 'bede', 'origen', 'cyril', 'hilary', 'theophylact',
  'basil', 'athanasius', 'gregory_naz', 'gregory_nyssa', 'leo', 'chrysologus', 'cyprian', 'eusebius', 'remigius', 'rabanus', 'alcuin', 'haymo'];

const MAX_SCRIPTURE_VERSES = 30;
const PER_SOURCE_WORDS = 600;
// Past this many verses, notes are chosen by what the question asks rather than taken in order.
const FOCUS_ABOVE_VERSES = 12;
// Words that say nothing about which verses a question means.
const GENERIC = new Set(tokenize('mean meaning explain tell think verse chapter passage bible scripture understand talk read help question make right wrong true really actually'));

interface Focus { words: Set<string>; spans: Span[] }

// How much a note bears on the question: a verse the listener named, words they share, and
// (counting double) words of the verses the note covers, which a question often paraphrases.
function relevance(k: Chunk, cd: ChapterData, focus: Focus): number {
  const end = Math.max(k.span.b, k.reach);
  let n = focus.spans.some((s) => s.bi === cd.bi && s.c === cd.c && k.span.a <= s.b && end >= s.a) ? 3 : 0;
  if (!focus.words.size) return n;
  const own = new Set(tokenize(k.text));
  const verses = new Set(tokenize(cd.verses.slice(k.span.a - 1, end).join(' ')));
  for (const t of focus.words) n += (own.has(t) ? 1 : 0) + (verses.has(t) ? 2 : 0);
  return n;
}

// The n notes most relevant to the question, back in verse order; with no question, the first n.
function pick(list: Chunk[], n: number, cd: ChapterData, focus: Focus | null): Chunk[] {
  if (!focus || list.length <= n) return list.slice(0, n);
  const top = list.map((k, i) => ({ k, i, r: relevance(k, cd, focus) })).sort((x, y) => y.r - x.r || x.i - y.i).slice(0, n);
  return top.sort((x, y) => x.i - y.i).map((x) => x.k);
}

// Ranks early-church excerpts: named Fathers first, distinct writers before repeats, doubtful last.
export function rankFathers(list: Chunk[], n: number): Chunk[] {
  const score = (k: Chunk) => {
    const a = authorOf(k.who);
    const r = FATHER_RANK.indexOf(k.who);
    const w = words(k.text);
    return (a.authorship !== 'genuine' ? 100 : 0) + (r < 0 ? 40 : r) + (w < 30 ? 8 : 0) + (w > 350 ? 6 : 0);
  };
  const sorted = list.slice().sort((x, y) => score(x) - score(y));
  const out: Chunk[] = [];
  const seen = new Set<string>();
  for (const k of sorted) { if (out.length < n && !seen.has(k.who)) { out.push(k); seen.add(k.who); } }
  for (const k of sorted) { if (out.length < n && !out.includes(k)) out.push(k); }
  return out;
}

const isFatherKey = (who: string) => !['henry', 'spurgeon', 'bsb'].includes(who);

function allowed(policy: VoicePolicy, k: Chunk): boolean {
  if (policy.speaker !== 'host') {
    // A persona speaks only from that writer's own works, never from the Catena's excerpts.
    if (k.who !== policy.speaker) return false;
    if ((k.who === 'augustine' || k.who === 'chrysostom') && k.work === 'catena') return false;
    return true;
  }
  const v = policy.voices;
  if (!v || !v.length || v.includes('all')) return true;
  return v.includes(k.who) || (v.includes('fathers') && isFatherKey(k.who));
}

// Widens a short span to the paragraph (passage unit) around it, so no verse is read out of context.
export function widen(corpus: Corpus, cd: ChapterData, s: Span): Span {
  const units = corpus.units(cd).filter((u) => u.b >= s.a && u.a <= s.b);
  if (!units.length) return s;
  const a = Math.min(s.a, units[0].a);
  const b = Math.max(s.b, units[units.length - 1].b);
  if (b - a + 1 > MAX_SCRIPTURE_VERSES) return s;
  return { ...s, a, b };
}

export function sourceTitle(k: Chunk): string {
  const a = authorOf(k.who);
  const on = formatSpan(k.span);
  if (k.work === 'mhcc') {
    // A Henry note runs to the next heading; a few headings are missing from the source.
    const covers = formatSpan({ ...k.span, b: Math.max(k.span.b, k.reach) });
    const title = k.kind === 'intro' ? `introduction to ${BOOKS[k.span.bi].name}` : `on ${covers}`;
    return `Matthew Henry, Concise Commentary, ${title}${k.posthumous ? ' (this part of Henry’s Exposition was completed from his notes by other ministers)' : ''}`;
  }
  if (k.work === 'tdavid') return `Charles Spurgeon, The Treasury of David, ${k.kind === 'overview' ? `introduction to ${on}` : `on ${on}`}`;
  if (k.work === 'npnf') return `${a.name}, ${k.label ?? 'homily'} (19th-century NPNF translation), on ${on}`;
  const who = a.authorship === 'genuine' ? a.name : `${a.name} (${a.note ?? a.label})`;
  return `${who}, as excerpted in Aquinas’s Catena Aurea (1841 Oxford translation), on ${on}`;
}

function toSource(k: Chunk, polemic: Set<string>): Source {
  const clipped = clipWords(k.text.replace(/\s*\[…\]\s*$/, ''), PER_SOURCE_WORDS);
  const flags: string[] = [];
  if (k.posthumous) flags.push('posthumous');
  if (clipped.clipped || /\[…\]\s*$/.test(k.text)) flags.push('clipped');
  if (polemic.has(k.id)) flags.push('polemic');
  if (k.work === 'catena') flags.push('anthology');
  return {
    id: k.id, title: sourceTitle(k), blocks: blocks(clipped.text), who: k.who, work: k.work, span: k.span,
    authorship: authorOf(k.who).authorship, flags,
  };
}

function scriptureSource(cd: ChapterData, s: Span, vs: number[][]): Source {
  const verseBlocks: string[] = [];
  for (let v = s.a; v <= s.b; v++) if (cd.verses[v - 1]) verseBlocks.push(`${v} ${cd.verses[v - 1]}`);
  const missing = s.b - s.a + 1 - verseBlocks.length;
  return {
    id: `bsb:${BOOKS[s.bi].code}.${s.c}.${s.a}-${s.b}`,
    title: `${formatSpan(s, vs)} (${WORKS.bsb.title})${missing ? `; the BSB leaves out ${missing > 1 ? `${missing} verses` : 'one verse'} here, as the oldest manuscripts do` : ''}`,
    blocks: verseBlocks, who: 'bsb', work: 'bsb', span: s, authorship: 'genuine', flags: missing ? ['missing-verses'] : [],
  };
}

// Collects Scripture and commentary for up to four passages within a word budget.
export async function gather(corpus: Corpus, spans: Span[], policy: VoicePolicy, budgetWords = 6500): Promise<Gathered> {
  const polemic = await corpus.reviewFlags();
  const focusWords = new Set(tokenize(policy.focus ?? '').filter((t) => !GENERIC.has(t)));
  const focusSpans = policy.focusSpans ?? [];
  // Only a question that says something beyond its reference can choose among notes.
  const focus: Focus | null = focusWords.size || focusSpans.length ? { words: focusWords, spans: focusSpans } : null;
  const sources: Source[] = [];
  const used = new Set<string>();
  const widened: Span[] = [];
  let budget = budgetWords;
  let commentary = 0;
  const add = (src: Source) => {
    // An empty source can't be cited (and the API rejects one), so it is never sent.
    if (used.has(src.id) || budget <= 0 || !src.blocks.some((b) => b.trim())) return;
    used.add(src.id); budget -= src.blocks.reduce((n, b) => n + words(b), 0); sources.push(src);
    if (src.who !== 'bsb') commentary++;
  };

  for (const raw of spans.slice(0, 4)) {
    const cd = await corpus.chapter(raw.bi, raw.c);
    const s = widen(corpus, cd, raw);
    widened.push(s);
    add(scriptureSource(cd, s, corpus.versification));
    const near = Corpus.touching(cd, s.a, s.b).filter((k) => allowed(policy, k));
    const f = s.b - s.a + 1 > FOCUS_ABOVE_VERSES ? focus : null;
    const henry = pick(near.filter((k) => k.work === 'mhcc'), 2, cd, f);
    const spurgeon = pick(near.filter((k) => k.work === 'tdavid'), 3, cd, f);
    // On a long passage, a Father's note must touch the question: the verse it names, a word
    // from the verses the note covers, or two of its own.
    const relevant = (k: Chunk) => !f || relevance(k, cd, f) >= 2;
    const npnf = near.filter((k) => k.work === 'npnf' && relevant(k));
    const catena = near.filter((k) => k.work === 'catena' && relevant(k));
    if (cd.bi === PSALMS && cd.spurgeonOverview && allowed(policy, cd.spurgeonOverview) && s.b - s.a + 1 >= cd.nv / 2) add(toSource(cd.spurgeonOverview, polemic));
    for (const k of [...henry, ...spurgeon]) add(toSource(k, polemic));
    const fatherSlots = policy.speaker === 'host' ? 4 : 6;
    for (const k of rankFathers([...npnf, ...catena], fatherSlots)) add(toSource(k, polemic));
  }

  const traditions = [...new Set(sources.filter((x) => x.who !== 'bsb').map((x) => authorOf(x.who).tradition))];
  return { sources, spans: widened, traditions, silent: commentary === 0 };
}
