// Reminder settings (kept on the phone) and putting them on the phone's schedule.

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../engine/progress.dart';
import '../engine/util.dart' show localDay;
import '../platform/reminders.dart';
import 'clock.dart';
import 'household.dart';

/// The phone's notification scheduler. Tests override this with a fake.
final reminderSchedulerProvider = Provider<ReminderScheduler>((ref) => LocalReminderScheduler());

class RemindersController extends Notifier<ReminderSettings> {
  var _scheduled = false;

  @override
  ReminderSettings build() {
    final s = ReminderSettings.parse(ref.read(storeProvider).read(remindersKey));
    _scheduled = s.any;
    // Put reminders again whenever something is practiced (a reminder for today's finished work is dropped).
    ref.listen(myProgressProvider, (_, _) => sync());
    return s;
  }

  /// Saves new settings. Turning a reminder on asks the phone for permission first; when it is refused nothing is turned
  /// on and false is returned.
  Future<bool> set(ReminderSettings next) async {
    if (next.any && !state.any) {
      final ok = await ref.read(reminderSchedulerProvider).requestPermission();
      if (!ok) return false;
    }
    state = next;
    await ref.read(storeProvider).write(remindersKey, _json(next));
    await sync();
    return true;
  }

  static String _json(ReminderSettings s) => jsonEncode(s.toJson());

  /// Schedules the next ten days to match the settings and what is already done today.
  Future<void> sync() async {
    final s = state;
    if (!s.any && !_scheduled) return;
    final now = ref.read(clockProvider)();
    final p = ref.read(myProgressProvider);
    final today = localDay(now);
    final night = p.night;
    final plan = planReminders(
      s,
      now,
      keptToday: p.days.contains(today),
      eveningDone: night != null && localDay(DateTime.parse(night.at).toLocal()) == today,
    );
    try {
      await ref.read(reminderSchedulerProvider).replaceAll(plan);
      _scheduled = s.any;
    } catch (_) {/* tried again at the next change */}
  }
}

final remindersProvider = NotifierProvider<RemindersController, ReminderSettings>(RemindersController.new);
