import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/memory.dart';
import 'package:katekize/engine/models.dart';

import 'fixture.dart';

Cal? _cal(Object? v) => v == null ? null : Cal(((v as Map)['a'] as num).toDouble(), (v['b'] as num).toDouble());
Map<String, Object?> _mem(Map<String, PartMem> m) => m.map((k, v) => MapEntry(k, v.toJson()));
List<LogEntry> _log(Object? v) => (v as List).map((e) => LogEntry.fromJson((e as Map).cast<String, dynamic>())).toList();
PartSnapshot? _snap(Object? v) => parseSnapshot(v);

void main() {
  checkTimeZone();
  test('memory fixtures', () {
    final cases = loadFixtures('memory');
    for (final (n, c) in cases.indexed) {
      if (c.containsKey('overlap')) {
        for (final o in c['overlap'] as List) {
          expectSame(overlap(o[0] as String, o[1] as String), o[2], 'overlap');
        }
        final texts = (c['texts'] as List).cast<String>();
        expectSame(spreadApart(texts, (x) => x), c['spread'], 'spreadApart');
        continue;
      }
      setPopulationCal(_cal(c['pop']));
      setPersonCal(_cal(c['person']));
      final w = 'case $n';
      final now = DateTime.parse(c['now'] as String);
      final log = _log(c['log']);
      final parts = replayParts(log);
      expectSame(_mem(parts), c['parts'], '$w replayParts');
      final cut = log.length ~/ 2;
      final snap = foldTrimmed(log.sublist(0, cut));
      expectSame(snap?.toJson(), c['snap'], '$w foldTrimmed');
      expectSame(_mem(partMemories(log.sublist(cut), snap)), c['fromSnap'], '$w partMemories from snapshot');
      expectSame(weakParts(log).toList(), c['weak'], '$w weakParts');
      expectSame(weakPartsNow(log, parts, now).toList(), c['weakNow'], '$w weakPartsNow');
      expectSame(stepSeconds(log), c['stepSeconds'], '$w stepSeconds');
      final speed = speedBaseline(log);
      expectSame(speed.map((k, v) => MapEntry(k, {'msPerWord': v.msPerWord, 'n': v.n})), c['speed'], '$w speedBaseline');
      expectSame(recalledRecently(log, now).toList(), c['recent'], '$w recalledRecently');
      expectSame(log.map(markOf).toList(), c['marks'], '$w markOf');
      for (final p in c['per'] as List) {
        final id = p['id'] as String;
        final chance = itemChance(id, parts, now);
        expectSame(chance, p['chance'], '$w itemChance $id');
        expectSame(whyNow(id, log, chance, now), p['why'], '$w whyNow $id');
      }
      for (final g in c['grades'] as List) {
        final rs = (g['rs'] as List).map((e) => StepResult.fromJson((e as Map).cast<String, dynamic>())).toList();
        final card = g['card'] == null ? null : (state: (g['card']['state'] as num).toInt(), reps: (g['card']['reps'] as num).toInt());
        expectSame(gradeRecall(rs, card, speed), g['out'], '$w gradeRecall');
      }
      for (final k in c['cards'] as List) {
        final card = SavedCard.fromJson((k['c'] as Map).cast<String, dynamic>());
        expectSame(recallChance(card, now), k['recall'], '$w recallChance');
        expectSame(predictedChance(card, now), k['predicted'], '$w predictedChance');
        expectSame(daysUntil(card, 0.8, now), k['until80'], '$w daysUntil');
      }
      for (final t in c['toChance'] as List) {
        final x = (t[0] as num).toDouble();
        expectSame([x, daysToChance(12.5, x), calibrate(x), rawFor(x)], t, '$w daysToChance/calibrate/rawFor');
      }
      final other = PartSnapshot(asOf: c['now'] as String, mem: Map.fromEntries(parts.entries.take(3)));
      expectSame(mergeSnapshot(snap, other)?.toJson(), c['merged'], '$w mergeSnapshot');
    }
    setPopulationCal(null);
    setPersonCal(null);
  });
}
