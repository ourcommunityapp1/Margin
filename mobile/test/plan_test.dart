// The plan: adding and removing courses, single verses, and keeping what the website saved (src/heir/test/plan.test.ts).
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/sync_rules.dart' show planFromJson;
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/dayplan.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';

import 'engine/content_loader.dart';

void main() {
  loadTestContent();
  Household withPlan(String course, [int? minutes]) => setPlan(emptyHousehold(), Plan(course: course, minutes: minutes));

  test('adding a course makes it the daily course and keeps the others in the plan', () {
    var h = withPlan('westminster-shorter', 7);
    h = setPlan(h, const Plan(course: 'creeds'));
    expect(h.plan?.course, 'creeds');
    expect(h.plan?.minutes, 7);
    expect(inPlan(h.plan, 'westminster-shorter', true), isTrue, reason: 'a started course stays in the plan');
    expect(inPlan(h.plan, 'westminster-shorter', false), isFalse, reason: 'an unstarted one is not');
  });

  test('removing a course takes it out of the plan, keeps the rest, and hands over the daily course', () {
    var h = setPlan(withPlan('westminster-shorter', 7), const Plan(course: 'creeds'));
    h = removeFromPlan(h, 'creeds', 'westminster-shorter');
    expect(h.plan?.course, 'westminster-shorter');
    expect(h.plan?.removed, ['creeds']);
    expect(inPlan(h.plan, 'creeds', true), isFalse);
    expect(dailyCourse(h.plan), 'westminster-shorter');
    // Removing the daily course with nothing to take over leaves no daily course.
    expect(dailyCourse(removeFromPlan(withPlan('creeds'), 'creeds', null).plan), isNull);
  });

  test('adding a removed course back brings it back', () {
    var h = removeFromPlan(setPlan(withPlan('westminster-shorter'), const Plan(course: 'creeds')), 'westminster-shorter', null);
    expect(h.plan?.removed, ['westminster-shorter']);
    h = setPlan(h, const Plan(course: 'westminster-shorter'));
    expect(h.plan?.removed, isEmpty);
    expect(h.plan?.toJson().containsKey('removed'), isFalse);
    expect(dailyCourse(h.plan), 'westminster-shorter');
  });

  test('the plan survives being saved and read back, and bad entries are dropped', () {
    final h = removeFromPlan(setPlan(withPlan('westminster-shorter', 15), const Plan(course: 'creeds')), 'creeds', 'westminster-shorter');
    expect(parseHousehold(householdToJson(h)).plan?.toJson(), h.plan?.toJson());
    expect(parseHousehold(jsonEncode({'members': [], 'plan': {'course': 'creeds', 'removed': [3, 'x']}})).plan?.removed.first, 'x');
  });

  test('a single verse can be added to the plan on its own, without its course, and taken out again', () {
    var h = withPlan('westminster-shorter', 7);
    h = addVerse(h, 'fv-3', 'first-verses');
    expect(h.plan?.verses, ['fv-3']);
    expect(h.plan?.course, 'westminster-shorter');
    expect(addVerse(h, 'fv-3', 'first-verses').plan?.verses.length, 1, reason: 'adding twice is the same as once');
    expect(removeVerse(h, 'fv-3').plan?.verses, isEmpty);
    expect(parseHousehold(householdToJson(h)).plan?.verses, ['fv-3']);
    // With no plan yet, the verse alone makes one, with no daily course.
    final alone = addVerse(emptyHousehold(), 'fv-3', 'first-verses');
    expect(dailyCourse(alone.plan), isNull);
    expect(alone.plan?.verses, ['fv-3']);
  });

  test('a plan read from the account keeps removed courses, single verses and fields this app does not know', () {
    final server = {'course': 'creeds', 'minutes': 7, 'removed': ['westminster-shorter'], 'verses': ['fv-3'], 'future': {'a': 1}};
    final plan = planFromJson(server)!;
    expect(plan.removed, ['westminster-shorter']);
    expect(plan.verses, ['fv-3']);
    expect(plan.toJson(), server, reason: 'written back exactly as it came');
    // Changing the goal on the phone keeps all of it.
    final h = setPlan(Household(plan: plan), const Plan(course: 'creeds', minutes: 15));
    expect(h.plan?.toJson(), {...server, 'minutes': 15});
  });

  StepResult intro(String id) => StepResult(itemId: id, kind: 'intro', correct: true, hints: 0, ms: 1, review: false);

  test('a removed course is not in the day: no lessons, no reviews', () {
    final p = finishSession(emptyProgress(), results: [intro('wsc-1')], learned: unitsFor(getItem('wsc-1')!, Track.adult), courseId: 'westminster-shorter', now: DateTime(2026, 11, 2, 9));
    expect(startedCourses(p, Track.adult, null).map((c) => c.id), ['westminster-shorter']);
    expect(startedCourses(p, Track.adult, null, ['westminster-shorter']), isEmpty);
    expect(startedCourses(p, Track.adult, 'westminster-shorter', ['westminster-shorter']).map((c) => c.id), ['westminster-shorter'],
        reason: 'the daily course is always kept');
  });

  test('learning one verse of a course on its own does not bring the whole course into the plan', () {
    final p = finishSession(emptyProgress(), results: [intro('fv-3')], learned: unitsFor(getItem('fv-3')!, Track.adult), courseId: 'first-verses', now: DateTime(2026, 11, 2, 9));
    expect(startedCourses(p, Track.adult, null).map((c) => c.id), ['first-verses'], reason: 'before: the course counts as started');
    expect(startedCourses(p, Track.adult, null, const [], ['fv-3']), isEmpty, reason: 'with the verse added on its own it does not');
  });

  test('Today offers a lesson for a verse added on its own, and reviews it once learned', () {
    final now = DateTime(2026, 11, 20, 9);
    final cards = planDay(p: emptyProgress(), track: Track.adult, started: const [], focus: null, goal: 7, now: now, verses: ['fv-3']);
    expect(cards.length, 1);
    expect(cards.first.kind, 'lesson');
    expect(cards.first.item, 'fv-3');
    expect(cards.first.course, 'first-verses');
    expect(cards.first.id, '2026-11-20:lesson:fv-3');
    // Learned on Nov 2: due for a review later, as its own course's review card, though the course is not in the plan.
    final us = unitsFor(getItem('fv-3')!, Track.adult);
    StepResult typed(String part, bool review) => StepResult(itemId: 'fv-3', kind: 'type', correct: true, hints: 0, ms: 1, review: review, part: part, of: us.length);
    var p = finishSession(emptyProgress(), results: [intro('fv-3'), for (final u in us) typed(u.key, false)], learned: us, courseId: 'first-verses', now: DateTime(2026, 11, 2, 9));
    p = finishSession(p, results: [for (final u in us) typed(u.key, true)], now: DateTime(2026, 11, 3, 9));
    final later = planDay(p: p, track: Track.adult, started: const [], focus: null, goal: 7, now: DateTime(2026, 11, 30, 9), verses: ['fv-3']);
    expect([for (final c in later) [c.kind, c.course]], [['review', 'first-verses']]);
  });
}
