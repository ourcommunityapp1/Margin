// The move from the six-stone scale to the five levels (ADR-005; src/heir/level-scale.ts).
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/level_scale.dart';
import 'package:katekize/engine/progress.dart';

void main() {
  test('old stones move up one, the top three all to Expert, nothing goes down', () {
    expect([for (final n in [0, 1, 2, 3, 4, 5, 6]) migrateLevel(n)], [0, 2, 3, 4, 5, 5, 5]);
  });

  test('saved progress without a scale is moved once when read, and written back on scale 2', () {
    final old = parseProgress(jsonEncode({'me': {'levels': {'a': 1, 'b': 3, 'c': 6}}}))['me']!;
    expect(old.levels, {'a': 2, 'b': 4, 'c': 5});
    expect(old.levelScale, 2);
    expect((old.toJson())['levelScale'], 2);
    final again = parseProgress(jsonEncode({'me': old.toJson()}))['me']!;
    expect(again.levels, old.levels, reason: 'a record on scale 2 is never moved again');
  });

  test('merging an old copy with a new one moves the old one first, in either order', () {
    const fresh = MemberProgress(levels: {'a': 2});
    const stale = MemberProgress(levels: {'a': 2, 'b': 1}, levelScale: 1);
    expect(mergeProgress(fresh, stale).levels, {'a': 3, 'b': 2});
    expect(mergeProgress(stale, fresh).levels, {'a': 3, 'b': 2});
    expect(mergeProgress(stale, fresh).levelScale, 2);
  });
}
