// Related verses: the Scripture a catechism answer rests on, or the verses a Bible verse goes with. Port of src/heir/related.ts.

import 'content.dart';
import 'types.dart';
import 'usfm.dart';

final _dash = RegExp('[–-]');
final _cf = RegExp(r'^cf\.\s*', caseSensitive: false);
final _letter = RegExp(r'(\d)[a-c]\b');
final _full = RegExp(r'^(.+?) (\d+):(\d+)(?:[–-](\d+))?$');
final _inChapter = RegExp(r'^(\d+)(?:[–-](\d+))?$');
final _other = RegExp(r'^(\d+):(\d+)(?:[–-](\d+))?$');

/// One reference string as separate passages ("Acts 15:14–15, 18" → "Acts 15:14–15", "Acts 15:18").
List<String> passagesOf(String ref) {
  final out = <String>[];
  var book = '', chapter = '';
  for (final part in ref.replaceFirst(_cf, '').split(';')) {
    final bits = part.split(',').map((s) => s.trim().replaceAllMapped(_letter, (m) => m.group(1)!)).where((s) => s.isNotEmpty).toList();
    for (var i = 0; i < bits.length; i++) {
      final bit = bits[i];
      final full = _full.firstMatch(bit);
      if (full != null) {
        book = full.group(1)!;
        chapter = full.group(2)!;
        out.add('$book $chapter:${full.group(3)}${full.group(4) != null ? '–${full.group(4)}' : ''}');
        continue;
      }
      final inChapter = _inChapter.firstMatch(bit);
      if (inChapter != null && book.isNotEmpty && chapter.isNotEmpty && i > 0) {
        out.add('$book $chapter:${inChapter.group(1)}${inChapter.group(2) != null ? '–${inChapter.group(2)}' : ''}');
        continue;
      }
      final other = _other.firstMatch(bit);
      if (other != null && book.isNotEmpty) {
        chapter = other.group(1)!;
        out.add('$book $chapter:${other.group(2)}${other.group(3) != null ? '–${other.group(3)}' : ''}');
      }
    }
  }
  return out.where((p) => toUsfm(p) != null && !_dash.hasMatch(p.split(':')[0])).toList();
}

/// An item's related passages, each once, in order.
List<String> relatedFor(Item item) => {for (final c in item.connected) ...passagesOf(c)}.toList();

int verseCount(String passage) {
  final m = RegExp(r':(\d+)(?:[–-](\d+))?$').firstMatch(passage);
  return m == null ? 1 : (m.group(2) != null ? int.parse(m.group(2)!) - int.parse(m.group(1)!) + 1 : 1);
}

Set<String>? _known;
bool isRelatedPassage(String ref) {
  _known ??= {for (final c in collections) for (final i in c.items) ...relatedFor(i)};
  return _known!.contains(ref);
}
