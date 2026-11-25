import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/board.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/keep.dart';
import 'package:katekize/engine/path.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/related.dart';
import 'package:katekize/engine/season.dart';
import 'package:katekize/engine/social.dart';
import 'package:katekize/engine/stats.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/engine/usfm.dart';

import 'content_loader.dart';
import 'fixture.dart';

void main() {
  checkTimeZone();
  loadTestContent();
  test('small files', () {
    final s = loadFixtures('small').single;
    final journeys = loadFixtures('journeys');
    final at = DateTime.parse('2026-05-01T15:00:00Z');
    for (final (i, j) in journeys.indexed) {
      final p = parseProgress(jsonEncode({'m': (j['merges'] as Map)['ab']}))['m']!;
      final focus = j['focus'] as String, track = trackFrom(j['track'] as String);
      final items = courseItems(getCourse(focus)!);
      final stats = statsFor([(id: focus, items: items)], allItems(), track, p, localDay(at), i.isOdd ? (options: KeepOptions(launch: DateTime.parse('2026-01-01T00:00:00Z')), now: at) : null);
      expectSame(stats.toJson(), (s['stats'] as List)[i], 'statsFor $i');
      expectSame(
          coursePath(items, track, p, at)
              .map((u) => {'number': u.number, 'group': u.group.key, 'lessons': u.lessons.map((l) => l.toJson()).toList(), 'learned': u.learned, 'mastered': u.mastered, 'status': u.status, 'lockWaiting': u.lockWaiting})
              .toList(),
          (s['path'] as List)[i],
          'coursePath $i');
      final cs = courseStats(items, track, p);
      expectSame({'learned': cs.learned, 'mastered': cs.mastered, 'total': cs.total}, (s['courseStats'] as List)[i], 'courseStats $i');
      expectSame([streak(p.days, p.days.last), streak(p.days, '2026-12-25')], (s['streak'] as List)[i], 'streak $i');
    }
    for (final u in s['usernames'] as List) {
      expectSame(usernameProblem(u[0] as String), u[1], 'usernameProblem ${u[0]}');
    }
    for (final x in s['places'] as List) {
      expectSame(place(x[0] as String?, x[1] as String?), x[2], 'place');
    }
    for (final x in s['since'] as List) {
      expectSame(sinceLabel(x[0] as String), x[1], 'sinceLabel ${x[0]}');
    }
    for (final x in s['streakLines'] as List) {
      expectSame(streakLine((x[0] as num).toInt(), x[1] as String?, x[2] as String), x[3], 'streakLine');
    }
    expectSame([0, 1, 2, 38].map(friendsCount).toList(), s['friends'], 'friendsCount');
    final b = s['board'] as Map;
    final rows = (b['rows'] as List).map((r) => BoardRow.fromJson(r as Map)).toList();
    expectSame(rows.map(rowSub).toList(), b['subs'], 'rowSub');
    expectSame(rows.map(movement).toList(), b['moves'], 'movement');
    expectSame([-3, 0, 4].map(arrow).toList(), b['arrows'], 'arrow');
    expectSame([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111, 112].map(ordinal).toList(), b['ordinals'], 'ordinal');
    expectSame(previewRows(rows).map((r) => r.username).toList(), b['preview'], 'previewRows');
    final sl = slots(rows);
    expectSame({'start': sl.start, 'end': sl.end}, b['slots'], 'slots');
    expectSame(gapsAfter(rows).toList(), b['gaps'], 'gapsAfter');
    for (final x in s['seasons'] as List) {
      final d = DateTime.parse(x[0] as String);
      expectSame([x[0], seasonLabel('christmas', d), seasonLabel('easter', d), timeOfDay(d), dayName(d)], x, 'season ${x[0]}');
    }
    for (final x in s['feasts'] as List) {
      final y = (x[0] as num).toInt();
      expectSame([y, localDay(adventSunday(y)), localDay(easterSunday(y))], x, 'feasts $y');
    }
    expectSame(['dawn', 'day', 'dusk', 'night'].map(greeting).toList(), s['greetings'], 'greeting');
    for (final x in s['usfm'] as List) {
      final r = x[0] as String;
      final ps = passagesOf(r);
      expectSame([r, toUsfm(r), isOldTestament(r), ps, ps.map(verseCount).toList(), ps.map(isRelatedPassage).toList()], x, 'usfm/related $r');
    }
    for (final x in s['tidy'] as List) {
      expectSame(tidyVerse(x[0] as String), x[1], 'tidyVerse');
    }
  });

  test('content: every item keeps its exact words (chunks join to the text, nothing retyped)', () {
    for (final c in collections) {
      for (final i in c.items) {
        for (final t in Track.values) {
          expect(i.chunks[t]!.join(' ').isNotEmpty, true, reason: '${i.id} has no ${t.name} chunks');
        }
        expect(i.chunks[Track.adult]!.join(' '), i.text, reason: '${i.id}: adult chunks must join to the exact text');
      }
    }
    expect(contentChecksum.length, 64);
  });
}
