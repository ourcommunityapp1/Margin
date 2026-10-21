// Answering a question, as a chain of checked steps:
// guard → plan passages → validate references → add keyword search → gather attributed sources
// → answer with citations → verify in code → grade claims → one repair → safe fallback.

import type { Versification } from '../bible/canon.ts';
import { findRefs, formatSpan, overlaps, parseRef, spans as refSpans, type Span } from '../bible/refs.ts';
import { authorOf, isPersona, type Speaker } from '../corpus/sources.ts';
import type { Corpus } from '../corpus/store.ts';
import { ModelRefusal, type CitedAnswer, type ModelAdapter, type Turn } from '../model/types.ts';
import { GRADE_SCHEMA, GRADE_SYSTEM, gradePrompt, HOST_SYSTEM, personaSystem, PLAN_SCHEMA, PLAN_SYSTEM, planPrompt } from '../prompts.ts';
import { gather, type Gathered, type Source } from '../retrieve/gather.ts';
import type { PassageIndex } from '../retrieve/search.ts';
import { sentences } from '../text.ts';
import { toSegments, type AudioSegment } from './audio.ts';
import { guard } from './guard.ts';
import { answerText, sourcesForGrader, verify, withGrade, type CheckReport, type GradeReport, type QuoteCheck } from './verify.ts';

export interface Plan {
  intent: 'passage' | 'topic' | 'followup' | 'offtopic' | 'meta';
  passages: string[];
  contested: boolean;
  false_premise: boolean;
  search: string;
}

export interface AskInput {
  question: string;
  speaker?: Speaker;
  history?: Turn[];
  // What the listener is playing or reading, for "what does this verse mean?"
  context?: { refs: string[]; label?: string };
  voices?: string[];
  // Run the grading call (default true). Turning it off saves a call when latency matters most.
  grade?: boolean;
  signal?: AbortSignal;
  // Progress for the UI: "Choosing passages…", "Reading Romans 3:21–26…", "Checking quotes…".
  onStep?: (step: string) => void;
}

export interface AskResult {
  status: 'answered' | 'fallback' | 'guarded' | 'offtopic' | 'error';
  speaker: Speaker;
  text: string;
  segments: AudioSegment[];
  quotes: QuoteCheck[];
  passages: string[];
  sources: Pick<Source, 'id' | 'title' | 'who' | 'authorship' | 'flags'>[];
  notes: string[];
  // Planner references that didn't exist; logged as a hallucination measure.
  invalidRefs: string[];
  attempts: number;
  plan?: Plan;
  checks?: CheckReport;
  error?: string;
  // The adapter's error code when there is one, e.g. "not_granted" or "rate_limited".
  errorCode?: string;
}

export interface AskDeps {
  corpus: Corpus;
  model: ModelAdapter;
  index?: () => Promise<PassageIndex>;
}

const MAX_PASSAGES = 4;
const PERSONA_TURN_LIMIT = 8;

const META_TEXT = 'Margin is an AI study aid. It reads the Bible with Matthew Henry, Charles Spurgeon and the Church Fathers, answers from their words, and checks every quotation against the source. When you hear a commentator in character, that is an AI voice drawing on his published words, not the man himself.';
const OFFTOPIC_TEXT = 'Margin is for studying the Bible with its commentators, so that’s outside what I can help with here. Ask me about a passage, a person in Scripture, or a subject like grace, prayer or the church.';

const simple = (status: AskResult['status'], speaker: Speaker, text: string, notes: string[] = []): AskResult => ({
  status, speaker, text, notes, quotes: [], passages: [], sources: [], invalidRefs: [], attempts: 0,
  segments: [{ kind: 'speech', voice: 'host', text, say: text }],
});

const historyText = (h: Turn[]): string =>
  h.slice(-6).map((t) => `${t.role === 'user' ? 'Listener' : 'Margin'}: ${t.text.slice(0, 600)}`).join('\n');

