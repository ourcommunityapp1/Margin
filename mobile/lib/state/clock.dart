// The time, in one place, so tests and screenshots can fix it ("a Tuesday afternoon").

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Reads the time. Override with a fixed time in tests.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);
