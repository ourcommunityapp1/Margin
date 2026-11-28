// The coach's judgment that doesn't need a model: which next move to recommend, when to step
// back, how a pause is handled, and the check that keeps every prompt tied to the note's own
// words. Kept pure so each rule can be tested.

import type { Prompt } from './types.ts';
import { containsWords, sentencesOf, wordCount, wordsOf } from './words.ts';

// ---------------------------------------------------------------------------------------------
// COACH TONE: the one setting for how much the coach pushes back.
// STILL OPEN: decide this with the owner. The current lean is 'gentle'.
//   'gentle': points at a gap and asks; never argues the other side.
//   'direct': may name a contradiction plainly and ask which statement holds.
// ---------------------------------------------------------------------------------------------
export type CoachTone = 'gentle' | 'direct';
export const COACH_TONE: CoachTone = 'gentle';

// How long the speaker must be silent before their last sentences come back into focus.
export const REREAD_AFTER_MS = 6000;
export const REREAD_SENTENCES = 3;

// A long pause while talking brings the last few sentences back into view. It never raises a
// question, and typing ignores pauses altogether, since pausing is normal when you type.
export function pauseReaction(s: { mode: 'talk' | 'type'; listening: boolean; silentMs: number; hasText: boolean }): 'reread' | 'none' {
  if (s.mode !== 'talk' || !s.listening || !s.hasText) return 'none';
  return s.silentMs >= REREAD_AFTER_MS ? 'reread' : 'none';
}

// Words a finished sentence doesn't end on.
const DANGLING = new Set([
  'and', 'but', 'or', 'so', 'because', 'when', 'if', 'that', 'which', 'while', 'although', 'though',
  'to', 'the', 'a', 'an', 'of', 'with', 'for', 'like', 'then', 'than', 'whether', 'until', 'unless', 'is', 'was',
]);

export interface Spot { paragraph: number; quote: string }

// Places where a thought was left unfinished: a paragraph that stops without closing punctuation,
// or a sentence that trails off.
export function unfinishedSpots(paragraphs: string[]): Spot[] {
  const spots: Spot[] = [];
  paragraphs.forEach((p, paragraph) => {
    const sentences = sentencesOf(p);
    sentences.forEach((s, i) => {
      const last = i === sentences.length - 1;
      const trailsOff = /(…|\.\.\.|—|--)["'”’]?$/.test(s);
      const open = last && !/[.!?]["'”’)]*$/.test(s);
      const tail = wordsOf(s);
      const dangling = tail.length > 0 && DANGLING.has(tail[tail.length - 1]);
      if (!(trailsOff || open || (last && dangling))) return;
      if (tail.length < 2) return;
      const words = s.replace(/[\s.…—-]+$/u, '').split(/\s+/);
      spots.push({ paragraph, quote: words.slice(-4).join(' ') });
    });
  });
  return spots;
}

export type MoveKind = 'keep_going' | 'come_back' | 'read_over';
export interface Move { kind: MoveKind; line: string; spot?: Spot }

export const SHORT_NOTE_WORDS = 60;
export const LONG_NOTE_WORDS = 220;
// Reframing is offered only once there is enough material, and only when the user chooses it.
export const REFRAME_MIN_WORDS = 80;

// The one next move the coach recommends, ranked. "Keep going" is the default and the most
// common. "Stuck?" and "Reframe" sit lower on the ladder and are only ever chosen by the user,
// so they are never returned here.
export function nextMove(s: { paragraphs: string[]; rereadSinceChange: boolean }): Move {
  const words = wordCount(s.paragraphs.join(' '));
  if (words < SHORT_NOTE_WORDS) return { kind: 'keep_going', line: 'You’re mid-thought. Keep talking.' };
  const spots = unfinishedSpots(s.paragraphs);
  const spot = spots[spots.length - 1];
  if (spot) return { kind: 'come_back', line: `You left something unfinished here: “…${spot.quote}”`, spot };
  if (words >= LONG_NOTE_WORDS && !s.rereadSinceChange) return { kind: 'read_over', line: 'You’ve said a lot. Read it back from the top.' };
  return { kind: 'keep_going', line: 'There’s more here. Keep talking.' };
}

export const canReframe = (paragraphs: string[]) => wordCount(paragraphs.join(' ')) >= REFRAME_MIN_WORDS;

// Help for "Stuck?" that needs no model: it hands the user's own last words back to them.
export type Stuck = 'point' | 'thought';
export function stuckFallback(kind: Stuck, paragraphs: string[]): Prompt[] {
  const sentences = sentencesOf(paragraphs.join('\n'));
  const last = sentences[sentences.length - 1];
  if (!last) return [];
  const quote = last.split(/\s+/).slice(-8).join(' ').replace(/[.…]+$/u, '');
  return kind === 'point'
    ? [{ text: 'Your last line was this. If the whole note had to fit in one breath, what would you say?', quote }]
    : [{ text: 'You stopped here. Start again from these words and say what comes next, however rough.', quote }];
}

// Flattery and therapy-speak the coach must never use.
const BANNED = [
  /\bso valid\b/i, /\bit sounds like you(?:'|’)?re feeling\b/i, /\bit sounds like you feel\b/i, /\bproud of you\b/i,
  /\b(?:great|wonderful|beautiful|amazing|powerful|brave|insightful|profound) (?:point|insight|thought|reflection|question|observation|work|job)\b/i,
  /\bthank you for sharing\b/i, /\bi hear you\b/i, /\byou should\b/i, /\bhave you considered\b/i,
];

export const MAX_PROMPTS = 3;

// Keep only prompts that point at the note's own words: each must carry a quote found in the
// note, word for word. A prompt that could apply to any note is dropped, as is anything that
// flatters or leads. At most three survive.
export function groundedPrompts(prompts: Prompt[], text: string, max = MAX_PROMPTS): Prompt[] {
  const hay = wordsOf(text);
  const seen = new Set<string>();
  const kept: Prompt[] = [];
  for (const p of prompts) {
    const body = (p?.text ?? '').trim();
    const quote = (p?.quote ?? '').trim().replace(/^[“"….]+|[”"…]+$/gu, '').trim();
    if (!body || !quote) continue;
    if (!containsWords(hay, quote)) continue;
    if (BANNED.some((re) => re.test(body))) continue;
    const key = wordsOf(body).join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({ text: body, quote });
    if (kept.length >= max) break;
  }
  return kept;
}

// Dark content: the coach quietly steps back. No suggestions; the note is still saved.
// Deliberately narrow: it only catches plain statements, and the model is asked to make the
// same call for anything subtler.
//
// TODO(owner decision): when a note suggests the writer may be at risk of self-harm, the owner
// may want support resources shown (in the US, the 988 Suicide & Crisis Lifeline: call or text
// 988) rather than only going quiet. Not built yet; raise it with the owner before shipping
// to anyone else.
const DARK = [
  /\bkill(?:ing)? myself\b/i, /\bend(?:ing)? my (?:own )?life\b/i, /\bsuicid(?:e|al)\b/i, /\bhurt(?:ing)? myself\b/i,
  /\bself[- ]harm\b/i, /\bdon(?:'|’)?t want to (?:be alive|live anymore|be here anymore)\b/i, /\bbetter off without me\b/i,
  /\bwant to die\b/i, /\bcut(?:ting)? myself\b/i,
];
export const looksDark = (text: string) => DARK.some((re) => re.test(text));
