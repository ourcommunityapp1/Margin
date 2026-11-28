
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/features/window/glass_render.dart';
import 'package:katekize/features/window/sweep.dart';
import 'package:katekize/platform/haptics.dart';
import 'dart:convert';
import 'dart:io';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final calls = <String>[];
  setUp(() {
    calls.clear();
    Haptics.enabled = true;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'HapticFeedback.vibrate') calls.add(call.arguments as String);
      return null;
    });
  });

  test('a pane is a tiny tick; ticks closer than the motor can tap are merged', () async {
    Haptics.pane();
    Haptics.pane(); // at once: merged
    await Future<void>.delayed(const Duration(milliseconds: 35));
    Haptics.pane();
    expect(calls, ['HapticFeedbackType.selectionClick', 'HapticFeedbackType.selectionClick']);
  });

  test('a whole question lit taps more firmly; with Vibration off nothing is felt', () async {
    Haptics.questionLit();
    expect(calls, ['HapticFeedbackType.mediumImpact']);
    calls.clear();
    Haptics.enabled = false;
    Haptics.pane();
    Haptics.right();
    Haptics.select();
    await Haptics.stone();
    await Haptics.doneForToday();
    expect(calls, isEmpty);
  });

  test('the lesson-done sweep lights only the new panes, and marks where a question becomes whole', () {
    final m = jsonDecode(File('assets/glass/gospel/pieces.json').readAsStringSync()) as Map<String, dynamic>;
    final flat = [for (final q in m['questions'] as List) ...(q as List).cast<int>()];
    final centres = [for (final c in m['centres'] as List) [(c[0] as num).toDouble(), (c[1] as num).toDouble()]];
    final g = Glass(0, Uint8List(0), Uint8List(0), flat, m['count'] as int, const {}, centres);
    final all = sweepIds(g, const [1, 1, 0, 0, 0, 0]);
    final first = sweepIds(g, const [1, 0, 0, 0, 0, 0]);
    // From "first verse lit" to "two verses lit", the new panes are exactly the second verse's.
    expect(all.sublist(first.length).toSet(), flat.sublist(flat.length ~/ 6, 2 * flat.length ~/ 6).toSet());
  });
}
