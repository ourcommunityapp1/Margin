// The plan: adding and removing courses, single verses, and keeping what the website saved (src/heir/test/plan.test.ts).
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/sync_rules.dart' show planFromJson;

void main() {
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
}
