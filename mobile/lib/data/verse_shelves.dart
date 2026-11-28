// Shelves of single verses on the Learn tab (src/heir/content/verse-shelves.ts). Chosen by hand, on their own merits, and
// nothing to do with which course a verse sits in. Each entry is an item id, so the text is always the exact, verified text
// already in the app (nothing new is quoted here).

class VerseShelf {
  const VerseShelf(this.id, this.title, this.ids);
  final String id, title;
  final List<String> ids;
}

const verseShelves = [
  // The verses people most often learn first.
  VerseShelf('most-loved', 'Most-loved verses', ['fv-3', 'fv-5', 'fv-6', 'fv-2', 'fv-1', 'fv-4', 'gs-1', 'gs-4', 'fw-6']),
  // Short and steady, for a day that is going badly.
  VerseShelf('hard-days', 'For hard days', ['fw-1', 'fw-2', 'fw-3', 'fw-4', 'fw-5', 'ps23-4', 'gd-6']),
];
