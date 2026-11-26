// Small taps on the phone (ADR-0008), with Flutter's own HapticFeedback: nothing to install, no permission to ask. Phones
// with no vibration motor simply do nothing. Everything here is off when the person turns Vibration off (You → Vibration).
//
// Where they are felt:
// - lessons: a light tap for a right answer, a firmer one for a wrong one, a small drum roll at the end;
// - a window lighting up: a tiny tick for every pane as it comes on, a firmer tap when a whole question's glass is lit
//   (on the lesson-done window), and a soft settle when the light stops;
// - a stone earned: a rising triple; "Done for today": a warm double tap;
// - choosing: a click for a word placed in order, the microphone starting and stopping, Start buttons and tab switches.

import 'package:flutter/services.dart';

abstract final class Haptics {
  /// Off when the person has turned Vibration off.
  static bool enabled = true;

  static DateTime _lastTick = DateTime.fromMillisecondsSinceEpoch(0);

  /// A right answer: a light tap.
  static void right() {
    if (enabled) HapticFeedback.lightImpact();
  }

  /// A wrong answer: a firmer tap, so it is felt without looking.
  static void wrong() {
    if (enabled) HapticFeedback.heavyImpact();
  }

  /// A lesson finished: a medium tap, then a lighter one, like a small drum roll.
  static Future<void> finished() async {
    if (!enabled) return;
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 120));
    await HapticFeedback.lightImpact();
  }

  /// A choice: a word placed, a Start button, a tab, the microphone on or off. The lightest click the phone has.
  static void select() {
    if (enabled) HapticFeedback.selectionClick();
  }

  /// One pane of a window coming on: a tiny tick. Panes can come faster than the phone's motor can tap (a big sweep is
  /// hundreds of panes in two and a half seconds), so ticks closer than 28 ms are merged into one.
  static void pane() {
    if (!enabled) return;
    final now = DateTime.now();
    if (now.difference(_lastTick).inMilliseconds < 28) return;
    _lastTick = now;
    HapticFeedback.selectionClick();
  }

  /// A whole question's (or verse's) glass is lit: a firmer tap among the ticks.
  static void questionLit() {
    if (!enabled) return;
    _lastTick = DateTime.now();
    HapticFeedback.mediumImpact();
  }

  /// The light has stopped: a soft settle.
  static void settled() {
    if (enabled) HapticFeedback.lightImpact();
  }

  /// A stone earned: three taps, rising.
  static Future<void> stone() async {
    if (!enabled) return;
    await HapticFeedback.lightImpact();
    await Future<void>.delayed(const Duration(milliseconds: 90));
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 110));
    await HapticFeedback.heavyImpact();
  }

  /// "Done for today": a warm double tap.
  static Future<void> doneForToday() async {
    if (!enabled) return;
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 180));
    await HapticFeedback.mediumImpact();
  }
}
