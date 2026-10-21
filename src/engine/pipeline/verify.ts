// Checks an answer before anyone hears it: every quotation against the source it came from,
// every named writer against the sources actually supplied, every reference against the canon.
// Code does what code can; a second model call (the grader) judges paraphrased claims.

import type { Versification } from '../bible/canon.ts';
import { findRefs, overlaps, spans as refSpans, type Span } from '../bible/refs.ts';
import { ABSENT_VOICES, authorOf, type Speaker } from '../corpus/sources.ts';
import type { Source } from '../retrieve/gather.ts';
import type { CitedAnswer, Citation } from '../model/types.ts';
import { inQuote, loose, normalize, quoteSpans, words } from '../text.ts';

export interface QuoteCheck {
  text: string;
  ok: boolean;
  sourceId?: string;
  who?: string;
  // echo: the listener's own words repeated back.
  kind: 'source' | 'echo' | 'missing';
  cited: boolean;
}

export interface GradeReport {
  claims: { claim: string; writer: string; source: string; verdict: 'supported' | 'unsupported' | 'unknown' }[];
  takes_side: boolean;
  one_sided: boolean;
  self_help: boolean;
}

export interface CheckReport {
  ok: boolean;
  quotes: QuoteCheck[];
  // Hard failures, phrased so they can be handed back to the model in a repair turn.
  problems: string[];
  // Things worth logging that don't block the answer.
  warnings: string[];
  words: number;
  grade?: GradeReport;
}

// A sentence and the citations attached anywhere inside it. Citations split text into blocks
// mid-sentence ("Henry asks, " + a cited quotation), so checks run per sentence.
export interface Sentence {
  text: string;
  citations: Citation[];
}

