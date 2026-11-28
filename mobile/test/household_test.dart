import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/engine/types.dart';

void main() {
  final now = DateTime.utc(2026, 11, 25, 3, 6);

  test('adding people: tidy name, first one is active, empty name adds no one', () {
    var h = emptyHousehold();
    expect(addMember(h, '   ', Track.adult, 'a', now).members, isEmpty);
    h = addMember(h, '  Ann   Lee ', Track.adult, 'a', now);
    h = addMember(h, 'Ben', Track.child, 'b', now);
    expect(h.members.map((m) => m.name), ['Ann Lee', 'Ben']);
    expect(h.activeMemberId, 'a');
    expect(activeMember(setActive(h, 'b'))!.name, 'Ben');
    expect(setActive(h, 'nobody'), same(h));
    expect(addMember(emptyHousehold(), 'x' * 60, Track.adult, 'a', now).members.single.name.length, 40);
  });

  test('removing the active person passes it to the first one left', () {
    var h = addMember(addMember(emptyHousehold(), 'Ann', Track.adult, 'a', now), 'Ben', Track.child, 'b', now);
    h = removeMember(h, 'a');
    expect(h.activeMemberId, 'b');
    expect(removeMember(h, 'b').activeMemberId, isNull);
  });

  test('a plan keeps the earlier goal when only the course changes', () {
    var h = setPlan(emptyHousehold(), const Plan(course: 'gospel', minutes: 25));
    h = setPlan(h, const Plan(course: 'psalm-23'));
    expect(h.plan!.course, 'psalm-23');
    expect(h.plan!.minutes, 25);
  });

  test('it reads what the website stores, and writes the same shape back', () {
    // As the website's localStorage holds it ('heir-household-v1').
    const stored = '{"members":[{"id":"0b8a7d9e-1c2f-4a3b-8c4d-5e6f7a8b9c0d","name":"Landon","track":"adult","createdAt":"2026-11-20T15:04:05.000Z"}],'
        '"activeMemberId":"0b8a7d9e-1c2f-4a3b-8c4d-5e6f7a8b9c0d","plan":{"course":"gospel","minutes":15}}';
    final h = parseHousehold(stored);
    expect(h.members.single.name, 'Landon');
    expect(h.members.single.track, Track.adult);
    expect(h.plan!.course, 'gospel');
    expect(h.plan!.minutes, 15);
    expect(jsonDecode(householdToJson(h)), jsonDecode(stored));
  });

  test('older plans are upgraded, and bad data never breaks it', () {
    final old = parseHousehold('{"members":[{"id":"a","name":"A"}],"activeMemberId":"zzz","plan":{"collection":"apostles-creed","minutes":500}}');
    expect(old.plan!.course, 'creeds', reason: 'the Apostles’ Creed now lives in the Creeds course');
    expect(old.plan!.minutes, isNull, reason: 'an out-of-range goal is dropped');
    expect(old.activeMemberId, 'a', reason: 'an unknown active person falls back to the first');
    for (final bad in [null, '', 'not json', '[]', '{"members":5}', '{"members":[1,"x",{"id":3}]}']) {
      expect(parseHousehold(bad).members, isEmpty, reason: '$bad');
    }
  });

  test('new ids look like UUIDs and differ', () {
    final a = newId(), b = newId();
    expect(a, matches(RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')));
    expect(a, isNot(b));
  });
}
