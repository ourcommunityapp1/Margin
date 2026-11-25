import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/window/glass_render.dart';
import 'package:katekize/features/window/light.dart';

import 'engine/content_loader.dart';

void main() {
  loadTestContent();
  final now = DateTime.utc(2026, 11, 25, 12);

  Map<String, dynamic> pieces(String base) => jsonDecode(File('assets/glass/$base/pieces.json').readAsStringSync()) as Map<String, dynamic>;

  test('every course has a window, and every window folder is bundled', () {
    for (final c in courses) {
      final parts = courseParts(c);
      for (var i = 0; i < parts.length; i++) {
        final base = windowBase(c.id, i);
        for (final f in ['glass-mini.webp', 'ids-mini.png', 'pieces.json']) {
          expect(File('assets/glass/$base/$f').existsSync(), isTrue, reason: '${c.id} part $i: $base/$f');
        }
      }
    }
  });

  test('nothing is lit before anything is learned', () {
    for (final c in courses) {
      final w = partWindow(c, Track.adult, emptyProgress(), now);
      expect(w.share, 0, reason: c.id);
      expect(w.lit.every((f) => f == 0), isTrue);
      final m = pieces(w.base);
      final state = paneStates(count: m['count'] as int, flat: [for (final q in m['questions'] as List) ...(q as List).cast<int>()], lit: w.lit, dusty: w.dusty);
      expect(state.every((s) => s == 0), isTrue, reason: 'no pane of ${c.id} is lit');
    }
  });

  test('a window is never lit more than has been earned', () {
    final m = pieces('gospel');
    final flat = [for (final q in m['questions'] as List) ...(q as List).cast<int>()];
    final count = m['count'] as int;
    for (final lit in [
      [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      [1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      [0.5, 0.0, 0.25, 0.0, 0.0, 1.0],
      [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    ]) {
      final state = paneStates(count: count, flat: flat, lit: lit);
      final n = lit.length;
      var litPanes = 0;
      for (var i = 0; i < n; i++) {
        final own = flat.sublist((i * flat.length) ~/ n, ((i + 1) * flat.length) ~/ n);
        final on = own.where((id) => state[id] != 0).length;
        litPanes += on;
        if (lit[i] == 0) expect(on, 0, reason: 'an item with nothing learned lights nothing');
        if (lit[i] == 1) expect(on, own.length);
        expect(on, lessThanOrEqualTo((lit[i] * own.length).round()), reason: 'never more than its share');
      }
      final share = lit.reduce((a, b) => a + b) / n;
      expect(litPanes, lessThanOrEqualTo((share * flat.length).ceil() + n), reason: 'the whole window stays within its earned share (rounding aside)');
    }
  });

  test('a learned verse lights its sixth of First Verses, and no more', () {
    final course = getCourse('first-verses')!;
    final first = courseItems(course).first;
    final p = emptyProgress().copyWith(units: [for (final u in unitsFor(first, Track.adult)) u.key]);
    final w = partWindow(course, Track.adult, p, now);
    expect(w.lit.first, 1);
    expect(w.lit.skip(1).every((f) => f == 0), isTrue);
    expect(w.share, closeTo(1 / 6, 1e-9));
  });

  test('a partly learned item lights in proportion to its parts', () {
    final course = getCourse('westminster-shorter')!;
    final long = courseItems(course).firstWhere((i) => unitsFor(i, Track.adult).length > 1);
    final units = unitsFor(long, Track.adult);
    final p = emptyProgress().copyWith(units: [units.first.key]);
    final w = partWindow(course, Track.adult, p, now, partOf(course, long.id));
    final at = w.items.indexWhere((i) => i.id == long.id);
    expect(w.lit[at], closeTo(1 / units.length, 1e-9));
  });

  test('the part you are working in is the first with something left to light', () {
    final course = getCourse('westminster-shorter')!;
    expect(partWindow(course, Track.adult, emptyProgress(), now).index, 0);
    final first = courseParts(course).first.items;
    final p = emptyProgress().copyWith(units: [for (final i in first) for (final u in unitsFor(i, Track.adult)) u.key]);
    expect(partWindow(course, Track.adult, p, now).index, 1, reason: 'part one is fully lit, so on to part two');
  });

  testWidgets('drawn: lit panes show the glass, dark ones rest dark', (tester) async {
    await tester.runAsync(() async {
      final d = await loadGlass('gospel');
      expect(d.size, 256);
      expect(d.count, greaterThan(100));
      int bright(List<int> state) {
        final px = renderPixels(d, state, rest: restStarted);
        var sum = 0;
        for (var i = 0; i < px.length; i += 4) {
          sum += px[i] + px[i + 1] + px[i + 2];
        }
        return sum;
      }

      final none = bright(List<int>.filled(d.count + 1, 0));
      final all = bright(List<int>.filled(d.count + 1, 1));
      final dusty = bright(List<int>.filled(d.count + 1, 2));
      expect(all, greaterThan(none * 3), reason: 'a fully lit window is far brighter than a dark one');
      expect(dusty, lessThan(all));
      expect(dusty, greaterThan(none), reason: 'dusty glass is dimmer than lit, but not dark');
      // Outside the round window stays clear.
      final px = renderPixels(d, List<int>.filled(d.count + 1, 1), rest: restStarted);
      expect(px[3], 0, reason: 'the corner is transparent');
    });
  });
}