export function toSentences(answer: CitedAnswer): Sentence[] {
  const out: Sentence[] = [];
  let cur: Sentence = { text: '', citations: [] };
  for (const b of answer.blocks) {
    cur.text += b.text;
    cur.citations.push(...b.citations);
    // A sentence ends at end punctuation, but never inside an open quotation.
    if (/[.!?]["”’)]*\s*$/.test(b.text) && !inQuote(cur.text)) { out.push(cur); cur = { text: '', citations: [] }; }
  }
  if (cur.text.trim()) out.push(cur);
  return out.map((s) => ({ ...s, text: s.text.trim() }));
}

export const answerText = (answer: CitedAnswer): string => answer.blocks.map((b) => b.text).join('').replace(/\s+/g, ' ').trim();

export function quotesIn(text: string): string[] {
  return quoteSpans(text).map((q) => q.inner.trim()).filter((q) => words(q) >= 3);
}

// A quotation may skip words with an ellipsis; every remaining piece must appear in the source.
function contains(sourceText: string, quote: string): boolean {
  const hay = loose(sourceText);
  const parts = quote.split(/\.\.\.|…|\[…\]/).map(loose).filter((p) => p.length >= 4);
  return parts.length > 0 && parts.every((p) => hay.includes(p));
}

const NAMES: Record<string, RegExp> = {
  henry: /\bHenry('s)?\b/, spurgeon: /\bSpurgeon('s)?\b/, augustine: /\bAugustine('s)?\b/,
  chrysostom: /(?<!Pseudo-)\bChrysostom('s)?\b/, pseudo_chrysostom: /\bPseudo-Chrysostom\b/,
  jerome: /\bJerome\b/, ambrose: /\bAmbrose\b/, bede: /\bBede\b/, theophylact: /\bTheophylact\b/, gregory: /\bGregory\b/,
  hilary: /\bHilary\b/, origen: /\bOrigen\b/, cyril: /\bCyril\b/, basil: /\bBasil\b/, athanasius: /\bAthanasius\b/,
  chrysologus: /\bChrysologus\b/, alcuin: /\bAlcuin\b/, rabanus: /\bRabanus\b/, remigius: /\bRemigius\b/, gloss: /\bthe Gloss\b/,
};
const ABSENT: Record<string, RegExp> = {
  calvin: /\bCalvin('s)?\b/, wesley: /\bWesley('s)?\b/, luther: /\bLuther('s)?\b/, barnes: /\bBarnes\b/,
  clarke: /\bClarke('s)?\b/, gill: /\bGill('s)?\b/, catechism: /\bCatechism\b/,
};
const ASSERTS = /\b(says?|said|writes?|wrote|argues?|argued|teaches|taught|thinks?|thought|believes?|believed|insists?|holds?|notes?|reads?|sees?|calls?|puts it|explains?|warns?|reminds?|asks?)\b/i;
const NEGATION = /\b(doesn'?t|does not|didn'?t|did not|isn'?t|is not|no |not in|library|don'?t have|can'?t tell|rather not)\b/i;
const PERSONA_FORBIDDEN = /\b(I am (really|truly|actually) (him|Matthew Henry|Charles Spurgeon|Augustine|John Chrysostom)|I('m| am) not an AI|I('m| am) (a real|alive)|I absolve|I bless you|by the authority)\b/i;

export interface VerifyInput {
  answer: CitedAnswer;
  sources: Source[];
  question: string;
  speaker: Speaker;
  spans: Span[];
  versification: Versification;
  contested?: boolean;
}

export function verify(input: VerifyInput): CheckReport {
  const { answer, sources, question, speaker } = input;
  const problems: string[] = [];
  const warnings: string[] = [];
  const quotes: QuoteCheck[] = [];
  const byId = new Map(sources.map((s) => [s.id, s]));
  // Verse blocks start with their number ("24 and are justified..."); quotations don't.
  const full = new Map(sources.map((s) => [s.id, s.blocks.map((b) => (s.who === 'bsb' ? b.replace(/^\d+\s/, '') : b)).join(' ')]));
  const present = new Set(sources.map((s) => s.who));
  const text = answerText(answer);

  for (const sent of toSentences(answer)) {
    const cited = sent.citations.map((c) => byId.get(c.sourceId)).filter((s): s is Source => !!s);
    const named = Object.keys(NAMES).filter((k) => NAMES[k].test(sent.text));

    for (const q of quotesIn(sent.text)) {
      if (normalize(question).includes(normalize(q))) { quotes.push({ text: q, ok: true, kind: 'echo', cited: false }); continue; }
      let hit = cited.find((s) => contains(full.get(s.id)!, q));
      const wasCited = !!hit;
      hit ??= sources.find((s) => contains(full.get(s.id)!, q));
      if (!hit) {
        quotes.push({ text: q, ok: false, kind: 'missing', cited: false });
        problems.push(`The quotation "${q}" is not in any of the sources. Quote exactly or paraphrase without quotation marks.`);
        continue;
      }
      quotes.push({ text: q, ok: true, kind: 'source', sourceId: hit.id, who: hit.who, cited: wasCited });
      if (!wasCited) warnings.push(`Quotation "${q}" matched ${hit.id} but wasn't cited there.`);
      // A quotation credited to one writer must come from that writer (Scripture may be quoted anywhere).
      const others = named.filter((k) => k !== hit!.who && !(hit!.who === 'pseudo_chrysostom' && k === 'chrysostom'));
      if (hit.who !== 'bsb' && !named.includes(hit.who) && others.length && speaker === 'host') {
        problems.push(`The quotation "${q}" comes from ${authorOf(hit.who).name}, but the sentence credits ${others.map((k) => authorOf(k).name).join(' and ')}.`);
      }
      if (hit.who === 'pseudo_chrysostom' && /(?<!Pseudo-)\bChrysostom\b/.test(sent.text)) {
        problems.push(`"${q}" is from Pseudo-Chrysostom, an anonymous author, but the answer calls him Chrysostom.`);
      }
    }

    // Writers named as saying something must be among the sources supplied.
    if (ASSERTS.test(sent.text) && !NEGATION.test(sent.text)) {
      for (const k of named) {
        if (k === 'pseudo_chrysostom' || present.has(k)) continue;
        if (k === 'chrysostom' && present.has('pseudo_chrysostom')) continue;
        problems.push(`The answer says what ${authorOf(k).name} says, but no source from ${authorOf(k).name} was supplied.`);
      }
      for (const [k, re] of Object.entries(ABSENT)) {
        if (re.test(sent.text)) problems.push(`The answer reports ${ABSENT_VOICES[k] ?? k}, who isn't in Margin's library. Say the library doesn't include that voice.`);
      }
      if (/\bAquinas\b/.test(sent.text) && !/\b(compiled|gathered|collected|anthology|Catena)\b/i.test(sent.text)) {
        problems.push('The answer presents the Catena as Aquinas’s own view. Name the writer it quotes instead.');
      }
      for (const k of named) {
        if (present.has(k) && !cited.some((s) => s.who === k) && !quotes.some((q) => q.who === k)) {
          warnings.push(`A claim about ${authorOf(k).name} has no citation in its sentence: "${sent.text.slice(0, 120)}"`);
        }
      }
    }
    if (cited.some((s) => s.flags.includes('posthumous')) && /\bHenry (says|writes|wrote|argues|asks)\b/.test(sent.text)) {
      warnings.push('Henry is cited on a book his colleagues completed; "the commentary that bears Henry’s name" is more accurate.');
    }
  }

  // References must exist, and should be among the passages read.
  for (const { raw, ref } of findRefs(text, input.versification)) {
    if (!ref) { problems.push(`${raw} is not a real reference.`); continue; }
    const s = refSpans(ref, input.versification)[0];
    if (!input.spans.some((x) => x.bi === s.bi && x.c === s.c) && !input.spans.some((x) => overlaps(x, s))) {
      warnings.push(`${raw} wasn't among the passages read for this answer.`);
    }
  }

  const n = words(text);
  if (n > 240) problems.push(`The answer is ${n} words; keep it under 190 so it suits listening.`);
  if (/^\s*([-*•]|\d+\.)\s/m.test(text) || /(^|\s)#{1,3}\s|\*\*|__/.test(text)) problems.push('The answer uses list or markdown formatting, which the voice engine reads aloud. Write plain prose.');
  const unquoted = quoteSpans(text).reduceRight((t, q) => t.slice(0, q.start) + t.slice(q.end), text);
  if (/\.\.\.|…/.test(unquoted)) warnings.push('Ellipsis outside a quotation.');
  if (speaker !== 'host' && PERSONA_FORBIDDEN.test(text)) problems.push('The persona claimed to be the real writer or performed a pastoral act. Stay an AI voice drawing on his words.');

  return { ok: problems.length === 0, quotes, problems, warnings, words: n };
}

// Folds the grader's verdicts into the code checks.
export function withGrade(report: CheckReport, grade: GradeReport, contested: boolean): CheckReport {
  const problems = [...report.problems];
  const warnings = [...report.warnings];
  for (const c of grade.claims) {
    if (c.verdict === 'unsupported') problems.push(`This claim isn't supported by the sources: "${c.claim}". Remove it or say only what the source says.`);
    else if (c.verdict === 'unknown') warnings.push(`Grader couldn't confirm: "${c.claim}"`);
  }
  if (contested && grade.takes_side) problems.push('The answer picks a winner on a contested question. Explain what weighs most for each side instead.');
  if (contested && grade.one_sided) problems.push('The answer gives only one view of a contested question. Say what the voices share, then where they differ.');
  if (grade.self_help) warnings.push('Drifted toward general self-help advice.');
  return { ...report, problems, warnings, ok: problems.length === 0, grade };
}

// The grader sees sources as numbered excerpts with their titles.
export const sourcesForGrader = (sources: Source[]): string =>
  sources.map((s) => `[${s.id}] ${s.title}\n${s.blocks.join(' ')}`).join('\n\n');

export type { Citation };
