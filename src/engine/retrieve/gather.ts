// Turns chosen passages into the attributed sources Claude answers from. Each source carries
// who wrote it, in which edition, and how sure that attribution is, in its title.

import { BOOKS, PSALMS } from '../bible/canon.ts';
import { formatSpan, type Span } from '../bible/refs.ts';
import { Corpus, type Chunk, type ChapterData } from '../corpus/store.ts';
import { authorOf, WORKS, type Speaker, type Tradition } from '../corpus/sources.ts';
import { blocks, sentences, words } from '../text.ts';
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

// How much text an answer gets. Claude is billed for every word it reads, and a spoken answer
// quotes two to four excerpts, so each excerpt is cut to its most relevant passage and the
// commentary as a whole is capped. Passages after the first are read as asked (often the other
// side's key text on a debated question), widened only when that stays short.
export interface GatherBudget {
  commentaryWords: number;
  excerptWords: number;
  // A later passage is widened to its paragraph only up to this many verses...
  secondaryVerses: number;
  // ...and kept as requested up to this many.
  secondaryMax: number;
}
export const ANSWER_BUDGET: GatherBudget = { commentaryWords: 1300, excerptWords: 200, secondaryVerses: 8, secondaryMax: 15 };
// Past this many verses, notes are chosen by what the question asks rather than taken in order.
const FOCUS_ABOVE_VERSES = 12;
// Words that say nothing about which verses a question means.
const GENERIC = new Set(tokenize('mean meaning explain tell think verse chapter passage bible scripture understand talk read help question make right wrong true really actually summarize summary recap overview walk through about say main point gist teach teaching lesson'));

