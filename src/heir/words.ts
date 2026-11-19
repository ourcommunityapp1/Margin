// Comparing words the way a person would: capitals, curly quotes and punctuation don't matter.

export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9']/g, '');
}

export function words(text: string): string[] {
  return text.split(/\s+/).map(normalizeWord).filter(Boolean);
}

export function sameWords(a: string, b: string): boolean {
  const x = words(a), y = words(b);
  return x.length === y.length && x.every((w, i) => w === y[i]);
}
