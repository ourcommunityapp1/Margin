// Bible references in USFM form, as the YouVersion Platform API takes them ("Psalm 73:25–28" -> "PSA.73.25-28"),
// and tidying of the passage text it returns.

const BOOKS: Record<string, string> = {
  Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU', Joshua: 'JOS', Judges: 'JDG',
  Ruth: 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH',
  '2 Chronicles': '2CH', Ezra: 'EZR', Nehemiah: 'NEH', Esther: 'EST', Job: 'JOB', Psalm: 'PSA', Psalms: 'PSA',
  Proverbs: 'PRO', Ecclesiastes: 'ECC', 'Song of Solomon': 'SNG', 'Song of Songs': 'SNG', Isaiah: 'ISA',
  Jeremiah: 'JER', Lamentations: 'LAM', Ezekiel: 'EZK', Daniel: 'DAN', Hosea: 'HOS', Joel: 'JOL', Amos: 'AMO',
  Obadiah: 'OBA', Jonah: 'JON', Micah: 'MIC', Nahum: 'NAM', Habakkuk: 'HAB', Zephaniah: 'ZEP', Haggai: 'HAG',
  Zechariah: 'ZEC', Malachi: 'MAL', Matthew: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT',
  Romans: 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', Galatians: 'GAL', Ephesians: 'EPH',
  Philippians: 'PHP', Colossians: 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI',
  '2 Timothy': '2TI', Titus: 'TIT', Philemon: 'PHM', Hebrews: 'HEB', James: 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
  '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', Jude: 'JUD', Revelation: 'REV',
};

export function toUsfm(ref: string): string | null {
  const m = /^(.+?) (\d+):(\d+)(?:[–-](\d+))?$/.exec(ref.trim());
  const book = m && BOOKS[m[1]];
  if (!m || !book) return null;
  return `${book}.${m[2]}.${m[3]}${m[4] ? `-${m[4]}` : ''}`;
}

// A verse lifted out of a longer speech can open or close a quotation it doesn't contain both ends of.
// Drop those stray marks, so the verse reads as a whole, and drop a leading "and" or "but" that only joins it
// to the verse before.
export function tidyVerse(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  const count = (re: RegExp) => (t.match(re) ?? []).length;
  if (t.startsWith('“') && count(/“/g) > count(/”/g)) t = t.slice(1);
  if (t.endsWith('”') && count(/”/g) > count(/“/g)) t = t.slice(0, -1);
  // Single marks: only at the very start or end, since ’ is also an apostrophe.
  if (t.startsWith('‘') && count(/‘/g) > count(/[.!?,;]’/g)) t = t.slice(1);
  if (/[.!?,;]’$/.test(t) && !t.includes('‘')) t = t.slice(0, -1);
  // Shown on its own, it starts with a capital and ends on a full stop, even when it runs on in the Bible.
  t = t.trim().replace(/^(?:and|but|so|then) (?=\S)/, '').replace(/^\p{Ll}/u, (c) => c.toUpperCase()).replace(/[,;:—–-]$/, '.');
  // A quotation it opens mid-way and doesn't finish is closed at the end.
  if (count(/“/g) > count(/”/g)) t += '”';
  if (count(/(^|[\s“(])‘/g) > count(/’(?=[\s”).,;:!?]|$)/g)) t += '’';
  return t;
}

// The passage HTML as plain text. Small capitals (the divine name, LORD) become capitals, with the space the
// source sometimes drops after them; verse numbers and tags go; poetry lines join with a space.
export function verseFromHtml(html: string): string {
  return html
    .replace(/<span class="yv-vlbl">[^<]*<\/span>/g, '')
    .replace(/<span class="sc">([^<]*)<\/span>(?=\p{L})/gu, (_, w: string) => `${w.toUpperCase()} `)
    .replace(/<span class="sc">([^<]*)<\/span>/g, (_, w: string) => w.toUpperCase())
    .replace(/<\/div>\s*<div[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
