// Reminders (ADR-0008): a daily reminder at a time the person picks, and an evening and a morning recall. They are
// scheduled on the phone itself (flutter_local_notifications), so no server and no account is needed.
//
// Notifications can't look at progress when they fire, so the next ten days are scheduled in one go and put again each time
// the app opens or a session finishes: a reminder for something already done today is simply left out.

import 'dart:convert';

import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

const remindersKey = 'katekize-reminders-v1';

/// The evening recall is offered from 7 pm (the planner's `eveningFrom`) and the morning one until noon.
const eveningRecallAt = (hour: 19, minute: 30);
const morningRecallAt = (hour: 8, minute: 0);

class ReminderSettings {
  const ReminderSettings({this.daily = false, this.minutes = 9 * 60, this.recalls = false});

  /// A daily reminder at [minutes] after midnight (default 9:00 am).
  final bool daily;
  final int minutes;

  /// An evening reminder to lock in what was learned, and a morning one to recall it.
  final bool recalls;

  bool get any => daily || recalls;
  int get hour => minutes ~/ 60;
  int get minute => minutes % 60;

  ReminderSettings copyWith({bool? daily, int? minutes, bool? recalls}) => ReminderSettings(daily: daily ?? this.daily, minutes: minutes ?? this.minutes, recalls: recalls ?? this.recalls);

  Map<String, Object?> toJson() => {'daily': daily, 'minutes': minutes, 'recalls': recalls};

  factory ReminderSettings.parse(String? raw) {
    if (raw == null) return const ReminderSettings();
    try {
      final j = jsonDecode(raw) as Map;
      final m = (j['minutes'] as num?)?.toInt() ?? 9 * 60;
      return ReminderSettings(daily: j['daily'] == true, minutes: m.clamp(0, 24 * 60 - 1), recalls: j['recalls'] == true);
    } catch (_) {
      return const ReminderSettings();
    }
  }
}

/// "9:00 AM".
String timeLabel(int hour, int minute) {
  final h = hour % 12 == 0 ? 12 : hour % 12;
  return '$h:${minute.toString().padLeft(2, '0')} ${hour < 12 ? 'AM' : 'PM'}';
}

/// What the settings say, for the row on You.
String reminderSummary(ReminderSettings s) {
  if (!s.any) return 'Off';
  final parts = [if (s.daily) 'Daily at ${timeLabel(s.hour, s.minute)}', if (s.recalls) 'Evening and morning recalls'];
  return parts.join(' · ');
}

class Reminder {
  const Reminder(this.id, this.at, this.title, this.body);
  final int id;
  final DateTime at;
  final String title, body;
}

/// The reminders to schedule for the next [days] days, left out when already past or already done.
/// [keptToday]: something was practiced today (no daily reminder for today). [eveningDone]: tonight's recall was done.
List<Reminder> planReminders(ReminderSettings s, DateTime now, {required bool keptToday, required bool eveningDone, int days = 10}) {
  final out = <Reminder>[];
  final start = DateTime(now.year, now.month, now.day);
  for (var d = 0; d < days; d++) {
    final day = DateTime(start.year, start.month, start.day + d);
    DateTime at(int h, int m) => DateTime(day.year, day.month, day.day, h, m);
    if (s.daily) {
      final t = at(s.hour, s.minute);
      if (t.isAfter(now) && !(d == 0 && keptToday)) {
        out.add(Reminder(100 + d, t, 'Time for today’s Katekize', 'A few minutes with the Word keeps it in your memory.'));
      }
    }
    if (s.recalls) {
      final e = at(eveningRecallAt.hour, eveningRecallAt.minute);
      if (e.isAfter(now) && !(d == 0 && eveningDone)) {
        out.add(Reminder(200 + d, e, 'When you lie down', 'A short recall tonight helps what you learned settle.'));
      }
      final m = at(morningRecallAt.hour, morningRecallAt.minute);
      if (m.isAfter(now) && d > 0) {
        out.add(Reminder(300 + d, m, 'Good morning', 'One quick recall of last night’s words.'));
      }
    }
  }
  return out;
}

/// Puts reminders on the phone. Behind an interface so tests use a fake.
abstract interface class ReminderScheduler {
  /// Asks permission to show notifications (the phone only asks the person once). True when allowed.
  Future<bool> requestPermission();

  /// Replaces everything scheduled with exactly [items] (none cancels all).
  Future<void> replaceAll(List<Reminder> items);
}

class LocalReminderScheduler implements ReminderScheduler {
  final _plugin = FlutterLocalNotificationsPlugin();
  Future<void>? _ready;

  Future<void> _init() => _ready ??= () async {
        tzdata.initializeTimeZones();
        try {
          tz.setLocalLocation(tz.getLocation((await FlutterTimezone.getLocalTimezone()).identifier));
        } catch (_) {/* falls back to UTC: reminders then follow UTC, not local time */}
        // Nothing is asked here: permission is requested when the person turns a reminder on.
        await _plugin.initialize(
          settings: const InitializationSettings(
            android: AndroidInitializationSettings('@mipmap/ic_launcher'),
            iOS: DarwinInitializationSettings(requestAlertPermission: false, requestBadgePermission: false, requestSoundPermission: false),
          ),
        );
      }();

  @override
  Future<bool> requestPermission() async {
    await _init();
    if (defaultTargetPlatform == TargetPlatform.android) {
      return await _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.requestNotificationsPermission() ?? false;
    }
    return await _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(alert: true, sound: true) ?? false;
  }

  @override
  Future<void> replaceAll(List<Reminder> items) async {
    await _init();
    await _plugin.cancelAll();
    const details = NotificationDetails(
      android: AndroidNotificationDetails('reminders', 'Reminders', channelDescription: 'Daily and recall reminders', importance: Importance.defaultImportance),
      iOS: DarwinNotificationDetails(),
    );
    for (final r in items) {
      await _plugin.zonedSchedule(
        id: r.id,
        title: r.title,
        body: r.body,
        scheduledDate: tz.TZDateTime.from(r.at, tz.local),
        notificationDetails: details,
        // Close enough is fine for a reminder, and it needs no special permission on Android.
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      );
    }
  }
}
