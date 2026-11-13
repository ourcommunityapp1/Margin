// The one rule, made checkable: every word on the page is the user's. Formatting may add
// punctuation, capitals and paragraph breaks, and nothing else. These functions compare text by
// its words alone, so any pass that adds, drops, swaps or reorders a word is caught and thrown away.

// The words of a text, lowercased, with punctuation and spacing removed. Apostrophes vanish
// ("don't" and "dont" are the same word); hyphens and dashes separate words.
export function wordsOf(text: string): string[] {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['‘’ʼ`]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export interface WordCheck {
  ok: boolean;
  // Where the two first differ, when they do.
  at?: number;
  expected?: string;
  got?: string;
}

// Does `formatted` hold exactly the words of `original`, in order?
export function sameWords(original: string, formatted: string): WordCheck {
  const a = wordsOf(original);
  const b = wordsOf(formatted);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return { ok: false, at: i, expected: a[i], got: b[i] };
  }
  return { ok: true };
}

// Do the words of `phrase` appear in `text`, together and in order?
export function containsWords(text: string | string[], phrase: string): boolean {
  const hay = typeof text === 'string' ? wordsOf(text) : text;
  const needle = wordsOf(phrase);
  if (!needle.length) return false;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

// Sentences, split after closing punctuation. An unfinished last sentence is kept as it is.
export function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…]["'”’)]*)\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export const wordCount = (text: string) => wordsOf(text).length;

const PUNCTUATION = /[.,;:!?…—–"“”()]/g;
export const punctuationCount = (text: string) => (text.match(PUNCTUATION) ?? []).length;

// The formatting the app can do with no AI at all: tidy the spacing, start each paragraph with a
// capital, and break paragraphs where the speaker paused for a long time (marked by a blank
// line). It never adds closing punctuation, because it can't know the thought is finished.
export function lightFormat(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((p) => p.replace(/^(\P{L}*)(\p{Ll})/u, (_, lead: string, c: string) => lead + c.toUpperCase()));
}

// A stand-in title when the AI isn't available: the opening words of the note.
export function fallbackTitle(text: string): string {
  const all = wordsOf(text);
  if (all.length < 6) return '';
  const first = sentencesOf(text)[0] ?? '';
  const words = first.split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:!?…—–-]+$/u, '');
  return words.replace(/^(\p{Ll})/u, (c) => c.toUpperCase());
}

// The last few sentences of a note, and everything before them, for rereading after a pause.
export function splitForReread(paragraphs: string[], count = 3): { before: string[]; focus: string[] } {
  const before = [...paragraphs];
  const focus: string[] = [];
  let left = count;
  while (left > 0 && before.length) {
    const last = before.pop()!;
    const s = sentencesOf(last);
    if (s.length <= left) {
      focus.unshift(last);
      left -= s.length;
    } else {
      const cut = s.length - left;
      // Split the paragraph at the sentence boundary without touching its words.
      let index = 0;
      for (let i = 0; i < cut; i++) index = last.indexOf(s[i], index) + s[i].length;
      before.push(last.slice(0, index).trimEnd());
      focus.unshift(last.slice(index).trimStart());
      left = 0;
    }
  }
  return { before, focus };
}

// Anything that reads as structure rather than punctuation: headings, list marks, emphasis.
const STRUCTURE = /^\s*(#{1,6}\s|[-*•]\s|\d+[.)]\s|>)|[*_#`]{2,}|^\s*[\p{L} ]{1,40}:\s*$/mu;

// The gate every formatting pass goes through. A proposal is used only if it holds exactly the
// spoken words, in order, with nothing but punctuation, capitals and paragraph breaks added.
// Otherwise it is thrown away and the plain local formatting is used instead.
export function acceptFormatting(raw: string, proposed: unknown): { paragraphs: string[]; accepted: boolean; reason?: string } {
  const fallback = (reason: string) => ({ paragraphs: lightFormat(raw), accepted: false, reason });
  if (!Array.isArray(proposed) || !proposed.every((p) => typeof p === 'string')) return fallback('not a list of paragraphs');
  const paragraphs = (proposed as string[]).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!paragraphs.length) return fallback('empty');
  if (paragraphs.some((p) => STRUCTURE.test(p))) return fallback('added structure');
  const check = sameWords(raw, paragraphs.join(' '));
  if (!check.ok) return fallback(`words changed at ${check.at}: expected "${check.expected ?? ''}", got "${check.got ?? ''}"`);
  return { paragraphs, accepted: true };
}
