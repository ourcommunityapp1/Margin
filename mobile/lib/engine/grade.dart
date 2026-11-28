// Grading the way a patient teacher would: strict about which words, forgiving about capitals, punctuation,
// a slip of one letter in a long word, and speech that splits a word ("for ever" for "forever").
// Port of src/heir/grade.ts.

import 'dart:math' as math;
import 'words.dart';

int editDistance(String a, String b) {
  final row = List<int>.generate(b.length + 1, (i) => i);
  for (var i = 1; i <= a.length; i++) {
    var prev = row[0];
    row[0] = i;
    for (var j = 1; j <= b.length; j++) {
      final keep = row[j];
      row[j] = math.min(math.min(row[j] + 1, row[j - 1] + 1), prev + (a[i - 1] == b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

final _consonant = RegExp('[bcdfghjklmnpqrstvwxz]');
bool _doubledEnd(String a, String b) =>
    a.length == b.length + 1 && a.startsWith(b) && b.isNotEmpty && a[a.length - 1] == b[b.length - 1] && _consonant.hasMatch(b[b.length - 1]);

String _stem(String w) => w.replaceAll(RegExp(r'ies$'), 'y').replaceAll(RegExp(r'(ly|es|s)$'), '');

bool _dictationSlip(String t, String e) {
  if (_doubledEnd(t, e) || _doubledEnd(e, t)) return true;
  final a = t.length < e.length ? t : e;
  final b = t.length < e.length ? e : t;
  if (a.length >= 5 && b.startsWith(a) && b.length - a.length <= 2) return true;
  return e.length >= 4 && t.length >= 4 && _stem(t) == _stem(e) && _stem(e).length >= 3;
}

String _noApos(String s) => normalizeWord(s).replaceAll("'", '');

/// One typed word against the expected word. Short words must be exact; long ones allow one slip; voice typing's
/// usual slips are forgiven.
bool wordMatches(String typed, String expected) {
  final t = _noApos(typed), e = _noApos(expected);
  if (t.isEmpty) return false;
  if (t == e) return true;
  return (e.length >= 6 && editDistance(t, e) <= 1) || _dictationSlip(t, e);
}

/// A near miss: the right word with a spelling slip that is more than [wordMatches] allows.
bool closeWord(String typed, String expected) {
  final t = _noApos(typed), e = _noApos(expected);
  if (t.isEmpty || wordMatches(typed, expected)) return false;
  return e.length >= 4 && (t.length - e.length).abs() <= 1 && editDistance(t, e) <= (e.length >= 7 ? 2 : 1);
}

class OrderCheck {
  final bool ok, close;
  final List<String> extra, missing;
  final int outOfPlace;
  const OrderCheck({required this.ok, required this.close, required this.extra, required this.missing, required this.outOfPlace});
}

OrderCheck checkOrder(List<String> picked, List<String> tiles) {
  final p = picked.map(normalizeWord).toList(), t = tiles.map(normalizeWord).toList();
  if (p.join(' ') == t.join(' ')) return const OrderCheck(ok: true, close: false, extra: [], missing: [], outOfPlace: 0);
  final left = [...t];
  final extra = <String>[];
  for (var i = 0; i < picked.length; i++) {
    final k = left.indexOf(p[i]);
    if (k >= 0) {
      left.removeAt(k);
    } else {
      extra.add(picked[i]);
    }
  }
  final missing = tiles.where((w) => left.contains(normalizeWord(w))).toList();
  var outOfPlace = 0;
  for (var i = 0; i < p.length; i++) {
    if (i >= t.length || p[i] != t[i]) outOfPlace++;
  }
  final close = extra.length <= 1 && missing.length <= 1 && outOfPlace <= 2;
  return OrderCheck(ok: false, close: close, extra: extra, missing: missing, outOfPlace: outOfPlace);
}

/// The first letter a person would type for a word ("Man’s" → "m").
String firstLetter(String word) {
  final n = normalizeWord(word).replaceAll("'", '');
  return n.isEmpty ? '' : n[0];
}

class SpokenResult {
  final List<bool> heard, moved;
  final double score;
  const SpokenResult({required this.heard, required this.moved, required this.score});
}

const _small = {'the', 'and', 'of', 'to', 'in', 'is', 'a', 'an', 'that', 'by', 'for', 'with', 'who', 'which', 'as', 'unto', 'all', 'but', 'be'};

/// Lines up what was said with what was expected by best fit (a weighted longest common subsequence), after rejoining
/// words the recognizer split ("for ever"). Score is the share of expected words heard.
SpokenResult gradeSpoken(String expectedText, String said) {
  final expected = words(expectedText).map((w) => w.replaceAll("'", '')).toList();
  final raw = words(said).map((w) => w.replaceAll("'", '')).toList();
  final got = <String>[];
  for (var i = 0; i < raw.length; i++) {
    final joined = raw[i] + (i + 1 < raw.length ? raw[i + 1] : '');
    if (i + 1 < raw.length && !expected.any((e) => wordMatches(raw[i], e)) && expected.any((e) => wordMatches(joined, e))) {
      got.add(joined);
      i++;
    } else {
      got.add(raw[i]);
    }
  }
  final e = expected.length, g = got.length;
  double weight(String w) => _small.contains(w) ? 1.1 : 1;
  final dp = List.generate(e + 1, (_) => List<double>.filled(g + 1, 0));
  for (var i = 1; i <= e; i++) {
    for (var j = 1; j <= g; j++) {
      final take = wordMatches(got[j - 1], expected[i - 1]) ? dp[i - 1][j - 1] + weight(expected[i - 1]) : -1.0;
      dp[i][j] = math.max(math.max(dp[i - 1][j], dp[i][j - 1]), take);
    }
  }
  final heard = List<bool>.filled(e, false);
  final used = List<bool>.filled(g, false);
  var i = e, j = g;
  while (i > 0 && j > 0) {
    if (wordMatches(got[j - 1], expected[i - 1]) && dp[i][j] == dp[i - 1][j - 1] + weight(expected[i - 1])) {
      heard[i - 1] = true;
      used[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  final moved = List<bool>.generate(e, (idx) {
    if (heard[idx]) return false;
    final k = List.generate(g, (x) => x).indexWhere((x) => !used[x] && wordMatches(got[x], expected[idx]));
    if (k < 0) return false;
    used[k] = true;
    return true;
  });
  final score = e > 0 ? heard.where((h) => h).length / e : 0.0;
  return SpokenResult(heard: heard, moved: moved, score: score);
}

const spokenPass = 0.8;
const typedPass = 0.9;
const nearly = 0.7;
