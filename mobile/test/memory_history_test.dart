import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/measures.dart' show itemWords;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/memory_history.dart';

import 'engine/content_loader.dart';

void main() {
  loadTestContent();

  StepResult intro(String id) => StepResult(itemId: id, kind: 'intro', correct: true, hints: 0, ms: 1, review: false);
  StepResult type(String id, String part) =>
      StepResult(itemId: id, kind: 'type', correct: true, hints: 0, ms: 1, review: true, part: part, of: 1, words: 10, misses: 0, missed: const []);

  test('words in memory over time: counts from the day a question first held a stone, weekly, ending at today’s number (as memory-history.test.ts)', () {
    final item = getItem('wsc-1')!;
    final part = unitsFor(item, Track.adult).first;
    var p = finishSession(emptyProgress(), results: [intro(item.id), type(item.id, part.key)], learned: unitsFor(item, Track.adult), now: DateTime(2026, 11, 1, 9));
    // Same day: recited but not yet remembered.
    expect(memoryDates([item], Track.adult, p.log), isEmpty);
    p = finishSession(p, results: [type(item.id, part.key)], now: DateTime(2026, 11, 9, 9));
    final dates = memoryDates([item], Track.adult, p.log);
    expect(DateTime.fromMillisecondsSinceEpoch(dates[item.id]!).day, 9);
    final now = DateTime(2026, 11, 23, 9);
    final w = itemWords(item, Track.adult);
    final h = wordsHistory([item], Track.adult, p, now, w);
    expect(h.length, greaterThanOrEqualTo(3));
    expect(h.last.words, w, reason: 'ends at today’s number');
    expect(h.first.words, 0, reason: 'starts at zero before it counted');
    for (var i = 1; i < h.length; i++) {
      expect(h[i].words, greaterThanOrEqualTo(h[i - 1].words), reason: 'never goes down');
    }
    expect(wordsHistory([item], Track.adult, emptyProgress(), now, 0), isEmpty, reason: 'nothing yet: no chart');
  });

  test('a short history is a point a day, and a level earned under an earlier rule is dated to its first later answer', () {
    final item = getItem('wsc-1')!;
    final part = unitsFor(item, Track.adult).first;
    final p = finishSession(emptyProgress(), results: [intro(item.id), type(item.id, part.key)], learned: unitsFor(item, Track.adult), now: DateTime(2026, 11, 1, 9));
    final later = finishSession(p, results: [StepResult(itemId: item.id, kind: 'order', correct: true, hints: 0, ms: 1, review: true)], now: DateTime(2026, 11, 3, 9));
    final now = DateTime(2026, 11, 6, 9);
    final h = wordsHistory([item], Track.adult, later.copyWith(levels: {item.id: 1}), now, itemWords(item, Track.adult));
    expect(h.length, 5, reason: 'a point a day from before the first level to now');
    for (var i = 1; i < h.length; i++) {
      expect(h[i].words, greaterThanOrEqualTo(h[i - 1].words));
    }
    expect(h.last.words, itemWords(item, Track.adult));
    expect(h.any((x) => x.words == 0) && h.any((x) => x.words > 0), isTrue, reason: 'it climbs from zero');
    // A stored Recalled level the log can't replay (a quick step on a later day with no type) is still dated.
    final onlyLevel = p.copyWith(levels: {item.id: 2}, log: [...p.log, ...later.log.where((e) => e.kind == 'order')]);
    expect(memoryDates([item], Track.adult, onlyLevel.log, onlyLevel.levels).containsKey(item.id), isTrue);
  });
}
