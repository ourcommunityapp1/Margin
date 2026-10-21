// Text helpers shared by retrieval, verification and speech.

export const words = (s: string): number => (String(s).match(/\S+/g) || []).length;

// Folds typographic variants so a quotation can be matched against its source.
export function normalize(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[‘’ʼ′`]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—‒]/g, '-')
    .replace(/[ \s]+/g, ' ')
    .trim()
    .replace(/^["'.,;:…\s-]+|["'.,;:…\s-]+$/g, '');
}

// Strips punctuation as well, for tolerant matching of a quotation split by an ellipsis.
export const loose = (s: string): string => normalize(s).replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

// Quotations at the top level of a text, allowing quotes inside quotes: the Bible's own speech
// marks (“If anyone is unwilling to work…”) often sit inside the quotation that cites them.
// “ opens and ” closes; a straight " closes the innermost open straight quote or opens one.
// A quotation left open at the end is not returned.
export function quoteSpans(text: string): { start: number; end: number; inner: string }[] {
  const out: { start: number; end: number; inner: string }[] = [];
  const stack: { ch: string; at: number }[] = [];
  const close = (opener: string, i: number) => {
    let k = stack.length - 1;
    while (k >= 0 && stack[k].ch !== opener) k--;
    if (k < 0) return false;
    const open = stack[k];
    stack.length = k;
    if (!k) out.push({ start: open.at, end: i + 1, inner: text.slice(open.at + 1, i) });
    return true;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '“') stack.push({ ch, at: i });
    else if (ch === '”') close('“', i);
    else if (ch === '"' && !close('"', i)) stack.push({ ch, at: i });
  }
  return out;
}

// Whether a quotation is still open at the end of the text.
export function inQuote(text: string): boolean {
  let depth = 0;
  let straight = false;
  for (const ch of text) {
    if (ch === '“') depth++;
    else if (ch === '”' && depth) depth--;
    else if (ch === '"') straight = !straight;
  }
  return depth > 0 || straight;
}

const ABBR = /\b(ver|vers|ch|chap|viz|i\.e|e\.g|cf|St|Mr|Dr|vol|Matt|Rom|Gen|Isa|Ps|Heb|Cor|Gal|Eph|Col|Jn|Hom|Serm|Tract|ibid|vs|cp)\./g;

// Splits prose into sentences without breaking on "ver." or "St." style abbreviations.
export function sentences(text: string): string[] {
  const guarded = String(text).replace(/\s*\n\s*/g, ' ').replace(ABBR, (m) => m.replace(/\./g, '․'));
  const parts = guarded.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)/g) || [guarded];
  return parts.map((p) => p.trim().replace(/․/g, '.')).filter(Boolean);
}

export const paragraphs = (text: string): string[] => String(text).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

// Cuts to a word limit, preferring to end on a sentence boundary.
export function clipWords(text: string, limit: number): { text: string; clipped: boolean } {
  const w = String(text).split(/\s+/);
  if (w.length <= limit) return { text, clipped: false };
  let cut = w.slice(0, limit).join(' ');
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (end > cut.length * 0.5) cut = cut.slice(0, end + 1);
  return { text: cut, clipped: true };
}

// Groups sentences into citable blocks of roughly `target` words, so a citation points at a sentence or two.
export function blocks(text: string, target = 45): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  let n = 0;
  for (const para of paragraphs(text)) {
    for (const s of sentences(para)) {
      const k = words(s);
      if (n && n + k > target) { out.push(cur.join(' ')); cur = []; n = 0; }
      cur.push(s); n += k;
    }
    if (cur.length) { out.push(cur.join(' ')); cur = []; n = 0; }
  }
  return out;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// Spells out chapter and verse numbers for the voice engine ("one hundred nineteen").
export function spokenNumber(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + spokenNumber(n % 100) : '');
}
