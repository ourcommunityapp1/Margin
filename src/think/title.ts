// A note's title fills itself in as the topic becomes clear. Once the user has edited it, it is
// theirs, and nothing the app infers may replace it again.

export interface Titled { title: string; titleEdited: boolean }

// Take a title the app worked out. Ignored when the user has made the title their own.
export function withInferredTitle<T extends Titled>(note: T, inferred: string): T {
  const next = inferred.replace(/\s+/g, ' ').trim().replace(/[.]+$/, '');
  if (note.titleEdited || !next || next === note.title) return note;
  return { ...note, title: next.slice(0, 80) };
}

// Take a title the user typed. This locks it for good, even if they clear it.
export function withUserTitle<T extends Titled>(note: T, typed: string): T {
  return { ...note, title: typed, titleEdited: true };
}
