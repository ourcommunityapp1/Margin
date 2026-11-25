// What a friend or the community board can see about one person. Port of src/heir/stats.ts.

import 'keep.dart';
import 'lesson.dart';
import 'levels.dart';
import 'measures.dart';
import 'progress.dart';
import 'types.dart';

class CourseStat {
  final String course;
  final int learned, total;
  const CourseStat(this.course, this.learned, this.total);
  Map<String, Object?> toJson() => {'course': course, 'learned': learned, 'total': total};
}

class Stats {
  final int wordsInMemory, streak;
  final List<int> stones;
  final String? lastDay;
  final List<CourseStat> courses;
  const Stats(this.wordsInMemory, this.stones, this.streak, this.lastDay, this.courses);
  Map<String, Object?> toJson() => {'wordsInMemory': wordsInMemory, 'stones': stones, 'streak': streak, 'lastDay': lastDay, 'courses': courses.map((c) => c.toJson()).toList()};
}

/// Items with every part learned.
int learnedItems(List<Item> items, Track track, MemberProgress p) {
  final learned = p.units.toSet();
  return items.where((i) => unitsFor(i, track).every((u) => learned.contains(u.key))).length;
}

Stats statsFor(List<({String id, List<Item> items})> courses, List<Item> allItems, Track track, MemberProgress p, String today, [({KeepOptions options, DateTime now})? keepRules]) {
  final stones = [for (final n in [1, 2, 3, 4, 5, 6]) allItems.where((i) => levelOf(p, i.id) >= n).length];
  final days = [...p.days]..sort();
  return Stats(
    keepRules != null ? summarize(heldItems(allItems, p, track, keepRules.now, keepRules.options)).wordsKept : wordsIn(allItems, track, p).inMemory,
    stones,
    daysKept(p.days, today),
    days.isNotEmpty ? days.last : null,
    [for (final c in courses) CourseStat(c.id, learnedItems(c.items, track, p), c.items.length)].where((c) => c.learned > 0).toList(),
  );
}
