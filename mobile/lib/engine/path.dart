// The course path: units made of named lessons, each done, current or upcoming. Port of src/heir/path.ts.

import 'lesson.dart';
import 'progress.dart';
import 'types.dart';

const masteredDays = 21;

class PathLesson {
  final String key, kind, status; // kind: learn | checkpoint; status: done | current | upcoming
  final int number;
  final String? itemId;
  final Unit? unit;
  const PathLesson(this.key, this.kind, this.number, this.status, {this.itemId, this.unit});
  Map<String, Object?> toJson() => {'key': key, 'kind': kind, 'number': number, if (itemId != null) 'itemId': itemId, if (unit != null) 'unit': unit!.toJson(), 'status': status};
}

class PathUnit {
  final int number, learned, mastered;
  final Group group;
  final List<PathLesson> lessons;
  final String status;
  final bool lockWaiting;
  const PathUnit(this.number, this.group, this.lessons, this.learned, this.mastered, this.status, this.lockWaiting);
}

bool _learnedItem(Item item, Track track, Set<String> units) => unitsFor(item, track).every((u) => units.contains(u.key));
bool masteredItem(Item item, MemberProgress p) => (p.cards[item.id]?.stability ?? 0) >= masteredDays;

List<PathUnit> coursePath(List<Item> items, Track track, MemberProgress p, [DateTime? now]) {
  final at = now ?? DateTime.now();
  final units = p.units.toSet();
  final checkpoints = p.checkpoints.toSet();
  final waiting = lockInsWaiting(items, (id) => waitingForSleep(p, id, at));
  var currentFound = false;
  final out = <PathUnit>[];
  for (final (g, group) in groupsOf(items).indexed) {
    var n = 0;
    final lessons = <PathLesson>[];
    for (final item in group.items) {
      for (final unit in unitsFor(item, track)) {
        final done = units.contains(unit.key);
        final status = done ? 'done' : currentFound ? 'upcoming' : 'current';
        if (status == 'current') currentFound = true;
        lessons.add(PathLesson(unit.key, 'learn', ++n, status, itemId: item.id, unit: unit));
      }
    }
    final lockDone = checkpoints.contains(group.key);
    final lockWaiting = !lockDone && lessons.every((l) => l.status == 'done') && waiting.contains(group.key);
    final lockStatus = lockDone ? 'done' : lockWaiting || currentFound ? 'upcoming' : 'current';
    if (lockStatus == 'current') currentFound = true;
    lessons.add(PathLesson('lock:${group.key}', 'checkpoint', ++n, lockStatus));
    final status = lessons.every((l) => l.status == 'done') ? 'done' : lessons.any((l) => l.status == 'current') || lockWaiting ? 'current' : 'upcoming';
    out.add(PathUnit(g + 1, group, lessons, group.items.where((i) => _learnedItem(i, track, units)).length, group.items.where((i) => masteredItem(i, p)).length, status, lockWaiting));
  }
  return out;
}

({int learned, int mastered, int total}) courseStats(List<Item> items, Track track, MemberProgress p) {
  final units = p.units.toSet();
  return (learned: items.where((i) => _learnedItem(i, track, units)).length, mastered: items.where((i) => masteredItem(i, p)).length, total: items.length);
}

/// Days in a row with a finished lesson, ending today (or yesterday).
int streak(List<String> days, String today) {
  final set = days.toSet();
  String step(String d) {
    final x = d.split('-').map(int.parse).toList();
    return localDay(DateTime(x[0], x[1], x[2] - 1));
  }

  var d = set.contains(today) ? today : step(today);
  var n = 0;
  while (set.contains(d)) {
    n++;
    d = step(d);
  }
  return n;
}
