// Checks a message before any model call. Requests a study aid must not meet with generated words
// (a crisis, sacraments, prayer, playing someone's pastor, rulings on church practice, "are you
// real?", a commentator's views on other faiths) get fixed, reviewed answers. Personal decisions
// and grief move from a commentator's voice to the host.

import { authorOf, type Speaker } from '../corpus/sources.ts';

export type Guard =
  | { kind: 'ok' }
  | { kind: 'fixed'; reason: 'crisis' | 'sacramental' | 'prayer' | 'role' | 'practice' | 'identity' | 'polemic'; text: string }
  // Answered by the host, from Scripture, with care, never in a persona.
  | { kind: 'host'; reason: 'counsel' | 'grief' | 'faiths' };

const CRISIS = /\b(kill(ing)? myself|suicid\w*|end (it all|my life)|want(ed)? to die|don'?t want to (live|be here)|self[- ]?harm|hurt(ing)? myself|no reason to live|can'?t go on)\b/i;
const SACRAMENTAL = /\b(absolve me|absolution|hear my confession|i (want|need) to confess( to you)?|bless (me|my|this|us)\b|give me (a|your) blessing|last rites|(can|will|would) you forgive (me|my sins)|pronounce me forgiven|baptize me)\b/i;
const PRAYER = /\b(pray (over|for|with) (me|us|my)|say a prayer (for|over) (me|us|my)|(will|would|can|could) you (please )?pray\b|lead (me|us) in prayer|write (me |us )?a prayer)/i;
const ROLE = /\b(pretend|act|play|role-?play)\b[^.?!]{0,20}\b(you'?re|you are|to be|as)\s+(my|a|our)\s+(pastor|priest|minister|counsell?or|therapist|confessor|spiritual (director|father|mother))\b|\bbe my (pastor|priest|minister|counsell?or|therapist|confessor|spiritual (director|father|mother))\b/i;
// A ruling on how to perform a sacrament or rite ("can I baptize my baby with Gatorade?").
const PRACTICE = /\b(can|may|could|should|is it (ok|okay|alright|valid|allowed) (for|if|to))\s+(i|we|my \w+|you)\b[^.?!]{0,40}\b(baptiz\w*|baptis\w*|(take|give|serve|have) (communion|the eucharist|the lord'?s supper)|consecrat\w*|ordain\w*|anoint\w* (me|him|her|them|my)|officiat\w*)/i;
const IDENTITY = /\b(are you (real|alive|really|actually|a (real )?(person|human|man|priest|pastor|bot|robot|machine)|an? ai)|is this (really|actually) (him|you)|am i (talking|speaking) to (a|an|the real)|who am i talking to)\b/i;
const OTHER_FAITHS = /\b(jews?|jewish|judaism|catholics?|papists?|the pope|popery|protestants?|muslims?|islam|mohammedans?|heretics?|heathens?|pagans?)\b/i;
const OPINION = /\b(what (do|did) you (really |honestly |actually )?(think|feel|believe)|your (real |honest )?(view|opinion|take|thoughts)|how do you feel|tell me what you (really |honestly )?think|be honest)\b/i;
const COUNSEL = /\b(should i (leave|divorce|marry|quit|forgive|confront|move|break up)|tell me what to do about)\b/i;
const GRIEF = /\b(died|passed away|funeral|grie(f|ving|ve)|miscarr\w*|lost my (mom|dad|mother|father|wife|husband|son|daughter|child|baby|brother|sister|friend|grand\w+))\b/i;

export const CRISIS_TEXT = 'I’m really glad you said something. If you might hurt yourself or you’re in danger, please call or text 988 now if you’re in the US, or your local emergency number, and reach someone you trust right away. You don’t have to carry this alone. When you’re ready, I can read Psalm 34 or Psalm 23 with you, but please reach out to someone first.';

const SACRAMENTAL_TEXT = 'I can’t do that. Margin is an AI study aid, not a priest or a pastor, so it can’t hear a confession, absolve, or bless. That belongs to your church and to God himself. If it helps, 1 John 1:5–10 and Psalm 51 speak to confession and forgiveness, and I can read them with the commentators.';

const PRAYER_TEXT = 'I can’t pray for you the way a person can. Margin is an AI study aid, not a pastor, and prayer belongs between you, God and the people who know you. Someone in your church would be glad to pray with you. If it helps, I can read you one of Scripture’s own prayers, like Psalm 23, Psalm 121 or the Lord’s Prayer in Matthew 6, with the commentators.';

const ROLE_TEXT = 'I can’t be your pastor. Margin is an AI study aid, and a decision like this needs someone who knows you and can walk with you: your pastor, a counselor, or a friend you trust. If anyone is in danger, call 911 first. I can read what Scripture and the commentators say on the subject, but I won’t tell you what to decide.';

const PRACTICE_TEXT = 'That’s a question about how your church practices the sacraments, so it’s one for your pastor or priest, who can answer for your church. Margin is an AI study aid and can’t give rulings like that. If it would help, I can read what Scripture and the commentators say about it, like Matthew 28:16–20 or Acts 8:26–40 on baptism.';

export function guard(raw: string, speaker: Speaker): Guard {
  // Phones type curly apostrophes ("don’t"); the patterns are written with straight ones.
  const message = raw.replace(/[‘’ʼ′]/g, "'");
  if (CRISIS.test(message)) return { kind: 'fixed', reason: 'crisis', text: CRISIS_TEXT };
  if (SACRAMENTAL.test(message)) return { kind: 'fixed', reason: 'sacramental', text: SACRAMENTAL_TEXT };
  if (PRAYER.test(message)) return { kind: 'fixed', reason: 'prayer', text: PRAYER_TEXT };
  if (ROLE.test(message)) return { kind: 'fixed', reason: 'role', text: ROLE_TEXT };
  if (PRACTICE.test(message)) return { kind: 'fixed', reason: 'practice', text: PRACTICE_TEXT };
  if (speaker !== 'host') {
    const name = authorOf(speaker).name;
    if (IDENTITY.test(message)) {
      return {
        kind: 'fixed', reason: 'identity',
        text: `This is Margin, an AI. The voice you’re hearing is an AI rendering that draws on ${name}’s published words, not ${name} himself. I can keep going in his words, or the host can compare other writers.`,
      };
    }
    if (OTHER_FAITHS.test(message)) {
      if (!OPINION.test(message)) return { kind: 'host', reason: 'faiths' };
      const jewish = /\bjew|judaism/i.test(message);
      const chrysostom = speaker === 'chrysostom' && jewish
        ? ' Chrysostom’s sermons against Judaizing Christians spoke of Jews in language that was later used to justify hatred.'
        : '';
      return {
        kind: 'fixed', reason: 'polemic',
        text: `I won’t speak as ${name} about other faiths. Writers of his time often wrote harshly about them, and Margin doesn’t put those words in a living voice.${chrysostom} The host can tell you how the commentators in Margin’s library read the passages you’re asking about${jewish ? ', such as Romans 9 to 11 on Israel' : ''}.`,
      };
    }
  }
  if (COUNSEL.test(message)) return { kind: 'host', reason: 'counsel' };
  if (GRIEF.test(message)) return { kind: 'host', reason: 'grief' };
  return { kind: 'ok' };
}
