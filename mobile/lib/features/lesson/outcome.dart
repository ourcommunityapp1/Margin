// What a step reports when the person has answered it (src/app/heir/ui/steps.tsx: Outcome, Report).

import 'package:material_ui/material_ui.dart';

/// `slip`: right, but not cleanly (a spelling slip, a missed word), so the praise is quieter.
/// `missedAt`: positions (0-based) of the words missed or shown, in the step's text. Kept with the answer, never
/// what was typed.
@immutable
class Outcome {
  const Outcome({
    required this.ok,
    this.close = false,
    this.slip = false,
    this.hints,
    this.misses,
    this.missedAt,
    this.note,
    this.reveal,
  });

  final bool ok, close, slip;
  final int? hints, misses;
  final List<int>? missedAt;
  final String? note;

  /// The right answer, shown in the feedback sheet when something was missed.
  final Widget? reveal;
}

typedef Report = void Function(Outcome outcome);

// Small text helpers the steps share (steps.tsx).

/// "God," → the word to type and the punctuation around it.
({String before, String core, String after}) splitToken(String token) {
  final m = RegExp(r'^([“‘"' "'" r'(]*)(.*?)([.,;:!?”’"' "'" r')]*)$').firstMatch(token);
  return (before: m?.group(1) ?? '', core: m?.group(2) ?? token, after: m?.group(3) ?? '');
}

String quoteList(List<String> words) => words.map((w) => '“${splitToken(w).core}”').join(', ');

String plural(int n, String one, String many) => n == 1 ? one : many;
