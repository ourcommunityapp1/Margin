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

const NEW_TESTAMENT = new Set(['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH',
  '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV']);

/** Whether a reference is in the Old Testament (where the NASB's small capitals print the divine name). */
export function isOldTestament(ref: string): boolean {
  const u = toUsfm(ref);
  return !!u && !NEW_TESTAMENT.has(u.split('.')[0]);
}

// The word of God is shown and learned exactly as the translation has it. Nothing here changes a word, a letter's
// case or a punctuation mark: no trimming, no closing or dropping quotation marks, no capitalizing a verse that
// begins in lowercase. Only spacing is tidied.
export function tidyVerse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// The NASB passage HTML from the YouVersion Platform as plain text. Only markup goes:
//  - verse numbers, tags, paragraph marks (¶) and line breaks between poetry lines (which become a space);
//  - small capitals: in the Old Testament they print the divine name, written LORD (and GOD); in the New
//    Testament they mark a quotation from the Old, and the letters keep their case;
//  - italics (words the translators supplied) become plain words;
//  - the source sometimes drops the space after a small-capitals or italic run before the next word, and leaves a
//    space next to a quotation mark where a footnote or a tag was; those spaces are put right.
export function verseFromHtml(html: string, ref: string): string {
  const ot = isOldTestament(ref);
  return html
    .replace(/<span class="yv-vlbl">[^<]*<\/span>/g, '')
    .replace(/<span class="sc">([^<]*)<\/span>(?=\p{L})/gu, (_, w: string) => (ot ? `${w.toUpperCase()} ` : w))
    .replace(/<span class="sc">([^<]*)<\/span>/g, (_, w: string) => (ot ? w.toUpperCase() : w))
    .replace(/<span class="it">([^<]*)<\/span>(?=\p{L})/gu, '$1 ')
    .replace(/<\/div>\s*<div[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/¶/g, '')
    .replace(/\s+([,.;:!?’”])/g, '$1')
    .replace(/([‘“])\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
