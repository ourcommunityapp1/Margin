import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/dayplan.dart';
import 'package:katekize/engine/keep.dart';
import 'package:katekize/engine/lesson.dart';
import 'package:katekize/engine/levels.dart';
import 'package:katekize/engine/measures.dart';
import 'package:katekize/engine/memory.dart';
import 'package:katekize/engine/models.dart';
import 'package:katekize/engine/planner.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/related.dart';
import 'package:katekize/engine/types.dart';

import 'content_loader.dart';
import 'fixture.dart';

Map<String, Object?> snapshot(MemberProgress p) => {
      'units': p.units,
      'checkpoints': p.checkpoints,
      'cards': p.cards.map((k, v) => MapEntry(k, v.toJson())),
      'lessons': p.lessons,
      'courseLessons': p.courseLessons,
      'levels': p.levels,
      'awards': p.awards,
      'days': p.days,
      'keep': p.keep?.map((k, v) => MapEntry(k, v.toJson())),
      'today': p.today?.toJson(),
      'partSnap': p.partSnap?.toJson(),
      'logLength': p.log.length,
    };

Map<String, Object?> st(KeepState s) => {
      'state': s.state,
      'at': switch (s) {
        DueForReview(:final deadline) => deadline.year > 200000 ? null : iso(deadline),
        TryAgain(:final deadline) => iso(deadline),
        Out(:final since) => iso(since),
        Kept() => null,
      },
    };

