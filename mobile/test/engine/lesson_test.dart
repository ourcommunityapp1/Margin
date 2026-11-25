import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart';
import 'package:katekize/engine/types.dart';

import 'content_loader.dart';
import 'fixture.dart';

List<Object?> _steps(List<Step> s) => s.map((x) => x.toJson()).toList();

void main() {
  loadTestContent();
  test('lesson fixtures', () {
    final cases = loadFixtures('lesson');
    for (final (n, c) in cases.indexed) {
      final course = getCourse(c['course'] as String)!;
      final pool = courseItems(course);
      Item byId(String id) => pool.firstWhere((i) => i.id == id);
      final w = 'case $n ${c['fn']} ${c['course']} ${c['item']}';
      if (c['fn'] == 'structure') {
        final groups = groupsOf(pool);
        expectSame(groups.map((g) => {'key': g.key, 'items': g.items.map((i) => i.id).toList()}).toList(), c['groups'], '$w groups');
        expectSame(pool.map((i) => [unitsFor(i, Track.adult).map((u) => u.toJson()).toList(), unitsFor(i, Track.child).map((u) => u.toJson()).toList()]).toList(), c['units'], '$w units');
        final act = nextActivity(pool, Track.adult, (c['learned'] as List).cast<String>().toSet(), {groups[0].key});
        expectSame(act == null ? null : {'kind': act.kind, 'group': act.group.key, 'unit': act.unit?.key}, c['next'], '$w nextActivity');
        expectSame(pool.map((i) => phrases(i.chunks[Track.adult]!)).toList(), c['phrases'], '$w phrases');
        expectSame([for (final (k, i) in pool.indexed) pickBlanks(i.text, 0.3, 4, seeded(k))], c['blanks'], '$w pickBlanks');
        final r = seeded(course.id.length);
        expectSame(List.generate(20, (_) => r()), c['seq'], '$w seeded');
        continue;
      }
      final track = trackFrom(c['track'] as String);
      final item = byId(c['item'] as String);
      final unit = unitsFor(item, track).firstWhere((u) => u.key == c['unit']);
      final rng = seeded((c['seed'] as num).toInt());
      List<Due> dues() => ((c['due'] as List?) ?? const []).map((d) => Due(byId(d['itemId'] as String), (d['strength'] as num).toDouble(), weak: (d['weak'] as List?)?.cast<String>(), chance: (d['chance'] as num?)?.toDouble())).toList();
      List<Item> some() => (c['items'] as List).map((id) => byId(id as String)).toList();
      final out = switch (c['fn']) {
        'buildLesson' => buildLesson(
            unit: unit,
            item: item,
            track: track,
            mates: (c['mates'] as List).map((m) {
              final mi = byId(m['itemId'] as String);
              final keys = (m['unitKeys'] as List).cast<String>();
              return Mate(mi, unitsFor(mi, track).where((u) => keys.contains(u.key)).toList(), (m['seen'] as num).toInt());
            }).toList(),
            due: dues(),
            pool: pool,
            rng: rng,
            maxSteps: (c['maxSteps'] as num?)?.toInt()),
        'buildLite' => buildLite(unit: unit, item: item, track: track, pool: pool, rng: rng),
        'buildWelcome' => buildWelcome(intro: intros[course.id]!, unit: unit, item: item, track: track, pool: pool, rng: rng),
        'buildReview' => buildReview(due: dues(), track: track, pool: pool, rng: rng, max: (c['max'] as num?)?.toInt()),
        'buildKeep' => buildKeep(items: some(), track: track, pool: pool, rng: rng),
        'buildNight' => buildNight(items: some(), track: track, pool: pool, rng: rng),
        'buildRise' => buildRise(items: some(), track: track, pool: pool, rng: rng),
        'buildCheckpoint' => buildCheckpoint(group: groupsOf(pool).firstWhere((g) => g.key == c['group']), track: track, pool: pool, rng: rng),
        _ => throw StateError('unknown ${c['fn']}'),
      };
      expectSame(_steps(out), c['out'], w);
    }
  });
}
