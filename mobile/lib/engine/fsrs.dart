// FSRS-6 as the website runs it: ts-fsrs 6.0.0 with the default weights, short-term steps off ("long-term scheduler"),
// fuzz on for the real schedule and off for the part-memory replay. Port of node_modules/ts-fsrs, only the parts Katekize
// uses: the next card for a grade, the fuzz, and the forgetting curve (ADR-0003). The fixtures decide if it is right.

import 'dart:math' as math;

const dayMs = 86400000;

// Rating and State, as ts-fsrs numbers them.
const ratingAgain = 1, ratingHard = 2, ratingGood = 3, ratingEasy = 4;
const stateNew = 0, stateLearning = 1, stateReview = 2, stateRelearning = 3;

const _w = <double>[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
const double fsrsDecay = 0.1542;
const _sMin = 0.001, _sMax = 36500.0, _maxInterval = 36500;
const _retention = 0.9;

double _clamp(double v, double lo, double hi) => math.min(math.max(v, lo), hi);
/// JavaScript's Math.round (halves go up), then divided back: `roundTo`.
double _roundTo(double n, int decimals) {
  final f = math.pow(10, decimals).toDouble();
  return (n * f + 0.5).floorToDouble() / f;
}

double _jsRound(double x) => (x + 0.5).floorToDouble();

class FsrsCard {
  DateTime due;
  double stability, difficulty;
  int scheduledDays, reps, lapses, learningSteps, state;
  DateTime? lastReview;
  FsrsCard({required this.due, this.stability = 0, this.difficulty = 0, this.scheduledDays = 0, this.reps = 0, this.lapses = 0, this.learningSteps = 0, this.state = stateNew, this.lastReview});

  FsrsCard copy() => FsrsCard(due: due, stability: stability, difficulty: difficulty, scheduledDays: scheduledDays, reps: reps, lapses: lapses, learningSteps: learningSteps, state: state, lastReview: lastReview);
}

FsrsCard createEmptyCard(DateTime now) => FsrsCard(due: now);

// ---- the model

double _decay() => -_w[20];
double _factor() => _roundTo(math.exp(math.log(0.9) / _decay()) - 1, 8);

double forgettingCurve(double elapsedDays, double stability) =>
    _roundTo(math.pow(1 + _factor() * elapsedDays / stability, _decay()).toDouble(), 8);

double _initStability(int g) => _clamp(_w[g - 1], _sMin, _sMax);
double _initDifficulty(int g) => _roundTo(_w[4] - math.exp((g - 1) * _w[5]) + 1, 8);

int _nextInterval(double s) {
  final v = _jsRound(s / _factor() * (math.pow(_retention, 1 / _decay()) - 1));
  return math.max(v, 1).toInt();
}

double _linearDamping(double deltaD, double oldD) => _roundTo(deltaD * (10 - oldD) / 9, 8);
double _meanReversion(double init, double current) => _roundTo(_w[7] * init + (1 - _w[7]) * current, 8);
double _nextDifficulty(double d, int g) {
  final deltaD = -_w[6] * (g - 3);
  final nextD = d + _linearDamping(deltaD, d);
  return _clamp(_meanReversion(_initDifficulty(ratingEasy), nextD), 1, 10);
}

double _nextRecallStability(double d, double s, double r, int g) {
  final hardPenalty = ratingHard == g ? _w[15] : 1.0;
  final easyBound = ratingEasy == g ? _w[16] : 1.0;
  return _roundTo(
      _clamp(s * (1 + math.exp(_w[8]) * (11 - d) * math.pow(s, -_w[9]) * (math.exp((1 - r) * _w[10]) - 1) * hardPenalty * easyBound), _sMin, _sMax), 8);
}

double _nextForgetStability(double d, double s, double r) =>
    _roundTo(_clamp(_w[11] * math.pow(d, -_w[12]) * (math.pow(s + 1, _w[13]) - 1) * math.exp((1 - r) * _w[14]), _sMin, _sMax), 8);

({double difficulty, double stability}) _nextState(double d, double s, int t, int g) {
  if (d == 0 && s == 0) return (difficulty: _clamp(_initDifficulty(g), 1, 10), stability: _initStability(g));
  final r = forgettingCurve(t.toDouble(), s);
  double newS;
  if (g == 1) {
    final afterFail = _nextForgetStability(d, s, r);
    // short-term steps are off, so w17 and w18 count as 0 and the floor is the old stability itself
    final nextSMin = s / math.exp(0.0);
    newS = _clamp(_roundTo(nextSMin, 8), _sMin, afterFail);
  } else {
    newS = _nextRecallStability(d, s, r, g);
  }
  return (difficulty: _nextDifficulty(d, g), stability: newS);
}

// ---- fuzz (the interval is nudged by a day or so, the same way for the same card and moment)

int _imul(int a, int b) {
  a &= 0xffffffff;
  b &= 0xffffffff;
  return (((a & 0xffff) * b) + ((((a >> 16) * b) & 0xffff) << 16)) & 0xffffffff;
}

int _fnv1a32(String s) {
  var h = 2166136261;
  for (final c in s.codeUnits) {
    h ^= c;
    h = _imul(h, 16777619);
  }
  return h & 0xffffffff;
}

double _mulberry32Once(int seed) {
  var t = ((seed & 0xffffffff) + 1831565813) & 0xffffffff;
  t = _imul(t ^ (t >> 15), t | 1);
  t = (t ^ (t + _imul(t ^ (t >> 7), t | 61))) & 0xffffffff;
  return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296;
}

({int min, int max}) _fuzzRange(double interval, int elapsedDays) {
  const ranges = [(2.5, 7.0, 0.15), (7.0, 20.0, 0.1), (20.0, double.infinity, 0.05)];
  var delta = 1.0;
  for (final (start, end, factor) in ranges) {
    delta += factor * math.max(math.min(interval, end) - start, 0);
  }
  final capped = math.min(interval, _maxInterval.toDouble());
  var minI = math.max(2, _jsRound(capped - delta).toInt());
  final maxI = math.min(_jsRound(capped + delta).toInt(), _maxInterval);
  if (capped > elapsedDays) minI = math.max(minI, elapsedDays + 1);
  minI = math.min(minI, maxI);
  return (min: minI, max: maxI);
}

/// A JavaScript number as text (3 not 3.0), since the fuzz seed is built from one.
String jsNumber(double n) {
  final s = n.toString();
  return s.endsWith('.0') ? s.substring(0, s.length - 2) : s;
}

int _withFuzzing(int interval, int elapsedDays, bool fuzz, String seed) {
  if (!fuzz || interval < 2.5) return interval;
  final r = _fuzzRange(interval.toDouble(), elapsedDays);
  final f = _mulberry32Once(_fnv1a32(seed));
  return (f * (r.max - r.min + 1) + r.min).floor();
}

int _daysBetweenUtc(DateTime last, DateTime cur) {
  final a = DateTime.utc(last.toUtc().year, last.toUtc().month, last.toUtc().day);
  final b = DateTime.utc(cur.toUtc().year, cur.toUtc().month, cur.toUtc().day);
  return ((b.millisecondsSinceEpoch - a.millisecondsSinceEpoch) / dayMs).floor();
}

/// The card after one review. [fuzz] true is the real schedule; false is the part-memory replay (no randomness).
FsrsCard fsrsNext(FsrsCard card, DateTime now, int grade, {required bool fuzz}) {
  final isNew = card.state == stateNew;
  var elapsed = 0;
  if (!isNew && card.lastReview != null) elapsed = _daysBetweenUtc(card.lastReview!, now);
  final cur = card.copy()
    ..lastReview = now
    ..reps = card.reps + 1;
  final seed = '${now.millisecondsSinceEpoch}_${cur.reps}_${jsNumber(cur.difficulty * cur.stability)}';
  final t = isNew ? 0 : elapsed;
  // All four grades are worked out together, then kept in order (each at least a day after the one below it).
  final next = [for (final g in [ratingAgain, ratingHard, ratingGood, ratingEasy]) _nextState(card.difficulty, card.stability, t, g)];
  final raw = [for (final n in next) _withFuzzing(_nextInterval(n.stability), t, fuzz, seed)];
  final first = math.min(raw[0], _maxInterval);
  final second = math.min(math.max(raw[1], first == 0 ? 0 : first + 1), _maxInterval);
  final third = math.min(math.max(raw[2], second == 0 ? 0 : second + 1), _maxInterval);
  final fourth = math.min(math.max(raw[3], third == 0 ? 0 : third + 1), _maxInterval);
  final days = [first, second, third, fourth][grade - 1];
  final n = next[grade - 1];
  return cur
    ..difficulty = n.difficulty
    ..stability = n.stability
    ..scheduledDays = days
    ..due = DateTime.fromMillisecondsSinceEpoch(now.millisecondsSinceEpoch + days * dayMs, isUtc: true)
    ..state = stateReview
    ..learningSteps = 0
    ..lapses = grade == ratingAgain && !isNew ? card.lapses + 1 : card.lapses;
}
