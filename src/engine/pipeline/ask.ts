// Answering a question, as a chain of checked steps:
// guard → plan passages → validate references → add keyword search → gather attributed sources
// → answer with citations → verify in code → grade claims → one repair → safe fallback.
//
// Each model call costs money, so the chain skips what a question doesn't need: commands and
// saved study guides need no call at all, a passage the question names needs no planning, and
// the grading call runs only where code checks can't vouch for the answer alone.

import type { Versification } from '../bible/canon.ts';
import { booksNamed, findRefs, formatSpan, overlaps, parseRef, spans as refSpans, type Span } from '../bible/refs.ts';
import { ABSENT_VOICES, authorOf, isPersona, type Speaker } from '../corpus/sources.ts';
import type { Corpus } from '../corpus/store.ts';
import { ModelRefusal, type CitedAnswer, type ModelAdapter, type Tier, type Turn } from '../model/types.ts';
import { GRADE_SCHEMA, GRADE_SYSTEM, gradePrompt, HOST_SYSTEM, LEAN, personaSystem, PLAN_SCHEMA, PLAN_SYSTEM, planPrompt } from '../prompts.ts';
import { contentWords, gather, type Gathered, type Source } from '../retrieve/gather.ts';
import { knownPassages } from '../retrieve/known.ts';
import type { PassageIndex } from '../retrieve/search.ts';
import { sentences } from '../text.ts';
import { toSegments, type AudioSegment } from './audio.ts';
import { guard } from './guard.ts';
import { guideKey, type GuideStore } from './guides.ts';
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
  // The grading call: 'auto' (default) runs it only for contested, premise-checking, persona or
  // sensitive answers, where code checks alone can't vouch for the answer; true or false forces it.
  grade?: boolean | 'auto';
  signal?: AbortSignal;
  // Progress for the UI: "Choosing passages…", "Reading Romans 3:21–26…", "Checking quotes…".
  onStep?: (step: string) => void;
}

export interface AskResult {
  status: 'answered' | 'fallback' | 'guarded' | 'offtopic' | 'command' | 'error';
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
  // "Read me Psalm 23": what the app should play, with no model call made.
  command?: { type: 'play'; refs: string[] };
  // A study guide served from storage ('saved') or made by this answer ('made').
  guide?: 'saved' | 'made';
  // What this answer cost, where the model adapter counts tokens.
  costUsd?: number;
  // The checker's findings that sent the first answer back for repair.
  repairedFor?: string[];
  error?: string;
  // The adapter's error code when there is one, e.g. "not_granted" or "rate_limited".
  errorCode?: string;
}

export interface AskDeps {
  corpus: Corpus;
  model: ModelAdapter;
  index?: () => Promise<PassageIndex>;
  guides?: GuideStore;
  // True once the day's spending limit is reached: then only free answers are given.
  overBudget?: () => Promise<boolean>;
}

// Voices listeners ask for that Margin's library doesn't hold. Saying so up front beats reporting
// them from memory, which is where models flatten traditions and invent attributions.
const ASKED_ABSENT: [string, RegExp][] = [
  ['calvin', /\bcalvin\b(?!ism|ist)/i], ['wesley', /\bwesley\b/i], ['luther', /\bluther\b(?!an)/i], ['clarke', /\badam clarke\b/i],
  ['barnes', /\bbarnes\b/i], ['gill', /\bjohn gill\b/i], ['catechism', /\bcatechism\b/i], ['haydock', /\bhaydock\b/i],
  ['aquinas', /^(?![\s\S]*\bcatena\b)[\s\S]*\baquinas\b/i], ['orthodox', /\b(eastern )?orthodox (church|christians?|view|teaching|tradition)\b/i],
  ['pentecostal', /\bpentecostals?\b/i],
];

const MAX_PASSAGES = 3;
const PERSONA_TURN_LIMIT = 8;

