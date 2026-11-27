// The time, in one place, so tests and screenshots can fix it ("a Tuesday afternoon").

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// For checking the screens at another time of day on the simulator only: `--dart-define=NOW=2026-11-26T06:00` starts the
/// app's clock there (it then runs on as normal). Never set for a store build. Such a build never writes to the account
/// (Config.syncWrites), so a pretend date can't reach the website.
const _startAt = String.fromEnvironment('NOW');
final DateTime? _fixed = _startAt.isEmpty ? null : DateTime.tryParse(_startAt);
final _launched = DateTime.now();

/// The start time set with `--dart-define=NOW=...`, if any (the background then follows it too).
DateTime? get simulatedStart => _fixed;

DateTime _now() => _fixed == null ? DateTime.now() : _fixed!.add(DateTime.now().difference(_launched));

/// Reads the time. Override with a fixed time in tests.
final clockProvider = Provider<DateTime Function()>((ref) => _now);
