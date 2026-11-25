import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/grade.dart';
import 'package:katekize/engine/words.dart';

import 'fixture.dart';

Map<String, Object?> _order(OrderCheck c) => {'ok': c.ok, 'close': c.close, 'extra': c.extra, 'missing': c.missing, 'outOfPlace': c.outOfPlace};
Map<String, Object?> _spoken(SpokenResult r) => {'heard': r.heard, 'moved': r.moved, 'score': r.score};

void main() {
  test('words fixtures', () {
    for (final c in loadFixtures('words')) {
      final a = (c['args'] as List).cast<String>();
      final out = switch (c['fn']) {
        'normalizeWord' => normalizeWord(a[0]),
        'words' => words(a[0]),
        'sameWords' => sameWords(a[0], a[1]),
        _ => throw StateError('unknown ${c['fn']}'),
      };
      expectSame(out, c['out'], '${c['fn']}(${c['args']})');
    }
  });

  test('grade fixtures', () {
    final cases = loadFixtures('grade');
    for (final c in cases) {
      final a = c['args'] as List;
      final out = switch (c['fn']) {
        'wordMatches' => wordMatches(a[0] as String, a[1] as String),
        'closeWord' => closeWord(a[0] as String, a[1] as String),
        'firstLetter' => firstLetter(a[0] as String),
        'checkOrder' => _order(checkOrder((a[0] as List).cast<String>(), (a[1] as List).cast<String>())),
        'gradeSpoken' => _spoken(gradeSpoken(a[0] as String, a[1] as String)),
        _ => throw StateError('unknown ${c['fn']}'),
      };
      expectSame(out, c['out'], '${c['fn']}(${c['args']})');
    }
    expect(cases.length, greaterThan(1000));
  });
}
