// Checks a message before any model call. Crisis, sacramental requests and "are you real?"
// get fixed, reviewed answers instead of generated ones; personal counsel moves to the host.

import { authorOf, type Speaker } from '../corpus/sources.ts';

export type Guard =
  | { kind: 'ok' }
  | { kind: 'crisis'; text: string }
  | { kind: 'sacramental'; text: string }
  | { kind: 'identity'; text: string }
  // Personal decisions are answered by the host, from Scripture, with care, never in a persona.
  | { kind: 'counsel' };

const CRISIS = /\b(kill(ing)? myself|suicid\w*|end (it all|my life)|want(ed)? to die|don'?t want to (live|be here)|self[- ]?harm|hurt(ing)? myself|no reason to live|can'?t go on)\b/i;
const SACRAMENTAL = /\b(absolve me|absolution|hear my confession|i (want|need) to confess( to you)?|bless (me|my|this|us)\b|give me (a|your) blessing|last rites|(can|will|would) you forgive (me|my sins)|pronounce me forgiven|baptize me)\b/i;
const IDENTITY = /\b(are you (real|alive|really|actually|a (real )?(person|human|man|priest|pastor|bot|robot|machine)|an? ai)|is this (really|actually) (him|you)|am i (talking|speaking) to (a|an|the real)|who am i talking to)\b/i;
const COUNSEL = /\b(should i (leave|divorce|marry|quit|forgive|confront|move)|tell me what to do about|pretend (you'?re|you are) my (pastor|priest|counsell?or|father|confessor)|be my (pastor|priest|counsell?or|spiritual director))\b/i;

export const CRISIS_TEXT = 'I’m really glad you said something. If you might hurt yourself or you’re in danger, please call or text 988 now if you’re in the US, or your local emergency number, and reach someone you trust right away. You don’t have to carry this alone. When you’re ready, I can read Psalm 34 or Psalm 23 with you, but please reach out to someone first.';

export function guard(message: string, speaker: Speaker): Guard {
  if (CRISIS.test(message)) return { kind: 'crisis', text: CRISIS_TEXT };
  if (SACRAMENTAL.test(message)) {
    return {
      kind: 'sacramental',
      text: 'I can’t do that. Margin is an AI study aid, not a priest or a pastor, so it can’t hear a confession, absolve, or bless. That belongs to your church and to God himself. If it helps, 1 John 1:5–10 and Psalm 51 speak to confession and forgiveness, and I can read them with the commentators.',
    };
  }
  if (speaker !== 'host' && IDENTITY.test(message)) {
    const name = authorOf(speaker).name;
    return {
      kind: 'identity',
      text: `This is Margin, an AI. The voice you’re hearing is an AI rendering that draws on ${name}’s published words, not ${name} himself. I can keep going in his words, or the host can compare other writers.`,
    };
  }
  if (COUNSEL.test(message)) return { kind: 'counsel' };
  return { kind: 'ok' };
}