// The words of a question that say what it is about, once its reference and words like "mean"
// or "explain" are set aside. None left means it asks about the passage as a whole.
export const contentWords = (text: string): string[] => tokenize(text).filter((t) => !GENERIC.has(t));

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
// With a question, a writer's note on what it asks about comes before his others.
export function rankFathers(list: Chunk[], n: number, rel?: (k: Chunk) => number): Chunk[] {
  const score = (k: Chunk) => {
    const a = authorOf(k.who);
    const r = FATHER_RANK.indexOf(k.who);
    const w = words(k.text);
    return (a.authorship !== 'genuine' ? 100 : 0) + (r < 0 ? 40 : r) + (w < 30 ? 8 : 0) + (w > 350 ? 6 : 0) - (rel ? Math.min(rel(k), 6) * 4 : 0);
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

// The run of whole sentences, up to `max` words, that shares the most words with the question;
// the opening when nothing matches. Marked with ellipses where it cuts the note short.
export function excerpt(text: string, max: number, focus: Set<string>): { text: string; cut: boolean } {
  const all = sentences(text);
  if (words(text) <= max || !all.length) return { text, cut: false };
  let best = { from: 0, to: 0, score: -1 };
  for (let from = 0; from < all.length; from++) {
    let n = 0;
    let to = from;
    while (to < all.length && (to === from || n + words(all[to]) <= max)) n += words(all[to++]);
    const hits = new Set(tokenize(all.slice(from, to).join(' ')));
    const opening = new Set(tokenize(all[from]));
    let score = 0;
    // Shared words count; a window that opens on one wins a tie, so it starts on the point.
    for (const t of focus) if (hits.has(t)) score += opening.has(t) ? 1.1 : 1;
    if (score > best.score) best = { from, to, score };
    if (!focus.size) break;
  }
  let body = all.slice(best.from, best.to).join(' ');
  if (words(body) > max) body = body.split(/\s+/).slice(0, max).join(' ');
  return { text: `${best.from > 0 ? '… ' : ''}${body}${best.to < all.length ? ' …' : ''}`, cut: true };
}

function toSource(k: Chunk, polemic: Set<string>, max = 600, focus: Set<string> = new Set()): Source {
  const clipped = excerpt(k.text.replace(/\s*\[…\]\s*$/, ''), max, focus);
  const flags: string[] = [];
  if (k.posthumous) flags.push('posthumous');
  if (clipped.cut || /\[…\]\s*$/.test(k.text)) flags.push('clipped');
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

// Collects Scripture and commentary for up to three passages within a word budget. Each voice
// gets a turn before any voice gets a second, so a tight budget still hears more than one.
export async function gather(corpus: Corpus, spans: Span[], policy: VoicePolicy, budget: GatherBudget = ANSWER_BUDGET): Promise<Gathered> {
  const polemic = await corpus.reviewFlags();
  const focusWords = new Set(tokenize(policy.focus ?? '').filter((t) => !GENERIC.has(t)));
  const focusSpans = policy.focusSpans ?? [];
  // Only a question that says something beyond its reference can choose among notes.
  const focus: Focus | null = focusWords.size || focusSpans.length ? { words: focusWords, spans: focusSpans } : null;
  const scripture: Source[] = [];
  const widened: Span[] = [];
  // Candidate notes in the order they should be heard: per passage, one from each voice, then
  // the second from each, so the budget runs out on repeats rather than on whole traditions.
  const queue: Chunk[] = [];
  for (const [i, raw] of spans.slice(0, 3).entries()) {
    const cd = await corpus.chapter(raw.bi, raw.c);
    let s = widen(corpus, cd, raw);
    if (i > 0 && s.b - s.a + 1 > budget.secondaryVerses) s = raw.b - raw.a + 1 > budget.secondaryMax ? { ...raw, b: raw.a + budget.secondaryMax - 1 } : raw;
    widened.push(s);
    const src = scriptureSource(cd, s, corpus.versification);
    if (src.blocks.length) scripture.push(src);
    const near = Corpus.touching(cd, s.a, s.b).filter((k) => allowed(policy, k));
    // Notes are ranked by what the question asks on any passage, since only a few fit; on a
    // long one, a Father's note must also touch the question at all: the verse it names, a word
    // from the verses the note covers, or two of its own.
    const f = s.b - s.a + 1 > FOCUS_ABOVE_VERSES ? focus : null;
    const henry = pick(near.filter((k) => k.work === 'mhcc'), i ? 1 : 2, cd, focus);
    const spurgeon = pick(near.filter((k) => k.work === 'tdavid'), i ? 1 : 3, cd, focus);
    const relevant = (k: Chunk) => !f || relevance(k, cd, f) >= 2;
    const fathers = rankFathers(near.filter((k) => (k.work === 'npnf' || k.work === 'catena') && relevant(k)), i ? 1 : policy.speaker === 'host' ? 4 : 6, focus ? (k) => relevance(k, cd, focus) : undefined);
    const overview = cd.bi === PSALMS && cd.spurgeonOverview && allowed(policy, cd.spurgeonOverview) && s.b - s.a + 1 >= cd.nv / 2 ? [cd.spurgeonOverview] : [];
    const lanes = [henry, [...overview, ...spurgeon], fathers];
    for (let round = 0; lanes.some((l) => l[round]); round++) for (const lane of lanes) if (lane[round]) queue.push(lane[round]);
  }

  const notes: Source[] = [];
  const used = new Set<string>();
  let left = budget.commentaryWords;
  for (const k of queue) {
    if (used.has(k.id) || left < 40) continue;
    const src = toSource(k, polemic, Math.min(budget.excerptWords, left), focusWords);
    // An empty source can't be cited (and the API rejects one), so it is never sent.
    if (!src.blocks.some((b) => b.trim())) continue;
    used.add(k.id);
    left -= src.blocks.reduce((n, b) => n + words(b), 0);
    notes.push(src);
  }
  // Each passage's Scripture, then its notes, in passage order, as the listener would hear them.
  const order = (x: Source) => {
    const i = widened.findIndex((w) => w.bi === x.span.bi && w.c === x.span.c && x.span.a <= w.b && Math.max(x.span.b, x.span.a) >= w.a);
    return (i < 0 ? widened.length : i) * 2 + (x.who === 'bsb' ? 0 : 1);
  };
  const sources = [...scripture, ...notes].map((x, n) => ({ x, n })).sort((p, q) => order(p.x) - order(q.x) || p.n - q.n).map((p) => p.x);
  const traditions = [...new Set(notes.map((x) => authorOf(x.who).tradition))];
  return { sources, spans: widened, traditions, silent: notes.length === 0 };
}
