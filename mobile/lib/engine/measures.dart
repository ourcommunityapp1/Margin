// What's in your memory, counted in words. Port of src/heir/measures.ts.

import 'levels.dart';
import 'progress.dart';
import 'types.dart';
import 'util.dart';

final _ws = RegExp(r'\s+');
int wordCount(String text) => text.split(_ws).where((w) => w.isNotEmpty).length;

int itemWords(Item item, Track track) => wordCount(item.chunks[track]!.join(' '));

class Words {
  final int recited, inMemory;
  final List<int> atStage;
  const Words(this.recited, this.atStage, this.inMemory);
}

Words wordsIn(List<Item> items, Track track, MemberProgress p) {
  final atStage = [0, 0, 0, 0, 0, 0];
  for (final item in items) {
    final level = p.levels[item.id] ?? 0;
    if (level == 0 && !recited(item, track, p.log)) continue;
    final w = itemWords(item, track);
    for (var n = 0; n <= (level < 5 ? level : 5); n++) {
      atStage[n] += w;
    }
  }
  return Words(atStage[0], atStage, atStage[2]); // in memory from Recalled (level 2) up
}

/// Words of items first recited in the last 7 days.
int wordsRecitedThisWeek(List<Item> items, Track track, MemberProgress p, DateTime now) {
  final since = now.millisecondsSinceEpoch - 7 * dayMillis;
  final firstSeen = <String, int>{};
  for (final e in p.log) {
    final t = parseMs(e.at);
    if (!firstSeen.containsKey(e.itemId) || t < firstSeen[e.itemId]!) firstSeen[e.itemId] = t;
  }
  var n = 0;
  for (final item in items) {
    if ((firstSeen[item.id] ?? 0) < since) continue;
    if ((p.levels[item.id] ?? 0) > 0 || recited(item, track, p.log)) n += itemWords(item, track);
  }
  return n;
}

const milestoneList = [10, 25, 50, 75, 100, 150, 250, 500, 750, 1000];

({List<int> reached, int? next}) milestones(int inMemory) =>
    (reached: milestoneList.where((m) => inMemory >= m).toList(), next: milestoneList.where((m) => inMemory < m).firstOrNull);
