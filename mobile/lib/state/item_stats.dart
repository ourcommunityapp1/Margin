// What one question or verse's page and its course's list show: how strong it is now, and how it has gone (a port of
// src/heir/item-stats.ts; not part of the engine). Strength is the model's chance of recalling the whole item now (its weakest
// part), as on the lesson screens. It is always shown, with "Practised today" under it on a day the item was practised.

import 'dart:math' as math;

import 'package:material_ui/material_ui.dart' show Color;

import '../engine/lesson.dart' show unitText, unitsFor;
import '../engine/memory.dart' show itemChance, partMemories, recallChance;
import '../engine/models.dart' show LogEntry, PartMem;
import '../engine/observe.dart' show lightWeight;
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

// ---- The passage, word by word (a verse or answer with every word coloured by how reliably you recall it).
// From the typed, said and first-letter answers on the log: a part answered right with no misses shows every word in it
// recalled; an answer with word positions marks those words missed and the rest recalled; an answer with misses but no
// positions is unknown and skipped. Fill-in-the-blanks and spot-the-wrong-word move only the words they asked. Newer answers
// weigh more.

enum WordBand { none, red, yellow, light, dark }

class WordCard {
  const WordCard(this.word, this.band, this.tries, this.misses);
  final String word;
  final WordBand band;
  final int tries, misses;
}

const _wordKinds = {'type', 'say', 'letters'};
const _recency = 0.85;
final _space = RegExp(r'\s+');
List<String> _words(String s) => s.split(_space).where((w) => w.isNotEmpty).toList();

List<WordCard> wordCards(Item item, Track track, List<LogEntry> log) {
  final chunks = item.chunks[track]!;
  final words = _words(chunks.join(' '));
  final seen = [for (final _ in words) <({bool hit, String at, double w})>[]];
  final units = {for (final u in unitsFor(item, track)) u.key: u};
  for (final e in log) {
    if (e.itemId != item.id || e.part == null || !(_wordKinds.contains(e.kind) || e.kind == 'blanks' || e.kind == 'spot')) continue;
    final u = units[e.part];
    if (u == null) continue;
    final offset = _words(chunks.sublist(0, u.start).join(' ')).length;
    final count = _words(unitText(item, track, u).text).length;
    final missed = (e.missed ?? const <int>[]).toSet();
    final weight = e.kind == 'type' || e.kind == 'say' ? 1.0 : lightWeight[e.kind] ?? 1.0;
    final asked = (e.tested?.isNotEmpty ?? false) ? e.tested!.toSet() : null;
    final clean = (e.misses ?? (e.correct ? 0 : null)) == 0 || (e.kind == 'spot' && e.correct);
    if (!clean && (e.missed?.isEmpty ?? true)) continue; // unknown which words
    for (var i = 0; i < count; i++) {
      final at = offset + i;
      if (at >= words.length) continue;
      if (missed.contains(i)) {
        seen[at].add((hit: false, at: e.at, w: math.max(weight, 0.6)));
      } else if (_wordKinds.contains(e.kind) || (asked?.contains(i) ?? false)) {
        seen[at].add((hit: true, at: e.at, w: weight));
      }
    }
  }
  return [
    for (final (i, word) in words.indexed)
      () {
        final obs = [...seen[i]]..sort((a, b) => b.at.compareTo(a.at));
        if (obs.isEmpty) return WordCard(word, WordBand.none, 0, 0);
        var w = 0.0, wMiss = 0.0, misses = 0;
        for (final (k, o) in obs.indexed) {
          final x = o.w * math.pow(_recency, k);
          w += x;
          if (!o.hit) {
            wMiss += x;
            misses++;
          }
        }
        final rate = wMiss / w;
        final band = rate >= 0.5 ? WordBand.red : rate >= 0.25 ? WordBand.yellow : obs.length >= 3 && rate <= 0.08 ? WordBand.dark : WordBand.light;
        return WordCard(word, band, obs.length, misses);
      }(),
  ];
}

/// Times recited perfectly: lessons or reviews in which every part was typed or said right with no misses and no hints.
int recitedPerfectly(Item item, Track track, List<LogEntry> log) {
  final parts = unitsFor(item, track).length;
  final by = <String, Set<String>>{};
  for (final e in log) {
    if (e.itemId != item.id || !(e.kind == 'type' || e.kind == 'say') || !e.correct || e.hints > 0 || (e.misses ?? 0) > 0) continue;
    (by[e.at] ??= {}).add(e.part ?? '*');
  }
  return by.values.where((set) => set.length >= parts || set.contains('*')).length;
}

/// Times practised in all: separate lessons or reviews with any answer about it.
int timesPracticed(Item item, List<LogEntry> log) =>
    {for (final e in log) if (e.itemId == item.id && e.kind != 'intro' && e.kind != 'info' && e.kind != 'verse') e.at}.length;

/// Strength over time: the model's chance of recalling the whole item, replayed from the answers as they stood at each point
/// (a point a day for a short history, a week after two months). At most the last 70 points.
List<({int at, double chance})> strengthSeries(Item item, List<LogEntry> log, DateTime now) {
  final mine = [for (final e in log) if (e.itemId == item.id && e.part != null && e.kind != 'intro') e];
  if (mine.isEmpty) return [];
  final times = [for (final e in mine) DateTime.parse(e.at).millisecondsSinceEpoch];
  final first = times.reduce(math.min);
  const day = 86400000;
  final nowMs = now.millisecondsSinceEpoch;
  final step = (nowMs - first) / day <= 60 ? day : 7 * day;
  final out = <({int at, double chance})>[];
  for (var t = first; t <= nowMs + step - 1; t += step) {
    final at = math.min(t, nowMs);
    final upTo = [for (final (i, e) in mine.indexed) if (times[i] <= at) e];
    if (upTo.isEmpty) continue;
    final c = itemChance(item.id, partMemories(upTo), DateTime.fromMillisecondsSinceEpoch(at, isUtc: true));
    if (c != null) out.add((at: at, chance: c));
    if (at == nowMs) break;
  }
  return out.length > 70 ? out.sublist(out.length - 70) : out;
}
