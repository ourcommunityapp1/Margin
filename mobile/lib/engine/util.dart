// Small helpers that make Dart behave like the website's JavaScript where it matters for identical results.

const dayMillis = 86400000;

/// Date.parse of an ISO moment, in milliseconds. A bare date ("2026-11-25") is midnight UTC, as in JavaScript.
int parseMs(String s) {
  if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(s)) return DateTime.parse('${s}T00:00:00Z').millisecondsSinceEpoch;
  return DateTime.parse(s).millisecondsSinceEpoch;
}

DateTime fromMs(int ms) => DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);
DateTime fromMsD(double ms) => DateTime.fromMillisecondsSinceEpoch(ms.floor(), isUtc: true);

/// JavaScript's Math.round: halves go up.
int jsRound(num x) => (x + 0.5).floor();

/// A sort that keeps equal items in their order, like JavaScript's.
List<T> stableSorted<T>(Iterable<T> list, int Function(T a, T b) compare) {
  final indexed = list.toList().asMap().entries.toList();
  indexed.sort((a, b) {
    final c = compare(a.value, b.value);
    return c != 0 ? c : a.key.compareTo(b.key);
  });
  return indexed.map((e) => e.value).toList();
}

String _two(int n) => n.toString().padLeft(2, '0');

/// The phone's local date (YYYY-MM-DD) of a moment.
String localDay(DateTime d) {
  final l = d.toLocal();
  return '${l.year.toString().padLeft(4, '0')}-${_two(l.month)}-${_two(l.day)}';
}

/// JavaScript's `new Date(y, m, d, h)` in local time (m from 0, overflow rolls over).
DateTime localDate(int y, int m, int d, [int h = 0]) => DateTime(y, m + 1, d, h);

int minInt(Iterable<int> xs) => xs.reduce((a, b) => a < b ? a : b);
int maxInt(Iterable<int> xs) => xs.reduce((a, b) => a > b ? a : b);
double minD(Iterable<double> xs) => xs.reduce((a, b) => a < b ? a : b);
double maxD(Iterable<double> xs) => xs.reduce((a, b) => a > b ? a : b);
