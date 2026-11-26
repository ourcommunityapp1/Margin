// What one question or verse's page and its course's list show: how strong it is now, and how it has gone (a port of
// src/heir/item-stats.ts; not part of the engine). Strength is the model's chance of recalling the whole item now (its weakest
// part), as on the lesson screens. It is not shown on a day the item was practised (it would only say "just now"); the
// screens say "Today" instead.

import 'dart:math' as math;

import 'package:material_ui/material_ui.dart' show Color;

import '../engine/lesson.dart' show unitText, unitsFor;
import '../engine/memory.dart' show itemChance, recallChance;
import '../engine/models.dart' show PartMem;
import '../engine/progress.dart';
import '../engine/types.dart';

double? itemStrength(MemberProgress p, String itemId, DateTime now, Map<String, PartMem> parts) {
  final card = p.cards[itemId];
  final byPart = itemChance(itemId, parts, now);
  if (card == null) return byPart;
  return math.min(recallChance(card, now), byPart ?? 1);
}

bool practisedToday(MemberProgress p, String itemId, DateTime now) {
  final day = localDay(now);
  return p.log.any((e) => e.itemId == itemId && (e.day ?? localDay(DateTime.parse(e.at))) == day);
}

class ItemStats {
  const ItemStats({required this.learnedAt, required this.practised, required this.right, required this.last, required this.lastRight, required this.oftenMissed, required this.due});
  final DateTime? learnedAt;

  /// Answers given: how many, and how many right.
  final int practised, right;
  final DateTime? last;
  final bool? lastRight;

  /// The word missed most often (at least twice), as written.
  final String? oftenMissed;

  /// When it's next due for a review.
  final DateTime? due;
}

final _edges = RegExp(r'^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$', unicode: true);

ItemStats itemStats(Item item, MemberProgress p, Track track) {
  final log = p.log.where((e) => e.itemId == item.id).toList();
  final answers = log.where((e) => e.kind != 'intro').toList();
  final last = answers.isEmpty ? null : answers.last;
  final units = {for (final u in unitsFor(item, track)) u.key: unitText(item, track, u).text.split(RegExp(r'\s+'))};
  final misses = <String, ({int n, String word})>{};
  for (final e in answers) {
    if (e.part == null || (e.missed?.isEmpty ?? true)) continue;
    final words = units[e.part];
    if (words == null) continue;
    for (final at in e.missed!.toSet()) {
      if (at < 0 || at >= words.length) continue;
      final word = words[at].replaceAll(_edges, '');
      if (word.isEmpty) continue;
      final key = word.toLowerCase();
      misses[key] = (n: (misses[key]?.n ?? 0) + 1, word: word);
    }
  }
  // The most often missed; ties go to the one missed first (a stable sort, as the website's).
  ({int n, String word})? top;
  for (final m in misses.values) {
    if (top == null || m.n > top.n) top = m;
  }
  final card = p.cards[item.id];
  return ItemStats(
    learnedAt: log.isEmpty ? null : DateTime.parse(log.first.at),
    practised: answers.length,
    right: answers.where((e) => e.correct).length,
    last: last == null ? null : DateTime.parse(last.at),
    lastRight: last?.correct,
    oftenMissed: top != null && top.n >= 2 ? top.word : null,
    due: card == null ? null : DateTime.parse(card.due),
  );
}

/// Strong (85% and up), fading (70 to 85%), or weak (under 70%): the band of a strength.
enum Band { strong, fading, weak }

Band strengthBand(double s) => s >= 0.85 ? Band.strong : s >= 0.7 ? Band.fading : Band.weak;

/// The colour of a band (heir.css .hr-strength).
Color bandColor(Band b) => switch (b) { Band.strong => const Color(0xFFB9E3B0), Band.fading => const Color(0xFFF0C27A), Band.weak => const Color(0xFFF0A08A) };
