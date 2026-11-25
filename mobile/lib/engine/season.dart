// The church year's two great seasons. Port of src/heir/season.ts and the small time.ts helpers.

import 'social.dart';
import 'util.dart';

DateTime _at(int y, int m, int d) => localDate(y, m, d);

/// The first Sunday of Advent: four Sundays before Christmas.
DateTime adventSunday(int year) {
  final christmas = _at(year, 11, 25);
  final wd = christmas.weekday % 7;
  final back = wd == 0 ? 7 : wd;
  return _at(year, 11, 25 - back - 21);
}

/// Easter Sunday (Gregorian calendar; the anonymous algorithm).
DateTime easterSunday(int year) {
  final a = year % 19, b = year ~/ 100, c = year % 100, d = b ~/ 4, e = b % 4;
  final f = (b + 8) ~/ 25, g = (b - f + 1) ~/ 3, h = (19 * a + b - d - g + 15) % 30;
  final i = c ~/ 4, k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = (a + 11 * h + 22 * l) ~/ 451;
  final month = (h + l - 7 * m + 114) ~/ 31 - 1, day = ((h + l - 7 * m + 114) % 31) + 1;
  return _at(year, month, day);
}

String _fmt(DateTime d) => '${weekdaysLong[d.weekday - 1]}, ${monthsLong[d.month - 1]} ${d.day}';

/// A short label while [season] ('christmas' or 'easter') is in season on [now]; else null.
String? seasonLabel(String season, DateTime now) {
  final l = now.toLocal();
  final today = _at(l.year, l.month - 1, l.day);
  const day = dayMillis;
  if (season == 'christmas') {
    for (final y in [today.year - 1, today.year]) {
      final advent = adventSunday(y), from = advent.subtract(const Duration(days: 7)), to = _at(y + 1, 0, 6);
      if (today.isBefore(from) || today.isAfter(to)) continue;
      if (today.isBefore(advent)) return (advent.millisecondsSinceEpoch - today.millisecondsSinceEpoch) / day <= 7 ? 'Advent starts Sunday' : 'Advent starts ${_fmt(advent)}';
      return today.isBefore(_at(y, 11, 25)) ? 'Advent' : 'Christmas';
    }
    return null;
  }
  final easter = easterSunday(today.year);
  final ash = fromMs(easter.millisecondsSinceEpoch - 46 * day), to = fromMs(easter.millisecondsSinceEpoch + 7 * day);
  if (today.isBefore(ash) || today.isAfter(to)) return null;
  if (today.isBefore(fromMs(easter.millisecondsSinceEpoch - 7 * day))) return 'Lent';
  return today.isBefore(easter) ? 'Holy Week' : 'Easter';
}

/// 'dawn', 'day', 'dusk' or 'night': decides the background and whether the bedtime review is offered.
String timeOfDay(DateTime date) {
  final h = date.toLocal().hour;
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

String greeting(String t) => t == 'dawn' ? 'Good morning' : t == 'day' ? 'Good afternoon' : t == 'dusk' ? 'Good evening' : 'Good night';

String dayName(DateTime date) => weekdaysLong[date.toLocal().weekday - 1];
