// How the words in your memory have grown, day by day then week by week, worked out from the answer log (nothing new is recorded): a port of
// src/heir/memory-history.ts, outside the engine folder. A question counts toward memory from the first day it had a stone
// (the first unaided recall on a later day than it was first practiced, once it had been recited in full): the same rule
// `wordsIn` uses today, replayed on the log as it stood.

import 'dart:math' as math;

import '../engine/levels.dart' show levelFromLog;
import '../engine/measures.dart' show itemWords;
import '../engine/models.dart' show LogEntry;
import '../engine/progress.dart';
import '../engine/types.dart';

const _day = 86400000;

/// When each question first counted toward your memory (ms since the epoch), for those that do.
Map<String, int> memoryDates(List<Item> items, Track track, List<LogEntry> log, [Map<String, int> levels = const {}]) {
  final byItem = <String, List<LogEntry>>{};
  for (final e in log) {
    if (e.kind != 'intro') (byItem[e.itemId] ??= []).add(e);
  }
  final out = <String, int>{};
  for (final item in items) {
    final entries = byItem[item.id];
    if (entries == null) continue;
    final firstMs = entries.map((e) => DateTime.parse(e.at).millisecondsSinceEpoch).reduce(math.min);
    final firstDay = localDay(DateTime.fromMillisecondsSinceEpoch(firstMs));
    // Candidate moments: each answer time on a later day than the first. Replay the log up to each.
    final times = ({for (final e in entries) e.at}.toList()..sort()).where((at) => localDay(DateTime.parse(at)) != firstDay).toList();
    for (final at in times) {
      final upTo = [for (final e in log) if (e.itemId == item.id && e.at.compareTo(at) <= 0) e];
      if (levelFromLog(item, track, upTo, DateTime.parse(at)) >= 2) {
        out[item.id] = DateTime.parse(at).millisecondsSinceEpoch;
        break;
      }
    }
    // A level earned under an earlier rule is kept (levels never go down) even where the current rules can't replay it:
    // date it to the first answer on a later day, else the first answer.
    if (!out.containsKey(item.id) && (levels[item.id] ?? 0) >= 2) {
      out[item.id] = times.isNotEmpty ? DateTime.parse(times.first).millisecondsSinceEpoch : firstMs;
    }
  }
  return out;
}

class WordsPoint {
  WordsPoint(this.at, this.words);
  final int at; // ms since the epoch: the end of the day or week
  int words;
}

/// Points from the first day with any words up to now, ending exactly at [current] (today's number, which also accounts for
/// the keeping rules): a point a day while the history is short (up to two months), a point a week after that, so a new
/// learner sees a real climb. At most [maxPoints] points; empty when nothing counts yet.
List<WordsPoint> wordsHistory(List<Item> items, Track track, MemberProgress p, DateTime now, int current, {int maxPoints = 60}) {
  final dates = memoryDates(items, track, p.log, p.levels);
  if (dates.isEmpty) return const [];
  final words = {for (final i in items) i.id: itemWords(i, track)};
  final first = dates.values.reduce(math.min);
  final nowMs = now.millisecondsSinceEpoch;
  final span = (nowMs - first) / _day;
  final step = span <= 60 ? _day : 7 * _day;
  final n = math.min(maxPoints, math.max(3, (span / (step / _day)).ceil() + 2));
  final pts = <WordsPoint>[];
  for (var k = n - 1; k >= 0; k--) {
    final end = nowMs - k * step;
    var w = 0;
    for (final e in dates.entries) {
      if (e.value <= end) w += words[e.key] ?? 0;
    }
    pts.add(WordsPoint(end, k == 0 ? current : w));
  }
  // Never let a dip from today's keeping rules draw a cliff on the chart before the last point.
  for (var i = pts.length - 2; i >= 0; i--) {
    pts[i].words = math.min(pts[i].words, pts[i + 1].words);
  }
  return pts;
}
