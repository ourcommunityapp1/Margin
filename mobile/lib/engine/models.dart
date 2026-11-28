// The shapes progress is stored in: one answer, one saved schedule, one part's memory. They read and write exactly the
// JSON the website stores (src/heir/progress.ts, memory.ts), so a phone and the website can share one account (ADR-0004).

import 'fsrs.dart';

int? _int(Object? v) => v == null ? null : (v as num).toInt();
double? _dbl(Object? v) => v == null ? null : (v as num).toDouble();

/// One graded step of a session (a recall or a recognition), before it is stamped into the log.
class StepResult {
  final String itemId, kind;
  final String? part;
  final int? of, words, misses;
  final List<int>? missed;

  /// Positions of the words this step asked about, when it asks about only some (fill in the blanks, spot the wrong word).
  final List<int>? tested;
  final bool correct, review;
  final int hints, ms;
  final double? p;
  const StepResult({
    required this.itemId,
    required this.kind,
    this.part,
    this.of,
    this.words,
    this.misses,
    this.missed,
    this.tested,
    required this.correct,
    required this.hints,
    required this.ms,
    required this.review,
    this.p,
  });

  factory StepResult.fromJson(Map<String, dynamic> j) => StepResult(
        itemId: j['itemId'] as String,
        kind: j['kind'] as String,
        part: j['part'] as String?,
        of: _int(j['of']),
        words: _int(j['words']),
        misses: _int(j['misses']),
        missed: (j['missed'] as List?)?.map((x) => (x as num).toInt()).toList(),
        tested: (j['tested'] as List?)?.map((x) => (x as num).toInt()).toList(),
        correct: j['correct'] == true,
        hints: _int(j['hints']) ?? 0,
        ms: _int(j['ms']) ?? 0,
        review: j['review'] == true,
        p: _dbl(j['p']),
      );

  Map<String, Object?> toJson() => {
        'itemId': itemId,
        'kind': kind,
        if (part != null) 'part': part,
        if (of != null) 'of': of,
        if (words != null) 'words': words,
        if (misses != null) 'misses': misses,
        if (missed != null) 'missed': missed,
        if (tested != null) 'tested': tested,
        'correct': correct,
        'hints': hints,
        'ms': ms,
        'review': review,
        if (p != null) 'p': p,
      };
}

/// One answer in the log. [at] is when the session finished (ISO, shared by every answer in it).
class LogEntry extends StepResult {
  final String at;
  final String? id, day, mv;
  const LogEntry({
    required this.at,
    required super.itemId,
    required super.kind,
    super.part,
    super.of,
    super.words,
    super.misses,
    super.missed,
    super.tested,
    required super.correct,
    required super.hints,
    required super.ms,
    required super.review,
    super.p,
    this.id,
    this.day,
    this.mv,
  });

  factory LogEntry.fromJson(Map<String, dynamic> j) {
    final r = StepResult.fromJson(j);
    return LogEntry(
      at: j['at'] as String,
      itemId: r.itemId,
      kind: r.kind,
      part: r.part,
      of: r.of,
      words: r.words,
      misses: r.misses,
      missed: r.missed,
      tested: r.tested,
      correct: r.correct,
      hints: r.hints,
      ms: r.ms,
      review: r.review,
      p: r.p,
      id: j['id'] as String?,
      day: j['day'] as String?,
      mv: j['mv'] as String?,
    );
  }

  factory LogEntry.stamp(StepResult r, {required String at, required String id, required String day, String? mv}) => LogEntry(
        at: at,
        itemId: r.itemId,
        kind: r.kind,
        part: r.part,
        of: r.of,
        words: r.words,
        misses: r.misses,
        missed: r.missed,
        tested: r.tested,
        correct: r.correct,
        hints: r.hints,
        ms: r.ms,
        review: r.review,
        p: r.p,
        id: id,
        day: day,
        mv: mv,
      );

  @override
  Map<String, Object?> toJson() => {
        'at': at,
        ...super.toJson(),
        if (id != null) 'id': id,
        if (day != null) 'day': day,
        if (mv != null) 'mv': mv,
      };
}

/// An item's saved schedule (ts-fsrs Card with dates as ISO text).
class SavedCard {
  final String due;
  final String? lastReview;
  final double stability, difficulty;
  final int scheduledDays, reps, lapses, learningSteps, state;
  const SavedCard({
    required this.due,
    this.lastReview,
    required this.stability,
    required this.difficulty,
    required this.scheduledDays,
    required this.reps,
    required this.lapses,
    required this.learningSteps,
    required this.state,
  });

  factory SavedCard.fromJson(Map<String, dynamic> j) => SavedCard(
        due: j['due'] as String,
        lastReview: j['last_review'] as String?,
        stability: _dbl(j['stability']) ?? 0,
        difficulty: _dbl(j['difficulty']) ?? 0,
        scheduledDays: _int(j['scheduled_days']) ?? 0,
        reps: _int(j['reps']) ?? 0,
        lapses: _int(j['lapses']) ?? 0,
        learningSteps: _int(j['learning_steps']) ?? 0,
        state: _int(j['state']) ?? 0,
      );

  Map<String, Object?> toJson() => {
        'due': due,
        'stability': stability,
        'difficulty': difficulty,
        'scheduled_days': scheduledDays,
        'reps': reps,
        'lapses': lapses,
        'learning_steps': learningSteps,
        'state': state,
        if (lastReview != null) 'last_review': lastReview,
      };

  SavedCard withDue(String d) => SavedCard(due: d, lastReview: lastReview, stability: stability, difficulty: difficulty, scheduledDays: scheduledDays, reps: reps, lapses: lapses, learningSteps: learningSteps, state: state);

  FsrsCard toCard() => FsrsCard(
        due: DateTime.parse(due),
        stability: stability,
        difficulty: difficulty,
        scheduledDays: scheduledDays,
        reps: reps,
        lapses: lapses,
        learningSteps: learningSteps,
        state: state,
        lastReview: lastReview == null ? null : DateTime.parse(lastReview!),
      );

  factory SavedCard.fromCard(FsrsCard c) => SavedCard(
        due: iso(c.due),
        lastReview: c.lastReview == null ? null : iso(c.lastReview!),
        stability: c.stability,
        difficulty: c.difficulty,
        scheduledDays: c.scheduledDays,
        reps: c.reps,
        lapses: c.lapses,
        learningSteps: c.learningSteps,
        state: c.state,
      );
}

/// A moment as the website writes it ("2026-11-25T02:40:00.000Z").
String iso(DateTime d) => d.toUtc().toIso8601String();

/// One line of a long answer's memory.
class PartMem {
  final double s, d;
  final String last;
  final int reps, lapses, state;
  const PartMem({required this.s, required this.d, required this.last, required this.reps, required this.lapses, required this.state});

  factory PartMem.fromJson(Map<String, dynamic> j) => PartMem(
        s: _dbl(j['s'])!,
        d: _dbl(j['d'])!,
        last: j['last'] as String,
        reps: _int(j['reps']) ?? 0,
        lapses: _int(j['lapses']) ?? 0,
        state: _int(j['state']) ?? 2,
      );

  Map<String, Object?> toJson() => {'s': s, 'd': d, 'last': last, 'reps': reps, 'lapses': lapses, 'state': state};
}

class PartSnapshot {
  final String asOf;
  final Map<String, PartMem> mem;
  const PartSnapshot({required this.asOf, required this.mem});

  Map<String, Object?> toJson() => {'asOf': asOf, 'mem': mem.map((k, v) => MapEntry(k, v.toJson()))};
}
