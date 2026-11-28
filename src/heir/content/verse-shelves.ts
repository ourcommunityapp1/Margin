// Shelves of single verses on the Learn tab. They are chosen by hand, on their own merits, and have nothing to do with which
// course a verse sits in: a verse can be on a shelf whether or not it belongs to a course. Each entry is an item id, so the
// text is always the exact, verified text already in the app (nothing new is quoted here).
//
// To add a verse that is in no course yet, it first has to be added to the content with its exact NASB 2020 text, checked
// against the publisher (see test/nasb-passages.json).

export interface VerseShelf { id: string; title: string; ids: string[] }

export const VERSE_SHELVES: VerseShelf[] = [
  // The verses people most often learn first.
  { id: 'most-loved', title: 'Most-loved verses',
    ids: ['fv-3', 'fv-5', 'fv-6', 'fv-2', 'fv-1', 'fv-4', 'gs-1', 'gs-4', 'fw-6'] }, // John 3:16, Proverbs 3:5–6, Psalm 119:11, Psalm 23:1, Genesis 1:1, Romans 6:23, Romans 3:23, Ephesians 2:8–9, Philippians 4:6–7
  // Short and steady, for a day that is going badly.
  { id: 'hard-days', title: 'For hard days',
    ids: ['fw-1', 'fw-2', 'fw-3', 'fw-4', 'fw-5', 'ps23-4', 'gd-6'] }, // Psalm 56:3, 1 Peter 5:7, Psalm 4:8, John 14:27, Isaiah 41:10, Psalm 23:4, Lamentations 3:22–23
];
