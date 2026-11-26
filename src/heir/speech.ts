// Speech to text for "Say it from memory": the words to listen out for, made safe for ElevenLabs Scribe's keyterms
// (at most 50 here, each at most 5 words and 50 characters, none of < > { } [ ] \). Used by /api/heir/transcribe.

const MAX_TERMS = 50;

export function cleanTerms(raw: string[]): string[] {
  const out: string[] = [];
  for (const t of raw) {
    const k = t.replace(/[<>{}[\]\\]/g, '').replace(/\s+/g, ' ').trim();
    if (!k || k.length > 50 || k.split(' ').length > 5 || out.includes(k)) continue;
    out.push(k);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

// The words to listen out for when an answer is said aloud (sent to Scribe as keyterms): names, the old words of the
// catechisms and the KJV, and long words a recognizer is likely to get wrong. Never the whole answer, so a word the person
// did not say is not "heard" for them. The same rules as the phone app's `speechHints`.
const OLD = new Set([
  'hath', 'hast', 'doth', 'dost', 'thee', 'thou', 'thy', 'thine', 'ye', 'unto', 'art', 'shalt', 'wilt', 'saith', 'spake', 'shew',
  'begotten', 'wherefore', 'whereby', 'wherein', 'whereof', 'therein', 'thereof', 'thereby', 'lo', 'behold', 'yea', 'nay',
  'verily', 'hallowed', 'trespasses', 'amen', 'selah', 'cometh', 'goeth', 'giveth', 'maketh', 'leadeth', 'restoreth',
]);
const EDGES = /^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu;

export function speechHints(text: string, max = MAX_TERMS): string[] {
  const out: string[] = [];
  const raw = text.split(/\s+/);
  for (let i = 0; i < raw.length && out.length < max; i++) {
    const w = raw[i].replace(EDGES, '');
    if (!w) continue;
    const lower = w.toLowerCase();
    const startsSentence = i === 0 || /[.!?;:]$/.test(raw[i - 1]);
    const name = w[0] !== w[0].toLowerCase() && !startsSentence && w !== 'I';
    if ((OLD.has(lower) || name || w.length >= 9) && !out.some((x) => x.toLowerCase() === lower)) out.push(w);
  }
  return out;
}
