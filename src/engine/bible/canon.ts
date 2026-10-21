// The 66-book Protestant canon in English order, keyed by the corpus file codes.
// Verse counts are not stored here; they come from the corpus index (KJV versification).

export const BOOKS: ReadonlyArray<{ code: string; name: string }> = [
  ['GEN', 'Genesis'], ['EXO', 'Exodus'], ['LEV', 'Leviticus'], ['NUM', 'Numbers'], ['DEU', 'Deuteronomy'],
  ['JOS', 'Joshua'], ['JDG', 'Judges'], ['RUT', 'Ruth'], ['1SA', '1 Samuel'], ['2SA', '2 Samuel'],
  ['1KI', '1 Kings'], ['2KI', '2 Kings'], ['1CH', '1 Chronicles'], ['2CH', '2 Chronicles'], ['EZR', 'Ezra'],
  ['NEH', 'Nehemiah'], ['EST', 'Esther'], ['JOB', 'Job'], ['PSA', 'Psalms'], ['PRO', 'Proverbs'],
  ['ECC', 'Ecclesiastes'], ['SNG', 'Song of Songs'], ['ISA', 'Isaiah'], ['JER', 'Jeremiah'], ['LAM', 'Lamentations'],
  ['EZK', 'Ezekiel'], ['DAN', 'Daniel'], ['HOS', 'Hosea'], ['JOL', 'Joel'], ['AMO', 'Amos'],
  ['OBA', 'Obadiah'], ['JON', 'Jonah'], ['MIC', 'Micah'], ['NAM', 'Nahum'], ['HAB', 'Habakkuk'],
  ['ZEP', 'Zephaniah'], ['HAG', 'Haggai'], ['ZEC', 'Zechariah'], ['MAL', 'Malachi'], ['MAT', 'Matthew'],
  ['MRK', 'Mark'], ['LUK', 'Luke'], ['JHN', 'John'], ['ACT', 'Acts'], ['ROM', 'Romans'],
  ['1CO', '1 Corinthians'], ['2CO', '2 Corinthians'], ['GAL', 'Galatians'], ['EPH', 'Ephesians'], ['PHP', 'Philippians'],
  ['COL', 'Colossians'], ['1TH', '1 Thessalonians'], ['2TH', '2 Thessalonians'], ['1TI', '1 Timothy'], ['2TI', '2 Timothy'],
  ['TIT', 'Titus'], ['PHM', 'Philemon'], ['HEB', 'Hebrews'], ['JAS', 'James'], ['1PE', '1 Peter'],
  ['2PE', '2 Peter'], ['1JN', '1 John'], ['2JN', '2 John'], ['3JN', '3 John'], ['JUD', 'Jude'], ['REV', 'Revelation'],
].map(([code, name]) => ({ code, name }));

export const PSALMS = 18;
export const FIRST_NT = 39;

// Per book, the number of verses in each chapter.
export type Versification = number[][];

// Abbreviations and alternate names that don't fall out of prefix matching.
const ALIAS: Record<string, string> = {
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', pss: 'Psalms', song: 'Song of Songs', sos: 'Song of Songs',
  songofsolomon: 'Song of Songs', canticles: 'Song of Songs', jn: 'John', jhn: 'John', mt: 'Matthew', mk: 'Mark',
  mrk: 'Mark', lk: 'Luke', jas: 'James', jm: 'James', phil: 'Philippians', php: 'Philippians', phm: 'Philemon',
  philem: 'Philemon', jdg: 'Judges', ezk: 'Ezekiel', jl: 'Joel', am: 'Amos', ob: 'Obadiah', zeph: 'Zephaniah',
  zech: 'Zechariah', '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', revelations: 'Revelation', qoh: 'Ecclesiastes',
  dt: 'Deuteronomy', gn: 'Genesis', ex: 'Exodus', lv: 'Leviticus', nm: 'Numbers', ru: 'Ruth', '1kgs': '1 Kings',
  '2kgs': '2 Kings', ne: 'Nehemiah', is: 'Isaiah', ro: 'Romans', rm: 'Romans', jude: 'Jude', heb: 'Hebrews',
  thess: '1 Thessalonians', '1thess': '1 Thessalonians', '2thess': '2 Thessalonians', apocalypse: 'Revelation',
};

const key = (s: string): string => s.trim().toLowerCase()
  .replace(/^iii\s+/, '3').replace(/^ii\s+/, '2').replace(/^i\s+/, '1')
  .replace(/^(first|1st)\s+/, '1').replace(/^(second|2nd)\s+/, '2').replace(/^(third|3rd)\s+/, '3')
  .replace(/^(the\s+)?(book|gospel|epistle|letter)\s+(of|to)\s+(saint\s+|st\.?\s+)?/, '')
  .replace(/[^a-z0-9]/g, '');

const KEYS = BOOKS.map((b) => key(b.name));

// Returns the book index for a name or abbreviation, or -1.
export function findBook(raw: string): number {
  const k = key(raw);
  if (!k) return -1;
  if (ALIAS[k]) return BOOKS.findIndex((b) => b.name === ALIAS[k]);
  const exact = KEYS.indexOf(k);
  if (exact >= 0) return exact;
  if (k.length < 2) return -1;
  const hits = KEYS.map((n, i) => [n, i] as const).filter(([n]) => n.startsWith(k));
  if (!hits.length || (k.length < 3 && hits.length > 1)) return -1;
  return hits[0][1];
}

// "Psalm 23" reads better than "Psalms 23" for a single psalm.
export const bookLabel = (bi: number): string => (bi === PSALMS ? 'Psalm' : BOOKS[bi].name);
