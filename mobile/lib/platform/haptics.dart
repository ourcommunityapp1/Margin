// Small taps on the phone for a right answer, a wrong one, and finishing a lesson (ADR-0008). Flutter's own HapticFeedback:
// nothing to install and nothing to ask permission for. Phones with no vibration motor simply do nothing.

import 'package:flutter/services.dart';

abstract final class Haptics {
  /// A right answer: a light tap.
  static void right() => HapticFeedback.lightImpact();

  /// A wrong answer: a firmer tap, so it is felt without looking.
  static void wrong() => HapticFeedback.heavyImpact();

  /// A lesson finished: a medium tap, then a lighter one, like a small drum roll.
  static Future<void> finished() async {
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 120));
    await HapticFeedback.lightImpact();
  }
}
