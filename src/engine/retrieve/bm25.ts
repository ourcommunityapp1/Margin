// A small BM25 index for finding passages by topic when a question names no reference.
// Keyword search catches passages the planner forgets; it never replaces reading the text.

const STOP = new Set(('a an and are as at be but by for from had has have he her his i if in into is it its me my not of on or our '
  + 'she so than that the their them then there these they this those thou thee thy to unto us was we were what when which who '
  + 'whom why will with ye you your shall hath doth also all any can did do does how may more much no nor now one only other out '
  + 'own same such up upon very would should could let said saith says').split(' '));

// Lowercases, drops stop words and folds common English endings so "forgiving" meets "forgiven".
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text).toLowerCase().match(/[a-z][a-z']+/g) || []) {
    const w = raw.replace(/'s$|'/g, '');
    if (w.length < 3 || STOP.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ness')) w = w.slice(0, -4);
  if (w.length > 5 && /(ing|edst|eth|est)$/.test(w)) w = w.replace(/(ing|edst|eth|est)$/, '');
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

export class Bm25<T> {
  private readonly docs: { item: T; len: number }[] = [];
  private readonly postings = new Map<string, Map<number, number>>();
  private totalLen = 0;
  private readonly k1: number;
  private readonly b: number;

  constructor(k1 = 1.4, b = 0.7) {
    this.k1 = k1;
    this.b = b;
  }

  add(item: T, text: string): void {
    const id = this.docs.length;
    const toks = tokenize(text);
    this.docs.push({ item, len: toks.length });
    this.totalLen += toks.length;
    for (const t of toks) {
      let p = this.postings.get(t);
      if (!p) this.postings.set(t, (p = new Map()));
      p.set(id, (p.get(id) ?? 0) + 1);
    }
  }

  get size(): number { return this.docs.length; }

  search(query: string, limit = 10): { item: T; score: number }[] {
    const n = this.docs.length;
    if (!n) return [];
    const avg = this.totalLen / n;
    const scores = new Map<number, number>();
    for (const t of new Set(tokenize(query))) {
      const p = this.postings.get(t);
      if (!p) continue;
      const idf = Math.log(1 + (n - p.size + 0.5) / (p.size + 0.5));
      for (const [id, tf] of p) {
        const len = this.docs[id].len;
        const s = idf * (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * len / avg));
        scores.set(id, (scores.get(id) ?? 0) + s);
      }
    }
    return [...scores].sort((x, y) => y[1] - x[1]).slice(0, limit).map(([id, score]) => ({ item: this.docs[id].item, score }));
  }
}
