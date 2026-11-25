// How much of a part's window is lit (a port of src/app/heir/ui/glass/light.ts): each question owns an equal share of
// the glass, lit in proportion to how many of its parts have been learned. Questions that need a refresh gather dust.
// Each part of a course has its own round window; the one you see is the part you're working in.
//
// A window is never lit more than has been earned: its lit share never exceeds the share of parts learned.

import '../../engine/content.dart';
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/levels.dart' show needsRefresh;
import '../../engine/progress.dart';
import '../../engine/types.dart';

// Each course has its own window, one round panel per part.
// Shorter Catechism: the Good Shepherd (St Barnabas, Mount Eden). Larger Catechism: the north rose of Chartres Cathedral.
// The Creeds: two medallions of the Good Samaritan window at Chartres. First Verses: Jesus and the children; Christmas:
// the Nativity (Sacred Heart Church, New Philadelphia, Ohio). The other Bible courses are credited in pieces.json.
const _windows = <String, List<String>>{
  'first-verses': ['sh-children'],
  'christmas': ['sh-nativity'],
  'psalm-23': ['psalm-23'],
  'lords-prayer': ['lords-prayer'],
  'shema': ['shema'],
  'ten-commandments': ['ten-commandments'],
  'fear-peace': ['fear-peace'],
  'gospel': ['gospel'],
  'who-god-is': ['who-god-is'],
  'easter': ['easter'],
  'westminster-shorter': ['gsc-a', 'gsc-b', 'gsc-c'],
  'westminster-larger': ['rose-chartres'],
  'creeds': ['chartres-m1', 'chartres-m2'],
};

/// The name of the window folder for a course's part (`assets/glass/NAME`).
String windowBase(String courseId, int partIndex) {
  final list = _windows[courseId] ?? _windows['westminster-shorter']!;
  return list[partIndex % list.length];
}

class Light {
  const Light(this.lit, this.dusty, this.share);

  /// Per item: the share of its parts learned (0 to 1).
  final List<double> lit;

  /// Per item: learned, but due for a refresh.
  final List<bool> dusty;

  /// The share of the whole window lit, 0 to 1.
  final double share;
}

Light windowLight(List<Item> items, Track track, MemberProgress p, DateTime now) {
  final learned = p.units.toSet();
  final lit = [
    for (final item in items)
      () {
        final units = unitsFor(item, track);
        return units.isEmpty ? 0.0 : units.where((u) => learned.contains(u.key)).length / units.length;
      }(),
  ];
  final dusty = [for (final (i, item) in items.indexed) lit[i] > 0 && needsRefresh(p, item.id, now)];
  final share = lit.fold<double>(0, (a, b) => a + b) / (items.isEmpty ? 1 : items.length);
  return Light(lit, dusty, share);
}

class PartWindow {
  const PartWindow({required this.index, required this.count, required this.title, required this.base, required this.items, required this.light});
  final int index, count;
  final String title, base;
  final List<Item> items;
  final Light light;

  List<double> get lit => light.lit;
  List<bool> get dusty => light.dusty;
  double get share => light.share;
}

/// The window for one part, or for the part you're working in: the first with a question not yet fully lit.
PartWindow partWindow(Course course, Track track, MemberProgress p, DateTime now, [int? index]) {
  final parts = courseParts(course);
  final lights = [for (final part in parts) windowLight(part.items, track, p, now)];
  final open = lights.indexWhere((l) => l.lit.any((f) => f < 1));
  final at = (index ?? (open == -1 ? parts.length - 1 : open)).clamp(0, parts.length - 1);
  return PartWindow(index: at, count: parts.length, title: parts[at].title, base: windowBase(course.id, at), items: parts[at].items, light: lights[at]);
}

/// Which part an item is in.
int partOf(Course course, String itemId) {
  final i = courseParts(course).indexWhere((part) => part.items.any((x) => x.id == itemId));
  return i < 0 ? 0 : i;
}

/// The window a Today card shows: for a review, the part holding most of what's due; otherwise the part you're in.
PartWindow windowFor(Course course, String kind, Track track, MemberProgress p, DateTime now) {
  if (kind == 'review' || kind == 'fix') {
    final ids = courseItems(course).map((i) => i.id).toSet();
    final counts = <int, int>{};
    for (final d in dueCards(p, now, ids)) {
      final at = partOf(course, d.itemId);
      counts[at] = (counts[at] ?? 0) + 1;
    }
    if (counts.isNotEmpty) {
      final best = counts.entries.reduce((a, b) => b.value > a.value ? b : a);
      return partWindow(course, track, p, now, best.key);
    }
  }
  return partWindow(course, track, p, now);
}

/// Which panes light. Item i of n owns an even share of the window's panes, in reveal order ([flat]); a fraction f lights
/// the first f of them. Result: per pane id, 0 dark, 1 lit, 2 dusty (lit but due for a refresh).
List<int> paneStates({required int count, required List<int> flat, required List<double> lit, List<bool>? dusty}) {
  final state = List<int>.filled(count + 1, 0);
  final p = flat.length, n = lit.length;
  for (var i = 0; i < n; i++) {
    final own = flat.sublist((i * p) ~/ n, ((i + 1) * p) ~/ n);
    final on = (lit[i].clamp(0.0, 1.0) * own.length).round();
    for (var k = 0; k < on; k++) {
      state[own[k]] = (dusty != null && dusty[i]) ? 2 : 1;
    }
  }
  return state;
}
