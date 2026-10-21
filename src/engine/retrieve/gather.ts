// Turns chosen passages into the attributed sources Claude answers from. Each source carries
// who wrote it, in which edition, and how sure that attribution is, in its title.

import { BOOKS, PSALMS } from '../bible/canon.ts';
import { formatSpan, type Span } from '../bible/refs.ts';
import { Corpus, type Chunk, type ChapterData } from '../corpus/store.ts';
import { authorOf, WORKS, type Speaker, type Tradition } from '../corpus/sources.ts';
import { blocks, clipWords, words } from '../text.ts';

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
    const title = k.kind === 'intro' ? `introduction to ${BOOKS[k.span.bi].name}` : `on ${on}`;
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
    title: `${formatSpan(s, vs)} (${WORKS.bsb.title})${missing ? `; ${missing} verse${missing > 1 ? 's are' : ' is'} missing from this copy` : ''}`,
    blocks: verseBlocks, who: 'bsb', work: 'bsb', span: s, authorship: 'genuine', flags: missing ? ['missing-verses'] : [],
  };
}

// Collects Scripture and commentary for up to four passages within a word budget.
export async function gather(corpus: Corpus, spans: Span[], policy: VoicePolicy, budgetWords = 6500): Promise<Gathered> {
  const polemic = await corpus.reviewFlags();
  const sources: Source[] = [];
  const used = new Set<string>();
  const widened: Span[] = [];
  let budget = budgetWords;
  let commentary = 0;
  const add = (src: Source) => {
    if (used.has(src.id) || budget <= 0) return;
    used.add(src.id); budget -= src.blocks.reduce((n, b) => n + words(b), 0); sources.push(src);
    if (src.who !== 'bsb') commentary++;
  };

  for (const raw of spans.slice(0, 4)) {
    const cd = await corpus.chapter(raw.bi, raw.c);
    const s = widen(corpus, cd, raw);
    widened.push(s);
    add(scriptureSource(cd, s, corpus.versification));
    const near = Corpus.touching(cd, s.a, s.b).filter((k) => allowed(policy, k));
    const henry = near.filter((k) => k.work === 'mhcc').slice(0, 2);
    const spurgeon = near.filter((k) => k.work === 'tdavid').slice(0, 3);
    const npnf = near.filter((k) => k.work === 'npnf');
    const catena = near.filter((k) => k.work === 'catena');
    if (cd.bi === PSALMS && cd.spurgeonOverview && allowed(policy, cd.spurgeonOverview) && s.b - s.a + 1 >= cd.nv / 2) add(toSource(cd.spurgeonOverview, polemic));
    for (const k of [...henry, ...spurgeon]) add(toSource(k, polemic));
    const fatherSlots = policy.speaker === 'host' ? 4 : 6;
    for (const k of rankFathers([...npnf, ...catena], fatherSlots)) add(toSource(k, polemic));
  }

  const traditions = [...new Set(sources.filter((x) => x.who !== 'bsb').map((x) => authorOf(x.who).tradition))];
  return { sources, spans: widened, traditions, silent: commentary === 0 };
}
