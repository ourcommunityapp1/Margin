// How the words in your memory have grown, week by week, worked out from the answer log (nothing new is recorded): a port of
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
Map<String, int> memoryDates(List<Item> items, Track track, List<LogEntry> log) {
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
    final times = ({for (final e in entries) e.at}.toList()..sort()).where((at) => localDay(DateTime.parse(at)) != firstDay);
    for (final at in times) {
      final upTo = [for (final e in log) if (e.itemId == item.id && e.at.compareTo(at) <= 0) e];
      if (levelFromLog(item, track, upTo, DateTime.parse(at)) >= 2) {
        out[item.id] = DateTime.parse(at).millisecondsSinceEpoch;
        break;
      }
    }
  }
  return out;
}

class WordsPoint {
  WordsPoint(this.at, this.words);
  final int at; // ms since the epoch: the end of the week
  int words;
}

/// Weekly points from the first week with any words up to now, ending exactly at [current] (today's number, which also
/// accounts for the keeping rules). At most [maxWeeks] points; empty when nothing counts yet.
List<WordsPoint> wordsHistory(List<Item> items, Track track, MemberProgress p, DateTime now, int current, {int maxWeeks = 52}) {
  final dates = memoryDates(items, track, p.log);
  if (dates.isEmpty) return const [];
  final words = {for (final i in items) i.id: itemWords(i, track)};
  final first = dates.values.reduce(math.min);
  final nowMs = now.millisecondsSinceEpoch;
  final weeks = math.min(maxWeeks, math.max(2, ((nowMs - first) / (7 * _day)).ceil() + 2));
  final pts = <WordsPoint>[];
  for (var k = weeks - 1; k >= 0; k--) {
    final end = nowMs - k * 7 * _day;
    var n = 0;
    for (final e in dates.entries) {
      if (e.value <= end) n += words[e.key] ?? 0;
    }
    pts.add(WordsPoint(end, k == 0 ? current : n));
  }
  // Never let a dip from today's keeping rules draw a cliff on the chart before the last point.
  for (var i = pts.length - 2; i >= 0; i--) {
    pts[i].words = math.min(pts[i].words, pts[i + 1].words);
  }
  return pts;
}
