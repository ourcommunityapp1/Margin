import 'dart:typed_data';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/window/glass_motion.dart';
import 'package:katekize/features/window/glass_render.dart';
import 'package:katekize/features/window/light.dart';
import 'package:katekize/features/window/sweep.dart';

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

  group('the moving light behind unstarted windows', () {
    test('circles the window, pauses, then circles back', () {
      const m = CircleMotion();
      final start = lightAt(m, 0)!;
      expect(start.k, closeTo(0, 1e-9), reason: 'fades in');
      expect(start.y, closeTo(0.2, 1e-9), reason: 'starts at the top of the circle');
      final quarter = lightAt(m, LightLook.pass / 4)!;
      expect(quarter.x, greaterThan(0.5), reason: 'clockwise: heads to the right first');
      final mid = lightAt(m, LightLook.pass / 2)!;
      expect(mid.k, closeTo(1, 1e-9));
      expect(mid.y, closeTo(0.8, 1e-6), reason: 'half way round is the bottom');
      expect(lightAt(m, LightLook.pass + 100), isNull, reason: 'away during the pause');
      final back = lightAt(m, LightLook.pass + LightLook.gap + LightLook.pass / 4)!;
      expect(back.x, lessThan(0.5), reason: 'then anticlockwise: heads left first');
      for (var t = 0; t < 20000; t += 137) {
        final s = lightAt(m, t);
        if (s != null) {
          expect(s.k, inInclusiveRange(0, 1));
          expect(s.x, inInclusiveRange(0.2, 0.8));
        }
      }
    });

    test('in a list one light travels down every window in turn', () {
      const count = 4;
      for (var i = 0; i < count; i++) {
        final m = ListMotion(index: i, count: count);
        // The light is over window i when it has travelled i passes from the top.
        final s = lightAt(m, i * LightLook.pass + LightLook.pass / 2);
        expect(s, isNotNull, reason: 'window $i is lit by the light in its turn');
        expect(s!.y, inInclusiveRange(0, 1));
      }
      final first = ListMotion(index: 0, count: count);
      final last = ListMotion(index: count - 1, count: count);
      expect(lightAt(last, LightLook.pass ~/ 2), isNull, reason: 'the light is not yet at the last window');
      expect(lightAt(first, (count - 1) * LightLook.pass + LightLook.pass ~/ 2), isNull, reason: 'it has passed the first');
    });

    test('light fades with distance', () {
      expect(lightReach(0), 1);
      expect(lightReach(0.1), lessThan(lightReach(0.05)));
      expect(lightReach(0.2), lessThan(lightReach(0.1)));
      expect(lightReach(1), 0, reason: 'far away it does not reach');
    });
  });

  testWidgets('the full-size glass is drawn off the main thread and is sharper than the small copy', (tester) async {
    await tester.runAsync(() async {
      final small = await loadGlass('gospel');
      final full = await loadGlass('gospel', GlassTier.full);
      expect(small.size, 256);
      expect(full.size, 1024);
      expect(full.count, small.count, reason: 'the same panes, just more pixels');
      expect(full.panes.length, greaterThan(100));
      final img = await windowImage('gospel', const [1, 0.5, 0, 0, 0, 0], null, rest: restStarted, tier: GlassTier.full);
      expect(img.width, 1024);
      final again = await windowImage('gospel', const [1, 0.5, 0, 0, 0, 0], null, rest: restStarted, tier: GlassTier.full);
      expect(identical(img, again), isTrue, reason: 'the finished picture is kept, not drawn twice');
    });
  });

  test('the light spreads in the same order as on the website, for every window', () {
    final fixture = jsonDecode(File('../fixtures/window/sweep.json').readAsStringSync()) as Map<String, dynamic>;
    expect(fixture, isNotEmpty);
    for (final e in fixture.entries) {
      final m = pieces(e.key);
      final flat = [for (final q in m['questions'] as List) ...(q as List).cast<int>()];
      final centres = [for (final c in m['centres'] as List) [(c[0] as num).toDouble(), (c[1] as num).toDouble()]];
      final want = (e.value as List).map((l) => (l as List).cast<int>()).toList();
      final n = want.length, p = flat.length;
      for (var i = 0; i < n; i++) {
        final own = flat.sublist((i * p) ~/ n, ((i + 1) * p) ~/ n);
        expect(sweepOrder(own, centres), want[i], reason: '${e.key} question $i');
      }
    }
  });

  test('a part-way question lights one connected patch, never more than earned', () {
    final m = pieces('gospel');
    final flat = [for (final q in m['questions'] as List) ...(q as List).cast<int>()];
    final centres = [for (final c in m['centres'] as List) [(c[0] as num).toDouble(), (c[1] as num).toDouble()]];
    final state = paneStates(count: m['count'] as int, flat: flat, lit: [0.5, 0, 0, 0, 0, 0], centres: centres);
    final own = flat.sublist(0, flat.length ~/ 6);
    final on = own.where((id) => state[id] == 1).length;
    expect(on, (own.length * 0.5).round());
    expect(state.where((s) => s != 0).length, on, reason: 'only that question lights');
  });

  test('a sweep lights exactly the panes the still window shows, question by question in sweep order', () {
    final m = pieces('gospel');
    final flat = [for (final q in m['questions'] as List) ...(q as List).cast<int>()];
    final centres = [for (final c in m['centres'] as List) [(c[0] as num).toDouble(), (c[1] as num).toDouble()]];
    final count = m['count'] as int;
    final g = Glass(0, Uint8List(0), Uint8List(0), flat, count, const {}, centres);
    for (final lit in [
      [1.0, 0.5, 0.0, 0.0, 0.0, 0.0],
      [1.0, 1.0, 1.0, 0.25, 0.0, 0.0],
    ]) {
      final ids = sweepIds(g, lit);
      final still = paneStates(count: count, flat: flat, lit: lit, centres: centres);
      expect(ids.toSet(), {for (var id = 1; id <= count; id++) if (still[id] == 1) id});
      expect(ids.toSet().length, ids.length, reason: 'each pane once');
      // The first question's panes all come before the second's.
      final firstOwn = flat.sublist(0, flat.length ~/ 6).toSet();
      final lastOfFirst = ids.lastIndexWhere(firstOwn.contains);
      expect(ids.take(lastOfFirst + 1).every(firstOwn.contains), isTrue);
    }
  });
}