void main() {
  checkTimeZone();
  loadTestContent();
  for (final j in loadFixtures('journeys')) {
    test('journey ${j['tag']} (${j['focus']}, ${j['track']}, ${j['goal']} min)', () {
      final track = trackFrom(j['track'] as String);
      final focus = j['focus'] as String;
      final tz = j['tz'] as String?;
      final goal = j['goal'] as num;
      var p = emptyProgress();
      var id = 0;
      String newId() => '${j['tag']}-${id++}';
      for (final (n, op) in (j['ops'] as List).cast<Map<String, dynamic>>().indexed) {
        final w = '${j['tag']} op $n ${op['op']} ${op['now'] ?? ''}';
        switch (op['op']) {
          case 'plan':
            final now = DateTime.parse(op['now'] as String);
            final started = (op['started'] as List).map((c) => getCourse(c as String)!).toList();
            expectSame(startedCourses(p, track, focus).map((c) => c.id).toList(), (op['started'] as List).take(startedCourses(p, track, focus).length).toList(), '$w startedCourses');
            final cards = planDay(p: p, track: track, started: started, focus: focus, goal: goal, now: now, fix: (op['fix'] as List).cast<String>());
            expectSame(cards.map((c) => c.toJson()).toList(), op['out'], '$w planDay');
            p = p.copyWith(today: withPlan(p.today, localDay(now), cards));
            expectSame(p.today!.toJson(), op['today'], '$w withPlan');
          case 'finish':
            final now = DateTime.parse(op['now'] as String);
            final results = (op['results'] as List).map((r) => StepResult.fromJson((r as Map).cast<String, dynamic>())).toList();
            final course = getCourse(op['courseId'] as String)!;
            final keys = (op['learned'] as List).cast<String>();
            final learned = [for (final i in courseItems(course)) ...unitsFor(i, track).where((u) => keys.contains(u.key))];
            learned.sort((a, b) => keys.indexOf(a.key).compareTo(keys.indexOf(b.key)));
            final kr = op['keepRules'] as Map?;
            p = finishSession(p,
                results: results,
                learned: learned,
                checkpoint: op['checkpoint'] as String?,
                courseId: course.id,
                now: now,
                newId: newId,
                keepRules: kr == null ? null : (tz: kr['tz'] as String?),
                grading: op['grading'] as String?);
            expectSame(snapshot(p), op['out'], '$w finishSession');
          case 'settle':
            final now = DateTime.parse(op['now'] as String);
            final s = settle(p, allItems(), track, now);
            p = s.progress;
            expectSame(s.ups.map((u) => {'itemId': u.itemId, 'from': u.from, 'to': u.to}).toList(), op['ups'], '$w settle ups');
            expectSame(s.awards, op['awards'], '$w settle awards');
            expectSame(snapshot(p), op['out'], '$w settle');
          case 'session':
            final s = DaySession.fromJson(op['session'] as Map);
            id++; // the website drew this session's id from the same counter
            p = p.copyWith(today: withSession(p.today, s.at.isEmpty ? '' : localDay(DateTime.parse(s.at)), s));
            expectSame(p.today!.toJson(), op['today'], '$w withSession');
            expectSame(cardStates(p.today).map((x) => {'id': x.card.id, 'done': x.done, 'secs': x.secs}).toList(), op['states'], '$w cardStates');
            expectSame(extraSessions(p.today).map((x) => x.toJson()).toList(), op['extras'], '$w extraSessions');
            expectSame(minutesToday(p.today), op['minutes'], '$w minutesToday');
            expectSame(dayEvents(p.today).map((x) => x.toJson()).toList(), op['events'], '$w dayEvents');
          case 'look':
            final now = DateTime.parse(op['now'] as String);
            final items = allItems();
            final focusItems = courseItems(getCourse(focus)!);
            final ids = focusItems.map((i) => i.id).toSet();
            final launch = DateTime.parse('2026-01-01T00:00:00Z');
            final held = heldItems(items, p, track, now, KeepOptions(launch: launch, tz: tz));
            expectSame(held.map((h) => {'id': h.item.id, 'level': h.level, 'words': h.words, ...st(h.state)}).toList(), op['held'], '$w heldItems');
            final fixed = heldItems(items, p, track, now, const KeepOptions(launch: null, model: false));
            expectSame(fixed.map((h) => {'id': h.item.id, ...st(h.state)}).toList(), op['fixedHeld'], '$w heldItems (fixed windows)');
            final sum = summarize(held);
            expectSame({
              'wordsKept': sum.wordsKept,
              'wordsOut': sum.wordsOut,
              'tryAgain': sum.tryAgain.map((h) => h.item.id).toList(),
              'review': sum.review.map((h) => h.item.id).toList(),
              'out': sum.out.map((h) => h.item.id).toList(),
            }, op['summary'], '$w summarize');
            final logged = items.where((i) => p.log.any((e) => e.itemId == i.id));
            expectSame([
              for (final i in logged)
                [i.id, levelFromLog(i, track, p.log, now), recited(i, track, p.log), understanding(i, p), nextStep(i, track, p, now), needsRefresh(p, i.id, now), strongUntilFor(i, p, track) == null ? null : iso(strongUntilFor(i, p, track)!)],
            ], op['levelsFromLog'], '$w levels');
            expectSame(daysKept(p.days, localDay(now)), op['daysKept'], '$w daysKept');
            expectSame(bestDaysKept(p.days), op['best'], '$w bestDaysKept');
            expectSame(awardsMet(p, items, localDay(now)), op['awardsMet'], '$w awardsMet');
            final c = countsFor(items, p);
            expectSame({'know': c.know, 'memorized': c.memorized, 'mastered': c.mastered, 'longTerm': c.longTerm}, op['counts'], '$w countsFor');
            expectSame(shelf(items, p), op['shelf'], '$w shelf');
            final wd = wordsIn(items, track, p);
            expectSame({'recited': wd.recited, 'atStage': wd.atStage, 'inMemory': wd.inMemory}, op['words'], '$w wordsIn');
            expectSame(wordsRecitedThisWeek(items, track, p, now), op['week'], '$w wordsRecitedThisWeek');
            expectSame(riskOrder(p, ids, now).map((x) => x.toJson()).toList(), op['risk'], '$w riskOrder');
            expectSame(riskOrder(p, ids, now, partMemories(p.log, p.partSnap)).map((x) => x.toJson()).toList(), op['riskParts'], '$w riskOrder by parts');
            expectSame(recentAccuracy(p, ids), op['acc'], '$w recentAccuracy');
            expectSame(lessonsDone(p, focus, ids), op['done'], '$w lessonsDone');
            final pl = planNext(courseId: focus, items: focusItems, track: track, p: p, now: now);
            expectSame(
                pl == null
                    ? null
                    : {'kind': pl.kind, 'units': pl.units.map((u) => u.key).toList(), 'group': pl.group?.key, 'picks': pl.picks.map((x) => x.itemId).toList(), 'why': pl.why},
                op['next'],
                '$w planNext');
            final nl = nextLine(p, track, getCourse(focus)!, now);
            expectSame({'text': nl.text, 'allLearned': nl.allLearned}, op['nextLine'], '$w nextLine');
            final pr = project(items: focusItems, track: track, p: p, minutes: goal, now: now);
            expectSame({'remaining': pr.remaining, 'learnDays': pr.learnDays, 'learnedBy': iso(pr.learnedBy), 'longTermBy': iso(pr.longTermBy)}, op['project'], '$w project');
            expectSame(bedtimePicks(p, ids, now), op['bedtime'], '$w bedtimePicks');
            expectSame(nightOffer(p, ids, DateTime.fromMillisecondsSinceEpoch(now.millisecondsSinceEpoch + 8 * 3600000, isUtc: true)), op['night'], '$w nightOffer');
            expectSame(riseOffer(p, now), op['rise'], '$w riseOffer');
            if (op.containsKey('morning')) expectSame(morningPicks(p, ids, now), op['morning'], '$w morningPicks');
            expectSame(dueCards(p, now).map((x) => [x.itemId, iso(x.due), x.strength]).toList(), op['due'], '$w dueCards');
            expectSame(weakestCards(p).map((x) => x.itemId).toList(), op['weakest'], '$w weakestCards');
            expectSame(seenCounts(p).entries.map((e) => [e.key, e.value]).toList(), op['seen'], '$w seenCounts');
            expectSame(keepOf(p).map((k, v) => MapEntry(k, v.toJson())), op['keepOf'], '$w keepOf');
            final eod = endOfNextDay(now, tz);
            expectSame(iso(eod), op['endOfNextDay'], '$w endOfNextDay');
            expectSame(missedWhen(eod, DateTime.fromMillisecondsSinceEpoch(now.millisecondsSinceEpoch + 20 * 3600000, isUtc: true), tz), op['missedWhen'], '$w missedWhen');
            expectSame([
              for (final i in p.cards.keys.take(5)) iso(clampDue(DateTime.parse(p.cards[i]!.due), p.levels[i] ?? 1, p.keep?[i], now, tz)),
            ], op['clamp'], '$w clampDue');
            expectSame(ids.take(6).map((i) => relatedFor(getItem(i)!)).toList(), op['related'], '$w relatedFor');
            final parsed = parseProgress(jsonEncode({'m': p.toJson()}))['m'];
            expectSame(parsed == null ? null : snapshot(parsed), op['parsed'], '$w parseProgress');
        }
      }
      expectSame(p.log.map((e) => e.toJson()).toList(), j['finalLog'], '${j['tag']} final log');
    });
    test('two phones merge (${j['tag']})', () {
      final m = j['merges'] as Map<String, dynamic>;
      MemberProgress read(Object? v) => parseProgress(jsonEncode({'m': v}))['m']!;
      final a = read(m['a']), b = read(m['b']);
      expectSame(mergeProgress(a, b).toJson(), m['ab'], '${j['tag']} merge a+b');
      expectSame(mergeProgress(b, a).toJson(), m['ba'], '${j['tag']} merge b+a');
      expect(sameProgress(a, a), m['same']);
      expect(sameProgress(a, b), m['differ']);
    });
  }
}
