import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/lesson/session.dart';

import 'engine/content_loader.dart';

void main() {
  loadTestContent();
  final now = DateTime(2026, 11, 25, 10);

  test('a new person’s first lesson is the course’s welcome lesson', () {
    final s = buildLessonSession(course: getCourse('first-verses')!, track: Track.adult, mine: emptyProgress(), memberId: 'me', now: now);
    expect(s.label, 'Welcome');
    expect(s.kind, 'learn');
    expect(s.steps, isNotEmpty);
    expect(s.steps.first.kind, 'info', reason: 'the welcome cards come first');
    expect(s.units, hasLength(1));
    expect(s.courseId, 'first-verses');
  });

  test('practising one item is not a lesson of the course', () {
    final s = buildItemSession(dayCourse: 'westminster-shorter', item: getItem('wsc-1')!, track: Track.adult, mine: emptyProgress(), memberId: 'me', now: now);
    expect(s.label, 'Practice · Q1');
    expect(s.courseId, isEmpty);
    expect(s.units, isEmpty);
    expect(s.steps, isNotEmpty);
    expect(s.steps.every((x) => x.itemId == 'wsc-1'), isTrue);
  });

  test('“Learn it” teaches that one verse’s next part, not the course’s next lesson', () {
    final s = buildLessonSession(course: getCourse('first-verses')!, track: Track.adult, mine: emptyProgress(), memberId: 'me', now: now, mode: 'learn', learnItemId: 'fv-3');
    expect(s.kind, 'learn');
    expect(s.mode, 'learn');
    expect(s.units.single.itemId, 'fv-3');
    expect(s.steps.where((x) => x.kind != 'info').every((x) => x.itemId == 'fv-3' || x.review), isTrue);
  });
}
