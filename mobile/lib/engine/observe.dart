// What a step shows about memory, in one place (a port of src/heir/observe.ts). Every step a person answers is evidence, but
// not equal evidence: typing or saying the whole thing is the strongest; a quick step (fill the blanks, pick the next phrase,
// put phrases in order, spot the wrong word, match the question) shows less, by how much it makes you find the words yourself.
// These weights are used by the memory model (memory.dart), the stones (levels.dart) and the word-by-word view, so they never
// disagree. Pure: no state, no dates.

import 'dart:math' as math;

import 'models.dart';
import 'progress.dart' show keptRecall;

/// How much of a whole answer each quick step proves (a whole answer is 1).
const lightWeight = <String, double>{'match': 0.4, 'spot': 0.5, 'order': 0.5, 'next': 0.6, 'blanks': 0.75, 'letters': 0.9};

/// Steps that recognise rather than produce words: right the first time or not at all.
const easyKinds = {'match', 'spot', 'order', 'next'};

/// Quick steps that are not already graded as recall (type, say, letters are). These feed the memory only in reviews.
const lightOnlyKinds = {'match', 'spot', 'order', 'next', 'blanks'};

/// A quick step answered right: easy ones need the first try; fill-in-the-blanks allows the same slack as a typed answer.
bool lightPass(StepResult e) => e.hints == 0 && (easyKinds.contains(e.kind) ? e.correct : keptRecall(e));

/// One quick-steps-only session of an item (or one of its parts), reduced to a mark and a weight, or null if it had none.
/// `good` with the weight of the kinds passed (each kind once, at most 1); `again` when any kind was missed, with the weight
/// of the worst miss, halved. Only review steps count (in a lesson the words are still on the screen).
({String mark, double weight})? lightMark(List<StepResult> entries) {
  final light = [for (final e in entries) if (e.review && lightOnlyKinds.contains(e.kind)) e];
  if (light.isEmpty) return null;
  final kinds = <String>[];
  for (final e in light) {
    if (!kinds.contains(e.kind)) kinds.add(e.kind);
  }
  final missed = [for (final k in kinds) if (!light.any((e) => e.kind == k && lightPass(e))) k];
  if (missed.isNotEmpty) return (mark: 'again', weight: missed.map((k) => lightWeight[k]!).reduce(math.max) / 2);
  return (mark: 'good', weight: math.min(1.0, kinds.fold<double>(0, (n, k) => n + lightWeight[k]!)));
}

/// Word positions (0-based, in the step's text) a step actually tested, or null when it tests the whole text.
List<int>? testedPositions({required String kind, List<int>? blanks, int? wrongIndex}) {
  if (kind == 'blanks' && blanks != null) return blanks;
  if (kind == 'spot' && wrongIndex != null) return [wrongIndex];
  return null;
}