export async function ask(deps: AskDeps, input: AskInput): Promise<AskResult> {
  const { corpus, model } = deps;
  const vs = corpus.versification;
  const question = input.question.trim();
  const history = input.history ?? [];
  const notes: string[] = [];
  let speaker: Speaker = input.speaker && (input.speaker === 'host' || isPersona(input.speaker)) ? input.speaker : 'host';

  const g = guard(question, speaker);
  if (g.kind === 'crisis' || g.kind === 'sacramental' || g.kind === 'identity') return simple('guarded', 'host', g.text);
  if (g.kind === 'counsel' && speaker !== 'host') { speaker = 'host'; notes.push('Personal questions are answered by the host, not in character.'); }
  if (speaker !== 'host' && history.filter((t) => t.role === 'assistant').length >= PERSONA_TURN_LIMIT) {
    speaker = 'host';
    notes.push('The host has taken over after a long run in character.');
  }

  const step = (s: string) => input.onStep?.(s);

  // 1. Plan which passages to read.
  step('Choosing passages…');
  let plan: Plan | undefined;
  try {
    plan = await model.json<Plan>({
      route: 'plan', system: PLAN_SYSTEM, schema: PLAN_SCHEMA as unknown as Record<string, unknown>, signal: input.signal,
      prompt: planPrompt(question, { context: input.context?.label ?? input.context?.refs.join(', '), history: historyText(history) }),
    });
  } catch (e) {
    if (input.signal?.aborted) throw e;
    notes.push('Passage planning failed, so Margin searched the library instead.');
  }
  if (plan?.intent === 'offtopic') return { ...simple('offtopic', 'host', OFFTOPIC_TEXT), plan };
  if (plan?.intent === 'meta') return { ...simple('offtopic', 'host', META_TEXT), plan };

  // 2. Validate every reference against the canon, then add context and keyword search.
  const invalidRefs: string[] = [];
  const chosen: Span[] = [];
  const take = (s: Span) => { if (chosen.length < MAX_PASSAGES && !chosen.some((x) => overlaps(x, s))) chosen.push(s); };
  // References the listener named come first, whatever the planner chose.
  for (const { ref } of findRefs(question, vs, true)) if (ref) refSpans(ref, vs).slice(0, 2).forEach(take);
  for (const p of plan?.passages ?? []) {
    const r = parseRef(p, vs);
    if (!r) { invalidRefs.push(p); continue; }
    refSpans(r, vs).slice(0, 2).forEach(take);
  }
  if (input.context?.refs.length && (plan?.intent === 'followup' || !chosen.length)) {
    for (const raw of input.context.refs) { const r = parseRef(raw, vs); if (r) refSpans(r, vs).slice(0, 2).forEach(take); }
  }
  if (chosen.length < 2 && plan?.intent !== 'passage' && plan?.intent !== 'followup' && deps.index) {
    const idx = await deps.index();
    for (const h of idx.search(plan?.search || question, 4)) { if (chosen.length >= 3) break; take(h.span); }
  }

  // 3. Gather attributed sources for the speaker.
  if (chosen.length) step(`Reading ${chosen.map((x) => formatSpan(x, vs)).join(', ')}…`);
  const got: Gathered = await gather(corpus, chosen, { speaker, voices: input.voices });
  const sources = got.sources;
  const passages = got.spans.map((s) => formatSpan(s, vs));
  const commentators = [...new Set(sources.filter((s) => s.who !== 'bsb').map((s) => s.who))];
  const flags: string[] = [];
  const contested = !!plan?.contested;
  if (contested) flags.push('Christian traditions answer this question differently. Follow the balance rules.');
  if (contested && commentators.length && commentators.every((w) => authorOf(w).tradition === 'reformed')) {
    flags.push('The only commentators on these passages here are Henry and Spurgeon, who share one tradition. Say so when you compare views.');
    notes.push('Only Reformed voices in the library speak to these passages.');
  }
  if (got.silent) {
    flags.push(speaker === 'host'
      ? 'No commentary in the library speaks to these passages. Answer from the passages themselves and say the commentators here are silent.'
      : `${authorOf(speaker).name} has no writing on these passages in the library. Say so in his voice and suggest asking the host.`);
  }
  if (plan?.false_premise) flags.push('The question may rest on a false premise. Check it against the passages.');
  const polemic = sources.filter((s) => s.flags.includes('polemic')).map((s) => s.id);
  if (polemic.length) flags.push(`These sources contain language about Jews or Catholics that needs care: ${polemic.join(', ')}. Follow the rule on polemic.`);
  if (sources.some((s) => s.flags.includes('missing-verses'))) flags.push('Some verses are missing from this copy of the BSB; say so if they matter.');
  const userText = `Question: ${question}${flags.length ? `\n\nNotes from Margin, not from the listener:\n- ${flags.join('\n- ')}` : ''}`;

  const meta = { passages, invalidRefs, plan, sources: sources.map(({ id, title, who, authorship, flags: f }) => ({ id, title, who, authorship, flags: f })) };
  if (!sources.length) {
    const text = 'I couldn’t find passages for that in Margin’s library. Try naming a passage, or ask about a subject in Scripture.';
    return { ...simple('fallback', speaker, text, notes), ...meta };
  }

  // 4. Answer with citations, check, grade, and repair once.
  const system = speaker === 'host' ? HOST_SYSTEM : personaSystem(speaker);
  const check = async (answer: CitedAnswer): Promise<CheckReport> => {
    step('Checking every quotation…');
    let report = verify({ answer, sources, question, speaker, spans: got.spans, versification: vs, contested });
    if (report.ok && input.grade !== false) {
      try {
        const grade = await model.json<GradeReport>({
          route: 'grade', system: GRADE_SYSTEM, schema: GRADE_SCHEMA as unknown as Record<string, unknown>, signal: input.signal,
          prompt: gradePrompt(answerText(answer), sourcesForGrader(sources), contested),
        });
        report = withGrade(report, grade, contested);
      } catch (e) {
        if (input.signal?.aborted) throw e;
        report = { ...report, warnings: [...report.warnings, 'Grader unavailable; code checks only.'] };
      }
    }
    return report;
  };

  let attempts = 0;
  try {
    step('Writing the answer…');
    let answer = await model.cite({ route: 'answer', system, sources, question: userText, history, signal: input.signal });
    attempts = 1;
    let report = await check(answer);
    if (!report.ok) {
      const repairHistory: Turn[] = [...history, { role: 'user', text: `Question: ${question}` }, { role: 'assistant', text: answerText(answer) }];
      const instructions = `${userText}\n\nMargin's checker found problems with your last answer:\n- ${report.problems.join('\n- ')}\nWrite the answer again so every quotation is copied exactly from a search result and every statement about a writer is supported by his own text. Drop any quotation you can't match exactly.`;
      step('Fixing what didn’t check out…');
      answer = await model.cite({ route: 'repair', system, sources, question: instructions, history: repairHistory, signal: input.signal });
      attempts = 2;
      report = await check(answer);
    }
    if (report.ok) {
      const text = answerText(answer);
      return { status: 'answered', speaker, text, segments: toSegments(text, report.quotes, speaker, vs), quotes: report.quotes, notes, checks: report, attempts, ...meta };
    }
    notes.push('Margin couldn’t verify a full answer, so it read the passage and a note it could check.');
    return { ...fallback(sources, speaker, question, got, vs, notes), checks: report, attempts, ...meta };
  } catch (e) {
    if (input.signal?.aborted) throw e;
    if (e instanceof ModelRefusal) {
      notes.push('The model declined this request, so Margin read the passage instead.');
      return { ...fallback(sources, speaker, question, got, vs, notes), attempts, ...meta };
    }
    const code = (e as { code?: unknown })?.code;
    return { ...simple('error', speaker, 'Margin couldn’t reach Claude just now. Try again in a moment.', notes), ...meta, attempts, error: e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e), errorCode: typeof code === 'string' ? code : undefined };
  }
}

