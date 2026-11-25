// Small pure helpers for the friends screens. Port of src/heir/social.ts.

import 'util.dart';

final usernameRule = RegExp(r'^[A-Za-z][A-Za-z0-9_]{2,19}$');
const _reserved = ['admin', 'administrator', 'katekize', 'heir', 'support', 'help', 'staff', 'official', 'moderator', 'mod', 'root', 'system', 'null', 'undefined', 'anonymous', 'everyone', 'me', 'you'];

String? usernameProblem(String name) {
  final n = name.trim();
  if (!usernameRule.hasMatch(n)) return 'Use 3 to 20 letters, numbers or underscores, starting with a letter.';
  if (_reserved.contains(n.toLowerCase())) return 'That name is reserved.';
  return null;
}

String place(String? city, String? region) => [city?.trim(), region?.trim()].where((s) => s != null && s.isNotEmpty).join(', ');

const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdaysLong = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/// "Mar 2026" (the local month).
String sinceLabel(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final d = DateTime.tryParse(iso);
  if (d == null) return '';
  final l = d.toLocal();
  return '${monthsShort[l.month - 1]} ${l.year}';
}

String streakLine(int streak, String? lastDay, String today) {
  if (streak > 0) return '$streak-day streak';
  if (lastDay == null || lastDay.isEmpty) return 'No lessons yet';
  final days = jsRound((parseMs(today) - parseMs(lastDay)) / dayMillis);
  return days <= 1 ? 'Last lesson yesterday' : 'Last lesson $days days ago';
}

String friendsCount(int n) => '$n ${n == 1 ? 'friend' : 'friends'}';
