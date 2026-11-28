import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The shared test files written by the website's `scripts/export-fixtures.ts` (ADR-0003).
List<Map<String, dynamic>> loadFixtures(String name) {
  final f = File('../fixtures/engine/$name.json');
  return (jsonDecode(f.readAsStringSync()) as List).cast<Map<String, dynamic>>();
}

/// Compares what the Dart engine gave with what TypeScript gave. Numbers within 1e-9; maps and lists deeply.
void expectSame(Object? actual, Object? expected, String where) {
  if (expected is num && actual is num) {
    if ((actual - expected).abs() > 1e-9 * (1 + expected.abs())) fail('$where: expected $expected, got $actual');
    return;
  }
  if (expected is List) {
    if (actual is! List || actual.length != expected.length) fail('$where: list differs: expected $expected, got $actual');
    for (var i = 0; i < expected.length; i++) {
      expectSame(actual[i], expected[i], '$where[$i]');
    }
    return;
  }
  if (expected is Map) {
    if (actual is! Map) fail('$where: expected a map $expected, got $actual');
    // A key the TypeScript output leaves out must also be absent (or null) in Dart's.
    final keys = {...expected.keys, ...actual.keys};
    for (final k in keys) {
      final e = expected[k], a = actual[k];
      if (e == null && a == null) continue;
      expectSame(a, e, '$where.$k');
    }
    return;
  }
  if (actual != expected) fail('$where: expected $expected, got $actual');
}

/// The fixtures are written with TZ=America/Chicago (local days matter); run the tests the same way:
/// `TZ=America/Chicago flutter test test/engine`.
void checkTimeZone() {
  final jan = DateTime(2026, 1, 15).timeZoneOffset, jul = DateTime(2026, 7, 15).timeZoneOffset;
  if (jan != const Duration(hours: -6) || jul != const Duration(hours: -5)) {
    throw StateError('Run the engine tests with TZ=America/Chicago (the fixtures use its local days).');
  }
}
