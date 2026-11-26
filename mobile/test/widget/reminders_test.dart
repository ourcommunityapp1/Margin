import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/platform/reminders.dart';
import 'package:katekize/state/household.dart';

import 'fakes.dart';

MemoryStore _phone([Map<String, String> more = const {}]) => MemoryStore({
      householdKey: householdToJson(setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15))),
      ...more,
    });

Future<void> _openReminders(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('Reminders').first);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Reminders').first);
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

void main() {
  group('planning', () {
    final now = DateTime(2026, 11, 24, 14); // a Tuesday, 2 pm

    test('nothing on, nothing planned', () {
      expect(planReminders(const ReminderSettings(), now, keptToday: false, eveningDone: false), isEmpty);
    });

    test('daily: today if the time is still ahead, then each day, ten days in all', () {
      final r = planReminders(const ReminderSettings(daily: true, minutes: 20 * 60), now, keptToday: false, eveningDone: false);
      expect(r, hasLength(10));
      expect(r.first.at, DateTime(2026, 11, 24, 20));
      expect(r.last.at, DateTime(2026, 12, 3, 20));
      expect(r.map((x) => x.id).toSet(), hasLength(10), reason: 'every reminder has its own id');
    });

    test('daily: today is skipped when the time has passed or today is already kept', () {
      final past = planReminders(const ReminderSettings(daily: true, minutes: 9 * 60), now, keptToday: false, eveningDone: false);
      expect(past.first.at, DateTime(2026, 11, 25, 9));
      expect(past, hasLength(9));
      final kept = planReminders(const ReminderSettings(daily: true, minutes: 20 * 60), now, keptToday: true, eveningDone: false);
      expect(kept.first.at, DateTime(2026, 11, 25, 20));
    });

    test('recalls: an evening one each night and a morning one after it; tonight’s is left out once done', () {
      final r = planReminders(const ReminderSettings(recalls: true), now, keptToday: false, eveningDone: false);
      expect(r.where((x) => x.title == 'When you lie down'), hasLength(10));
      expect(r.where((x) => x.title == 'Good morning'), hasLength(9), reason: 'no morning one for today: it is already afternoon');
      expect(r.first.at, DateTime(2026, 11, 24, 19, 30));
      final done = planReminders(const ReminderSettings(recalls: true), now, keptToday: false, eveningDone: true);
      expect(done.where((x) => x.title == 'When you lie down'), hasLength(9));
    });

    test('times read well and settings survive being saved', () {
      expect(timeLabel(0, 5), '12:05 AM');
      expect(timeLabel(12, 0), '12:00 PM');
      expect(timeLabel(20, 30), '8:30 PM');
      const s = ReminderSettings(daily: true, minutes: 20 * 60 + 15, recalls: true);
      final back = ReminderSettings.parse(_encode(s));
      expect(back.daily && back.recalls, isTrue);
      expect(back.hour, 20);
      expect(back.minute, 15);
      expect(ReminderSettings.parse('nonsense').any, isFalse);
      expect(reminderSummary(const ReminderSettings()), 'Off');
      expect(reminderSummary(s), 'Daily at 8:15 PM · Evening and morning recalls');
    });
  });

  testWidgets('turning a reminder on asks permission once and schedules; turning both off clears', (tester) async {
    final sched = FakeScheduler();
    await pumpApp(tester, store: _phone(), reminders: sched);
    await _openReminders(tester);
    expect(sched.asked, 0, reason: 'nothing is asked just by looking');
    expect(sched.plans, isEmpty);
    await _tap(tester, 'Daily reminder');
    expect(sched.asked, 1);
    expect(sched.current, isNotEmpty);
    expect(sched.current.every((r) => r.title == 'Time for today’s Katekize'), isTrue);
    expect(find.text('At 9:00 AM'), findsOneWidget);
    await _tap(tester, 'Evening and morning recalls');
    expect(sched.asked, 1, reason: 'already allowed: not asked again');
    expect(sched.current.any((r) => r.title == 'When you lie down'), isTrue);
    await _tap(tester, 'Daily reminder');
    await _tap(tester, 'Evening and morning recalls');
    expect(sched.current, isEmpty);
  });

  testWidgets('settings are kept on the phone', (tester) async {
    final store = _phone();
    await pumpApp(tester, store: store, reminders: FakeScheduler());
    await _openReminders(tester);
    await _tap(tester, 'Daily reminder');
    expect(ReminderSettings.parse(store.read(remindersKey)).daily, isTrue);
  });

  testWidgets('if the phone refuses permission nothing is turned on, and it says why', (tester) async {
    final sched = FakeScheduler(allow: false);
    final store = _phone();
    await pumpApp(tester, store: store, reminders: sched);
    await _openReminders(tester);
    await _tap(tester, 'Daily reminder');
    expect(sched.asked, 1);
    expect(sched.plans, isEmpty);
    expect(find.textContaining('Notifications are off for Katekize'), findsOneWidget);
    expect(store.read(remindersKey), isNull);
  });

  testWidgets('the You screen says what is on', (tester) async {
    final store = _phone({remindersKey: _encode(const ReminderSettings(daily: true, minutes: 18 * 60))});
    await pumpApp(tester, store: store, reminders: FakeScheduler());
    await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
    await tester.pumpAndSettle();
    expect(find.text('Daily at 6:00 PM'), findsOneWidget);
  });
}

String _encode(ReminderSettings s) => '{"daily":${s.daily},"minutes":${s.minutes},"recalls":${s.recalls}}';
