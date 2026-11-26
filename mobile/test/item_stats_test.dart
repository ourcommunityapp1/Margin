import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/memory.dart' show partMemories;
import 'package:katekize/engine/models.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/item_stats.dart';

import 'engine/content_loader.dart';

void main() {
  loadTestContent();

  test('a question’s stats: learned, answers, last time, the word most often missed (as src/heir/test/item-stats.test.ts)', () {
    final item = getItem('wsc-4')!;
    final part = unitsFor(item, Track.adult).first;
    var p = finishSession(
      emptyProgress(),
      results: [StepResult(itemId: item.id, kind: 'intro', correct: true, hints: 0, ms: 1, review: false)],
      learned: unitsFor(item, Track.adult),
      now: DateTime(2026, 11, 10, 12),
    );
    // "God is a Spirit, infinite, ..." : word 4 ("infinite,") missed twice.
    for (final (d, ok) in [(12, false), (15, false), (18, true)]) {
      p = finishSession(
        p,
        results: [
          StepResult(itemId: item.id, kind: 'type', correct: ok, hints: 0, ms: 1, review: true, part: part.key, of: 1, misses: ok ? 0 : 1, words: 10, missed: ok ? const [] : const [4]),
        ],
        now: DateTime(2026, 11, d, 9),
      );
    }
    final s = itemStats(item, p, Track.adult);
    expect(s.practised, 3);
    expect(s.right, 1);
    expect(s.lastRight, isTrue);
    expect(s.learnedAt?.toLocal().day, 10);
    expect(s.oftenMissed, matches(RegExp(r'^[A-Za-z]+$')), reason: 'a bare word, got ${s.oftenMissed}');
    expect(practisedToday(p, item.id, DateTime(2026, 11, 18, 20)), isTrue);
    expect(practisedToday(p, item.id, DateTime(2026, 11, 19, 8)), isFalse);
    final st = itemStrength(p, item.id, DateTime(2026, 11, 20, 9), partMemories(p.log, p.partSnap));
    expect(st, isNotNull);
    expect(st! > 0 && st <= 1, isTrue);
    expect(strengthBand(0.9), Band.strong);
    expect(strengthBand(0.75), Band.fading);
    expect(strengthBand(0.5), Band.weak);
  });
}
