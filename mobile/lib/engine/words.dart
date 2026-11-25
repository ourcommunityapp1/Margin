// Comparing words the way a person would: capitals, curly quotes and punctuation don't matter.
// Port of src/heir/words.ts.

final _apos = RegExp('[’‘`]');
final _notWord = RegExp("[^a-z0-9']");
final _spaces = RegExp(r'\s+');

String normalizeWord(String w) => w.toLowerCase().replaceAll(_apos, "'").replaceAll(_notWord, '');

List<String> words(String text) => text.split(_spaces).map(normalizeWord).where((w) => w.isNotEmpty).toList();

bool sameWords(String a, String b) {
  final x = words(a), y = words(b);
  if (x.length != y.length) return false;
  for (var i = 0; i < x.length; i++) {
    if (x[i] != y[i]) return false;
  }
  return true;
}