// Questions Christian traditions answer differently. The planner flags these too; this catches the
// ones it misses, because the flag is what turns on the balance rules and the lean disclosure.
const CONTESTED = /\b((infant|baby|babies|child(ren)?)['’]?s? baptism|baptiz\w* (babies|infants|a baby|children)|(babies|infants) (be )?baptiz\w*|believers?['’]? baptism|baptism (saves?|regenerat\w*)|rebaptiz\w*|immersion|sprinkl\w*|predestin\w*|calvinis\w*|arminian\w*|free will|(chosen|elect(ed)?) before|once saved,? always saved|eternal security|los(e|t|ing) (your |my |their |his |her )?salvation|never (really |truly )?saved|fall(en)? away|apostasy|persever\w* of the saints|rapture|(great |seven[- ]year )?tribulation|millenni\w*|seventy weeks|70 weeks|antichrist|preteris\w*|dispensational\w*|real presence|transubstantiat\w*|(communion|lord['’]?s supper|eucharist)\W+(is |was )?(just |only |merely )?(a )?(symbol|memorial)|perpetual virgin\w*|immaculate conception|assumption of mary|brothers of jesus|mary (stayed|remained|was always) a virgin|pray(ing)? to (mary|the saints)|purgatory|pray(ing)? for the dead|wom[ae]n (as |be |become )?(pastors?|preachers?|elders?|priests?|bishops?|deacons?)|wom[ae]n (to |should |can |may )?(preach|teach|lead)\w*|speaking in tongues|cessation\w*|gifts? of the spirit today|papacy|the pope|apostolic succession|faith alone|sola fide|sola scriptura|justif\w* by faith|faith (and|without) works|annihilation\w*|universalis\w*|everyone (will be|gets) saved|young earth|six (literal )?days|evolution|divorce and remarriage|remarr\w*|sabbath|pacifis\w*|just war|same[- ]sex|gay marriage|homosexual\w*)\b/i;

// "Read me Psalm 23", "play Romans 8": the app plays the passage; no model call.
const COMMAND = /^\s*(?:please\s+)?(?:read|play|start|put on|listen to|open)(?:\s+me)?\s+/i;
const COMMAND_FILLER = /\b(aloud|out loud|please|again|for me|now|and|the|whole|chapter|book of)\b/gi;
// "What does this mean?" while a passage plays: about that passage, so no planning is needed.
const ABOUT_THIS = /\b(this|that|these) (verse|verses|passage|chapter|psalm|story|parable|part|line|section|reading|bit)\b|\bwhat does (this|that|it) mean\b|\b(here|this)\s*\??\s*$|^\s*(explain|summari[sz]e|recap)\b/i;
// "Are you sure?", "tell me more": stays on the passages the last answer read.
const FOLLOW_UP = /^\s*(are you sure|really\s*\??\s*$|why\s*\??\s*$|how so|tell me more|say more|go on|keep going|what else|can you (expand|explain more|say more)|explain (that|it) more|what do you mean)/i;

const META_TEXT = 'Margin is an AI study aid. It reads the Bible with Matthew Henry, Charles Spurgeon and the Church Fathers, answers from their words, and checks every quotation against the source. When you hear a commentator in character, that is an AI voice drawing on his published words, not the man himself.';
const OFFTOPIC_TEXT = 'Margin is for studying the Bible with its commentators, so that’s outside what I can help with here. Ask me about a passage, a person in Scripture, or a subject like grace, prayer or the church.';
const BUDGET_NOTE = 'Today’s spending limit for questions is reached, so here is the passage with a note Margin can vouch for. Full answers return tomorrow.';
const GUIDE_FLAG = 'This answer will be saved as the study guide for this passage and replayed when the listener asks about it again: give its plain sense in context and each commentator’s main point in his own words, then one question to carry.';

const simple = (status: AskResult['status'], speaker: Speaker, text: string, notes: string[] = []): AskResult => ({
  status, speaker, text, notes, quotes: [], passages: [], sources: [], invalidRefs: [], attempts: 0,
  segments: [{ kind: 'speech', voice: 'host', text, say: text }],
});

const historyText = (h: Turn[]): string =>
  h.slice(-6).map((t) => `${t.role === 'user' ? 'Listener' : 'Margin'}: ${t.text.slice(0, 600)}`).join('\n');

const surname = (who: string) => new RegExp(`\\b${authorOf(who).name.split(' ').pop()!.replace(/[^A-Za-z-]/g, '')}\\b`, 'i');

export async function ask(deps: AskDeps, input: AskInput): Promise<AskResult> {
  const { corpus, model } = deps;
  const vs = corpus.versification;
  const question = input.question.trim();
  const history = input.history ?? [];
  const notes: string[] = [];
  let speaker: Speaker = input.speaker && (input.speaker === 'host' || isPersona(input.speaker)) ? input.speaker : 'host';
  // What the listener is playing, or else the passages the last answer read.
  const lastRefs = [...history].reverse().find((t) => t.role === 'assistant' && t.refs?.length)?.refs ?? [];
  const contextRefs = input.context?.refs.length ? input.context.refs : lastRefs;

  const g = guard(question, speaker);
  if (g.kind === 'fixed') return simple('guarded', 'host', g.text);
  if (g.kind === 'host' && speaker !== 'host') {
    speaker = 'host';
    notes.push(g.reason === 'faiths' ? 'Questions about other faiths are answered by the host, not in character.' : 'Personal questions are answered by the host, not in character.');
  }
  if (speaker !== 'host' && history.filter((t) => t.role === 'assistant').length >= PERSONA_TURN_LIMIT) {
    speaker = 'host';
    notes.push('The host has taken over after a long run in character.');
  }

  // References, titles and quoted lines the question itself contains.
  const inQuestion = findRefs(question, vs, true);
  const titled = knownPassages(question);
  const named = inQuestion.flatMap(({ ref }) => (ref ? [ref] : []));

  // A command to play a passage needs no answer at all.
  if (COMMAND.test(question) && (named.length || titled.length)) {
    const rest = inQuestion.reduce((q, { raw }) => q.replace(raw, ' '), question.replace(COMMAND, '')).replace(COMMAND_FILLER, ' ');
    if (!contentWords(rest).length || titled.length) {
      const refs = named.length ? named.flatMap((r) => refSpans(r, vs)).map((s) => formatSpan(s, vs)) : titled.slice(0, 2);
      return { ...simple('command', 'host', `Playing ${refs.join(' and ')}.`), command: { type: 'play', refs } };
    }
  }

  const step = (s: string) => input.onStep?.(s);
  const capped = deps.overBudget ? await deps.overBudget() : false;
  const books = booksNamed(question);
  const index = deps.index ? await deps.index() : undefined;
  const exact = index?.search(question, 4, { books }).filter((h) => h.score === Infinity) ?? [];

  // 1. Plan which passages to read, unless the question already says.
  const knownPassage = named.length > 0 || titled.length > 0 || exact.length > 0;
  const onContext = contextRefs.length > 0 && !books.length && (ABOUT_THIS.test(question) || FOLLOW_UP.test(question));
  let plan: Plan | undefined;
  if (!knownPassage && !onContext && !capped) {
    step('Choosing passages…');
    try {
      plan = await model.json<Plan>({
        route: 'plan', system: PLAN_SYSTEM, schema: PLAN_SCHEMA as unknown as Record<string, unknown>, signal: input.signal,
        prompt: planPrompt(question, { context: input.context?.label ?? (contextRefs.join(', ') || undefined), history: historyText(history) }),
      });
    } catch (e) {
      if (input.signal?.aborted) throw e;
      notes.push('Passage planning failed, so Margin searched the library instead.');
    }
    if (plan?.intent === 'offtopic') return { ...simple('offtopic', 'host', OFFTOPIC_TEXT), plan };
    if (plan?.intent === 'meta') return { ...simple('offtopic', 'host', META_TEXT), plan };
  }

  // 2. Validate every reference against the canon, then add context and keyword search.
  const invalidRefs: string[] = [];
  const chosen: Span[] = [];
  const take = (s: Span) => { if (chosen.length < MAX_PASSAGES && !chosen.some((x) => overlaps(x, s))) chosen.push(s); };
  const takeRef = (raw: string) => { const r = parseRef(raw, vs); if (r) refSpans(r, vs).slice(0, 2).forEach(take); return !!r; };
  // References the listener named come first, whatever the planner chose; then passages the
  // question names by title ("the Good Samaritan") or quotes, which the planner can forget.
  for (const r of named) refSpans(r, vs).slice(0, 2).forEach(take);
  for (const raw of titled.slice(0, 2)) takeRef(raw);
  for (const h of exact) take(h.span);
  const namedCount = chosen.length;
  for (const p of plan?.passages ?? []) if (!takeRef(p)) invalidRefs.push(p);
  if (contextRefs.length && (plan?.intent === 'followup' || !chosen.length)) contextRefs.forEach(takeRef);
  // Keyword matches fill in only for a topic; a passage the listener named isn't padded out.
  if (!namedCount && chosen.length < 2 && plan?.intent !== 'passage' && plan?.intent !== 'followup' && !onContext && index) {
    for (const h of index.search(plan?.search ? `${question} ${plan.search}` : question, 4, { books })) { if (chosen.length >= 3) break; take(h.span); }
  }

  // 3. Gather attributed sources for the speaker.
  if (chosen.length) step(`Reading ${chosen.map((x) => formatSpan(x, vs)).join(', ')}…`);
  // A follow-up on the same passages gathers exactly what the thread's first question did, so
  // the sources match what was sent before and are read from the cache.
  const firstAsked = history.find((t) => t.role === 'user')?.text;
  const sameThread = !!firstAsked && lastRefs.length > 0 && sameSpans(chosen, lastRefs, vs);
  const focusQuestion = sameThread ? firstAsked! : question;
  const focusRefs = sameThread ? findRefs(focusQuestion, vs, true) : inQuestion;
  // What the question is about beyond its references, so a long passage brings the right notes.
  const lineSpans = sameThread ? [] : exact.flatMap((h) => (h.verse ? [{ ...h.span, a: h.verse, b: h.verse }] : []));
  const focusSpans = [...focusRefs.flatMap(({ ref }) => (ref ? refSpans(ref, vs) : [])), ...lineSpans].filter((x) => x.b - x.a < 12);
  const focus = focusRefs.reduce((q, { raw }) => q.replace(raw, ' '), focusQuestion);
  const got: Gathered = await gather(corpus, chosen, { speaker, voices: input.voices, focus, focusSpans });
  const sources = got.sources;
  const passages = got.spans.map((s) => formatSpan(s, vs));
  const meta = { passages, invalidRefs, plan, sources: sources.map(({ id, title, who, authorship, flags: f }) => ({ id, title, who, authorship, flags: f })) };
  if (!sources.length) {
    const text = 'I couldn’t find passages for that in Margin’s library. Try naming a passage, or ask about a subject in Scripture.';
    return { ...simple('fallback', speaker, text, notes), ...meta };
  }

  // A plain "what does this passage mean?" is answered once and then replayed from storage.
  const asksWhole = !history.length && got.spans.length === 1 && chosen.length > 0 && !contentWords(focus).length;
  const key = asksWhole && deps.guides ? guideKey(speaker, got.spans[0]) : undefined;
  if (key) {
    const saved = await deps.guides!.get(key);
    if (saved) return { ...saved, status: 'answered', notes: [...notes, ...saved.notes.filter((n) => !notes.includes(n)), 'From the saved study guide for this passage.'], invalidRefs, attempts: 0, plan, guide: 'saved', costUsd: 0 };
  }
  if (capped) {
    notes.push(BUDGET_NOTE);
    return { ...fallback(sources, speaker, question, got, vs, notes), attempts: 0, ...meta };
  }

  const commentators = [...new Set(sources.filter((s) => s.who !== 'bsb').map((s) => s.who))];
  const flags: string[] = [];
  const contested = !!plan?.contested || CONTESTED.test(question);
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
  const absent = ASKED_ABSENT.filter(([, re]) => re.test(question)).map(([k]) => ABSENT_VOICES[k]);
  if (absent.length) {
    flags.push(`The listener asks about ${absent.join(' and ')}, whose writing isn’t in Margin’s library. Say so plainly first, report nothing of theirs from memory, and then say what the voices in the library do say.`);
    notes.push(`Margin’s library doesn’t include ${absent.join(' or ')}.`);
  }
  const polemic = sources.filter((s) => s.flags.includes('polemic')).map((s) => s.id);
  if (polemic.length) flags.push(`These sources contain language about Jews or Catholics that needs care: ${polemic.join(', ')}. Follow the rule on polemic.`);
  if (sources.some((s) => s.flags.includes('missing-verses'))) flags.push('The BSB leaves out a verse in this passage because the oldest manuscripts don’t have it; it appears only in later ones. If the listener asks about that verse, say so.');
  if (key) flags.push(GUIDE_FLAG);
  const userText = `Question: ${question}${flags.length ? `\n\nNotes from Margin, not from the listener:\n- ${flags.join('\n- ')}` : ''}`;

  // Judgment-heavy answers get the strongest model; a guide is paid for once, so it does too.
  const sensitive = contested || !!plan?.false_premise || speaker !== 'host' || absent.length > 0 || polemic.length > 0;
  const tier: Tier = sensitive || key ? 'hard' : 'standard';
  const policy = input.grade ?? 'auto';
  const grading = policy === true || (policy === 'auto' && sensitive);

  // 4. Answer with citations, check, grade where needed, and repair once.
  const system = speaker === 'host' ? HOST_SYSTEM : personaSystem(speaker);
  // The grader reads only what the answer used: what it cited, the writers it names, and the
  // passages it refers to by reference, not every source gathered.
  const forGrader = (answer: CitedAnswer): Source[] => {
    const cited = new Set(answer.blocks.flatMap((b) => b.citations.map((c) => c.sourceId)));
    const text = answerText(answer);
    const referred = findRefs(text, vs).flatMap(({ ref }) => (ref ? refSpans(ref, vs) : []));
    const used = sources.filter((s) => cited.has(s.id)
      || (s.who !== 'bsb' && surname(s.who).test(text))
      || (s.who === 'bsb' && referred.some((r) => overlaps(r, s.span))));
    return used.length ? used : sources;
  };
  // The facts about its writers the answering model was given, so repeating them isn't flagged.
  const facts = [LEAN, ...commentators.map((w) => { const a = authorOf(w); return `${a.name}${a.years ? ` (${a.years})` : ''}: ${a.label}.`; })].join('\n');
  const check = async (answer: CitedAnswer): Promise<CheckReport> => {
    step('Checking every quotation…');
    let report = verify({ answer, sources, question, speaker, spans: got.spans, versification: vs, contested });
    if (report.ok && grading) {
      try {
        const grade = await model.json<GradeReport>({
          route: 'grade', system: GRADE_SYSTEM, schema: GRADE_SCHEMA as unknown as Record<string, unknown>, signal: input.signal,
          prompt: gradePrompt(answerText(answer), sourcesForGrader(forGrader(answer)), contested, facts), tier: contested ? 'hard' : 'standard',
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
  let repairedFor: string[] | undefined;
  try {
    step('Writing the answer…');
    let answer = await model.cite({ route: 'answer', system, sources, question: userText, history, signal: input.signal, tier });
    attempts = 1;
    let report = await check(answer);
    if (!report.ok) {
      repairedFor = report.problems;
      const repairHistory: Turn[] = [...history, { role: 'user', text: `Question: ${question}` }, { role: 'assistant', text: answerText(answer) }];
      const instructions = `${userText}\n\nMargin's checker found problems with your last answer:\n- ${report.problems.join('\n- ')}\nWrite the answer again so every quotation is copied exactly from a search result and every statement about a writer is supported by his own text. Drop any quotation you can't match exactly.`;
      step('Fixing what didn’t check out…');
      answer = await model.cite({ route: 'repair', system, sources, question: instructions, history: repairHistory, signal: input.signal, tier: 'hard' });
      attempts = 2;
      report = await check(answer);
    }
    if (report.ok) {
      const text = answerText(answer);
      const result: AskResult = { status: 'answered', speaker, text, segments: toSegments(text, report.quotes, speaker, vs), quotes: report.quotes, notes, checks: report, attempts, repairedFor, ...meta };
      if (key) {
        await deps.guides!.set(key, { speaker, text, segments: result.segments, quotes: result.quotes, passages, sources: meta.sources, notes: [...notes], made: new Date().toISOString() });
        result.guide = 'made';
      }
      return result;
    }
    notes.push('Margin couldn’t verify a full answer, so it read the passage and a note it could check.');
    return { ...fallback(sources, speaker, question, got, vs, notes), checks: report, attempts, repairedFor, ...meta };
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

// Whether the chosen passages are the ones a previous answer read.
function sameSpans(chosen: Span[], refs: string[], vs: Versification): boolean {
  const before = refs.flatMap((r) => { const p = parseRef(r, vs); return p ? refSpans(p, vs) : []; });
  return chosen.length === before.length && chosen.every((s, i) => overlaps(s, before[i]));
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
    const line = sentences(note.blocks[0].replace(/^…\s*/, ''))[0];
    blocks.push({ text: `${authorOf(note.who).name} writes: "${line}"`, citations: [{ sourceIndex: sources.indexOf(note), sourceId: note.id, citedText: line }] });
  }
  const answer: CitedAnswer = { blocks };
  const report = verify({ answer, sources, question, speaker: 'host', spans: got.spans, versification: vs });
  const text = answerText(answer);
  return { status: 'fallback', speaker: 'host', text, segments: toSegments(text, report.quotes, 'host', vs), quotes: report.quotes, passages: [], sources: [], notes, invalidRefs: [] };
}
