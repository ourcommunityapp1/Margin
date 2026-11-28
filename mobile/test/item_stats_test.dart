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

  test('the passage word by word: colours follow how often each word is missed; times recited perfectly and practised', () {
    final item = getItem('wsc-4')!;
    final part = unitsFor(item, Track.adult).first;
    final words = item.chunks[Track.adult]!.join(' ').split(RegExp(r'\s+'));
    LogEntry tk(int day, bool correct, [List<int> missed = const []]) => LogEntry(
          id: 't$day${missed.join()}',
          at: DateTime(2026, 11, day, 9).toUtc().toIso8601String(),
          itemId: item.id,
          kind: 'type',
          correct: correct,
          hints: 0,
          ms: 1,
          review: true,
          part: part.key,
          of: unitsFor(item, Track.adult).length,
          words: words.length,
          misses: missed.length,
          missed: missed,
        );
    // Word 3 missed on four of seven typed answers; word 5 once; the rest never.
    final log = [tk(2, true), tk(3, false, [3]), tk(4, false, [3, 5]), tk(5, false, [3]), tk(6, false, [3]), tk(7, true), tk(8, true)];
    final cards = wordCards(item, Track.adult, log);
    expect(cards.length, words.length);
    expect(cards[3].band, WordBand.red, reason: 'missed again and again');
    expect([WordBand.light, WordBand.yellow], contains(cards[5].band), reason: 'missed once in seven');
    expect(cards[0].band, WordBand.dark, reason: 'never missed in seven tries');
    expect(cards[3].misses, 4);
    expect(wordCards(item, Track.adult, const []).every((c) => c.band == WordBand.none), isTrue, reason: 'nothing tried: no colour');
    // An answer with misses but no positions is unknown: it does not colour anything.
    final unknown = LogEntry(at: tk(2, false).at, itemId: item.id, kind: 'type', correct: false, hints: 0, ms: 1, review: true, part: part.key, misses: 3);
    expect(wordCards(item, Track.adult, [unknown]).every((c) => c.band == WordBand.none), isTrue);
    expect(recitedPerfectly(item, Track.adult, log), 3, reason: 'the three clean typed answers');
    expect(timesPracticed(item, log), 7);
    final series = strengthSeries(item, log, DateTime(2026, 11, 10, 9));
    expect(series.length, greaterThanOrEqualTo(8), reason: 'a point a day');
    expect(series.every((x) => x.chance >= 0 && x.chance <= 1), isTrue);
  });
}
