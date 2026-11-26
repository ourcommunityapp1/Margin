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