// The passage and one genuine note, quoted exactly: an answer Margin can always vouch for.
function fallback(sources: Source[], speaker: Speaker, question: string, got: Gathered, vs: Versification, notes: string[]): Omit<AskResult, 'attempts'> {
  const scripture = sources.find((s) => s.who === 'bsb');
  const note = sources.find((s) => s.who !== 'bsb' && s.authorship === 'genuine');
  const blocks: CitedAnswer['blocks'] = [];
  if (scripture) {
    const verses = scripture.blocks.slice(0, 2).map((b) => b.replace(/^\d+\s/, '')).join(' ');
    blocks.push({ text: `Here is ${formatSpan(scripture.span, vs)}: "${verses}" `, citations: [{ sourceIndex: sources.indexOf(scripture), sourceId: scripture.id, citedText: verses }] });
  }
  if (note) {
    const line = sentences(note.blocks[0])[0];
    blocks.push({ text: `${authorOf(note.who).name} writes: "${line}"`, citations: [{ sourceIndex: sources.indexOf(note), sourceId: note.id, citedText: line }] });
  }
  const answer: CitedAnswer = { blocks };
  const report = verify({ answer, sources, question, speaker: 'host', spans: got.spans, versification: vs });
  const text = answerText(answer);
  return { status: 'fallback', speaker: 'host', text, segments: toSegments(text, report.quotes, 'host', vs), quotes: report.quotes, passages: [], sources: [], notes, invalidRefs: [] };
}
