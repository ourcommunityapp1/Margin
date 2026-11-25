// Runs a lesson (src/app/heir/ui/lesson.tsx LessonRunner): a progress bar, the step's card, a feedback sheet after each
// answer, and a second try at the end for anything missed. Every answer is recorded; when the last one is done the
// lesson is saved to the person's progress (finishSession, settle) and Today's record, and the done screen shows how
// it went.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/dayplan.dart';
import '../../engine/lesson.dart' as lesson;
import '../../engine/levels.dart';
import '../../engine/measures.dart';
import '../../engine/memory.dart';
import '../../engine/models.dart';
import '../../engine/planner.dart' as planner;
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../data/household.dart' show newId;
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../today/today_cards.dart' show RoseCard;
import '../window/light.dart';
import '../window/reveal_window.dart';
import 'labels.dart';
import 'outcome.dart';
import 'session.dart';
import 'step_frame.dart';
import 'steps.dart';

const _praise = ['Correct.', 'That’s right.', 'Well done.'];

/// The text before a part's lead-in: the verse or answer up to where the part being practised starts.
String contextBefore(Item item, Track track, String lead) {
  if (lead.isEmpty) return '';
  final c = item.chunks[track]!;
  final at = c.indexOf(lead);
  return at > 0 ? c.sublist(0, at).join(' ') : '';
}

/// How a lesson went, for the done screen.
class _Finished {
  const _Finished({required this.right, required this.total, required this.minutes, required this.ups, required this.awards, required this.kept});
  final int right, total, minutes, kept;
  final List<({String itemId, int from, int to})> ups;
  final List<String> awards;
}

class LessonScreen extends ConsumerStatefulWidget {
  const LessonScreen({super.key, required this.session, required this.track});

  final Session session;
  final Track track;

  @override
  ConsumerState<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends ConsumerState<LessonScreen> {
  late List<lesson.Step> _queue = [...widget.session.steps];
  int _pos = 0;
  Outcome? _feedback;
  _Finished? _finished;
  final Set<String> _retried = {};

  /// One result per step, the first time it was answered.
  final Map<String, StepResult> _results = {};
  DateTime _stepStart = DateTime.now();
  int _activeMs = 0;

  static String _key(lesson.Step s) => s.id.replaceAll(RegExp(r':typed$'), '');

  Session get _session => widget.session;

  void _report(Outcome o) {
    final step = _queue[_pos];
    // The welcome lesson's easy questions teach about the catechism, not the answer: not graded or repeated.
    if (step.kind == 'quiz') {
      setState(() => _feedback = o);
      return;
    }
    final now = ref.read(clockProvider)();
    final key = _key(step);
    final mine = ref.read(myProgressProvider);
    // The chance the model gave before this answer, kept beside it so we can check the model is right.
    final chance = const ['type', 'say', 'letters'].contains(step.kind) ? predictedChance(mine.cards[step.itemId], now) : null;
    _results.putIfAbsent(
      key,
      () => StepResult(
        itemId: step.itemId,
        kind: step.kind,
        correct: o.ok,
        hints: o.hints ?? 0,
        ms: DateTime.now().difference(_stepStart).inMilliseconds,
        review: step.review,
        p: chance,
        part: step.part,
        of: step.partOf,
        words: step.text != null && step.kind != 'verse' ? wordCount(step.text!) : null,
        misses: o.misses,
        missed: o.missedAt != null && o.missedAt!.isNotEmpty ? o.missedAt!.take(60).toList() : null,
      ),
    );
    setState(() {
      if (!o.ok && !_retried.contains(key)) {
        _retried.add(key);
        _queue = [..._queue, step];
      }
      _feedback = o;
    });
  }

  void _advance() {
    _activeMs += DateTime.now().difference(_stepStart).inMilliseconds.clamp(0, 120000);
    _stepStart = DateTime.now();
    final n = _pos + 1;
    if (n < _queue.length) {
      setState(() {
        _feedback = null;
        _pos = n;
      });
      return;
    }
    _finish();
  }

  /// Saves the lesson: the answers into the person's progress, the stones they have now earned, and Today's record.
  void _finish() {
    final now = ref.read(clockProvider)();
    final session = _session;
    final recorded = _results.values.toList();
    final mine = memberProgress(ref.read(progressProvider), session.memberId);
    final next = finishSession(
      mine,
      results: recorded,
      learned: session.units,
      courseId: session.courseId,
      checkpoint: session.kind == 'checkpoint' ? session.group?.key : null,
      now: now,
      grading: 'v2',
      keepRules: (tz: null),
    );
    final settled = settle(next, allItems(), widget.track, now);
    final marked = session.rise
        ? markRisen(settled.progress)
        : session.night
            ? markNight(settled.progress, {for (final s in session.steps) s.itemId}.toList(), now)
            : settled.progress;
    final secs = (_activeMs / 1000).round().clamp(1, 1 << 30);
    // Today's record: what kind of session this was, so Today ticks off its card and adds up the minutes.
    final kind = session.rise
        ? 'rise'
        : session.night
            ? 'night'
            : session.mode == 'extra' || session.mode == 'item' || (session.mode == 'keep' && session.cardId == null)
                ? 'extra'
                : session.kind == 'review'
                    ? 'review'
                    : 'lesson';
    final saved = marked.copyWith(
      today: withSession(
        marked.today,
        localDay(now),
        DaySession(newId(), iso(now), secs, session.dayCourse, kind, session.cardId),
      ),
    );
    ref.read(progressProvider.notifier).update((all) => {...all, session.memberId: saved});
    final recall = recorded.where((r) => r.kind != 'intro').toList();
    setState(() {
      _feedback = null;
      _finished = _Finished(
        right: recall.where((r) => r.correct).length,
        total: recall.length,
        minutes: (_activeMs / 60000).round().clamp(1, 1 << 30),
        ups: settled.ups,
        awards: settled.awards,
        kept: daysKept(settled.progress.days, localDay(now)),
      );
    });
  }

  /// Say steps become typing; a typing step that would then repeat the same words right after is dropped.
  void _cantSpeak() {
    setState(() {
      final mapped = [for (final (i, s) in _queue.indexed) i >= _pos ? lesson.withoutSpeaking(s) : s];
      _queue = [
        for (final (i, s) in mapped.indexed)
          if (!(i > _pos && i > 0 && s.kind == 'type' && mapped[i - 1].kind == 'type' && mapped[i - 1].itemId == s.itemId && mapped[i - 1].text == s.text)) s,
      ];
    });
  }

  void _exit() => context.canPop() ? context.pop() : context.go('/today');

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final pad = MediaQuery.paddingOf(context);
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;

    if (_queue.isEmpty) {
      return KPage(bare: true, pushDown: true, children: [
        const SizedBox(height: 40),
        KCard.column(gap: 16, children: [
          Text.rich(TextSpan(children: [
            TextSpan(text: 'Nothing to review yet.', style: serif(26, weight: FontWeight.w600, color: k.ink, height: 1.25)),
            TextSpan(text: ' Finish a lesson first, and it will come back here.', style: serif(26, color: k.muted, height: 1.25)),
          ])),
          KButton('Back to Today', onPressed: _exit),
        ]),
      ]);
    }
    if (_finished != null) return _Done(session: _session, finished: _finished!, onExit: _exit, track: widget.track);

    final step = _queue[_pos];
    final item = getItem(step.itemId)!;
    final feedback = _feedback;
    final retry = _retried.contains(_key(step)) && _queue.indexOf(step) != _pos;
    final heading = feedback == null
        ? ''
        : feedback.ok
            ? (feedback.slip ? 'Good.' : _praise[_pos % _praise.length])
            : feedback.close
                ? 'Almost.'
                : 'Not quite.';

    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              KSize.pageSide + pad.left,
              KSize.pageTop + pad.top,
              KSize.pageSide + pad.right,
              feedback != null ? 300 : KSize.pageTop + (keyboard > pad.bottom ? keyboard : pad.bottom),
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: KSize.pageMaxWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Semantics(
                          button: true,
                          label: 'End lesson',
                          child: Material(
                            color: k.card,
                            shape: const CircleBorder(),
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: _exit,
                              child: SizedBox(
                                width: 44,
                                height: 44,
                                child: Center(child: KIcon('<path d="M6 6l12 12M18 6L6 18"/>', size: 18, color: k.ink, strokeWidth: 2.2)),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Semantics(
                            label: 'Lesson progress',
                            value: '$_pos of ${_queue.length}',
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(5),
                              child: Container(
                                height: 10,
                                color: k.card,
                                alignment: Alignment.centerLeft,
                                child: FractionallySizedBox(
                                  widthFactor: _pos / _queue.length,
                                  child: Container(decoration: BoxDecoration(color: k.ink, borderRadius: BorderRadius.circular(5))),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    Padding(padding: const EdgeInsets.fromLTRB(4, 10, 4, 0), child: KLabel(_session.label)),
                    if (_session.kind == 'checkpoint' && _pos == 0 && feedback == null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(4, 10, 4, 0),
                        child: Text.rich(
                          TextSpan(children: [
                            TextSpan(text: 'Lock it in.', style: sans(15, weight: FontWeight.w700, color: k.ink, height: 1.45)),
                            TextSpan(
                              text: ' Each of ${_session.group != null ? groupLabel(_session.group!) : 'these'}, from memory. This is meant to be hard.',
                            ),
                          ]),
                          style: sans(15, color: k.ink, height: 1.45),
                        ),
                      ),
                    const SizedBox(height: KSize.gap),
                    Expanded(
                      child: StepChrome(
                        locked: feedback != null,
                        header: _header(step, item, retry),
                        child: KeyedSubtree(key: ValueKey('${step.id}-$_pos'), child: _stepWidget(step, item)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (feedback != null)
            Positioned(
              left: 0,
              right: 0,
              // Above the keyboard if it is still up (nothing in the app resizes for it).
              bottom: keyboard,
              child: Container(
                padding: EdgeInsets.fromLTRB(KSize.pageSide + pad.left, 22, KSize.pageSide + pad.right, (keyboard > 0 ? 0 : pad.bottom) + 20),
                decoration: BoxDecoration(
                  color: feedback.ok ? k.goodWash : k.missWash,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                  boxShadow: const [BoxShadow(color: Color(0x1F14181C), blurRadius: 28, offset: Offset(0, -8))],
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: 480, maxHeight: MediaQuery.sizeOf(context).height * 0.6),
                    child: SingleChildScrollView(
                      child: Semantics(
                        liveRegion: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(heading, style: sans(20, weight: FontWeight.w700, color: feedback.ok ? k.good : k.miss)),
                            if (feedback.note != null) ...[
                              const SizedBox(height: 14),
                              Text(feedback.note!, style: sans(16, weight: FontWeight.w500, color: k.ink, height: 1.45)),
                            ],
                            if (feedback.reveal != null) ...[const SizedBox(height: 14), feedback.reveal!],
                            if (!feedback.ok && !retry && step.kind != 'quiz') ...[
                              const SizedBox(height: 14),
                              Text('You’ll get another try at the end.', style: sans(14, color: k.muted)),
                            ],
                            const SizedBox(height: 14),
                            KButton('Continue', onPressed: _advance),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ── What goes at the top of a step's card ──

  List<Widget> _header(lesson.Step step, Item item, bool retry) {
    final k = context.k;
    final units = _session.steps.where((s) => s.unit != null).map((s) => s.unit!);
    final u = units.where((x) => x.itemId == step.itemId).firstOrNull;
    final part = !step.review && u != null && u.of > 1 ? ' · Part ${u.part} of ${u.of}' : '';
    final title = '${itemLabel(item)}$part';
    // A lock-in says so on every question; elsewhere, practice on earlier questions is marked Review.
    final tag = _session.kind == 'checkpoint' ? 'Lock it in · ${(_pos + 1).clamp(1, _queue.length)} of ${_queue.length}' : step.review ? 'Review' : null;
    final second = retry ? ' · Second try' : '';
    final why = step.review ? _session.why[step.itemId] : null;

    Widget tagged(String text) => Row(
          children: [
            if (tag != null) ...[KTag(tag), const SizedBox(width: 8)],
            Flexible(child: KLabel(text)),
          ],
        );
    final whyLine = why == null ? null : Text(why, style: sans(13.5, color: k.muted));

    switch (step.kind) {
      case 'intro' || 'info' || 'verse':
        return const [];
      case 'quiz':
        return const [KLabel('Welcome')];
      case 'match' || 'meaning':
        return [tagged('${step.kind == 'meaning' ? title : 'Match'}$second'), ?whyLine];
      default:
        // A verse's prompt is its reference, already shown large below, so the label names the course instead.
        final label = isVerse(item) ? title.replaceFirst(item.prompt, getCollection(item.collection)?.title ?? '') : title;
        return [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              tagged('$label$second'),
              const SizedBox(height: 6),
              Text(item.prompt, style: serif(20, weight: FontWeight.w600, color: k.ink, height: 1.35)),
            ],
          ),
          ?whyLine,
          if (step.lead != null) ContextBefore(contextBefore(item, widget.track, step.lead!)),
        ];
    }
  }

  Widget _stepWidget(lesson.Step step, Item item) => switch (step.kind) {
        'intro' => IntroStep(item: item, track: widget.track, step: step, onNext: _advance),
        'info' => InfoStep(step: step, onNext: _advance),
        'verse' => VerseStep(step: step, onNext: _advance),
        'quiz' || 'meaning' => MeaningStep(step: step, onReport: _report),
        'next' => NextStep(step: step, onReport: _report),
        'match' => MatchStep(step: step, onReport: _report),
        'spot' => SpotStep(step: step, onReport: _report),
        'order' => OrderStep(step: step, onReport: _report),
        'blanks' => BlanksStep(step: step, onReport: _report),
        'letters' => LettersStep(step: step, onReport: _report),
        'type' => TypeStep(step: step, onReport: _report),
        'say' => SayStep(step: step, onReport: _report, onCantSpeak: _cantSpeak),
        _ => KCard(child: Text('Unknown step: ${step.kind}')),
      };
}

/// The lesson is done and saved (lesson.tsx Done, without the window or the share).
class _Done extends ConsumerWidget {
  const _Done({required this.session, required this.finished, required this.onExit, required this.track});
  final Session session;
  final _Finished finished;
  final VoidCallback onExit;
  final Track track;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final mine = ref.watch(myProgressProvider);
    final now = ref.read(clockProvider)();
    final course = courseFor(session.courseId);
    final items = course == null ? const <Item>[] : courseItems(course);
    final upNext = course == null ? null : planner.planNext(courseId: course.id, items: items, track: track, p: mine, now: now);
    final first = session.units.isEmpty ? null : session.units.first;
    final partial = first != null && first.part < first.of;
    final kind = session.label == 'Welcome' ? 'Welcome lesson complete' : '${session.label} complete';
    final top = finished.ups.isEmpty ? null : finished.ups.first;
    final topItem = top == null ? null : getItem(top.itemId);
    final topLevel = top == null ? null : levelInfo(top.to);
    final message = session.kind == 'checkpoint'
        ? 'From here they come back on a spaced schedule: soon for any you found hard, then further apart each time you remember them.'
        : session.kind == 'review'
            ? 'Each review waits until you’re close to forgetting, which is when recalling it helps most.'
            : partial
                ? 'Part ${first.part} of ${first.of} learned. The next lesson continues it.'
                : '';
    // Started from the course (not Today's cards): offer the next one straight away.
    final cta = session.cardId != null || session.courseId.isEmpty || upNext == null ? null : upNext.kind == 'checkpoint' ? 'Lock them in now' : 'Next lesson';

    // The window: as it was, then the new light arriving (a lesson that lit nothing still shows the window).
    final before = session.before;
    final dayCourse = courseFor(session.dayCourse);
    Widget? window;
    if (before != null && dayCourse != null) {
      final all = courseItems(dayCourse);
      final after = windowLight(all, track, mine, now);
      final fresh = [for (final (i, it) in all.indexed) if (after.lit[i] > (i < before.lit.length ? before.lit[i] : 0) + 1e-6) it];
      final part = fresh.isNotEmpty ? partOf(dayCourse, fresh.first.id) : partWindow(dayCourse, track, mine, now).index;
      final at = {for (final (i, it) in all.indexed) it.id: i};
      final partItems = courseParts(dayCourse)[part].items;
      List<T> pick<T>(List<T> v, T zero) => [for (final it in partItems) (at[it.id] ?? 0) < v.length ? v[at[it.id] ?? 0] : zero];
      final names = fresh.map(itemLabel).join(', ');
      window = RoseCard(
        padding: const EdgeInsets.fromLTRB(18, 20, 18, 20),
        children: [
          RevealWindow(
            base: windowBase(dayCourse.id, part),
            before: pick(before.lit, 0.0),
            after: pick(after.lit, 0.0),
            dustyBefore: pick(before.dusty, false),
            dustyAfter: pick(after.dusty, false),
            label: names.isEmpty ? 'Your window' : 'Your window: new light for $names',
          ),
          if (names.isNotEmpty) Text('New light: $names', textAlign: TextAlign.center, style: serif(19, color: const Color(0xFFF4EFE6))),
        ],
      );
    }

    return KPage(
      bare: true,
      pushDown: true,
      children: [
        window ?? const SizedBox(height: 40),
        KCard.column(
          gap: 14,
          children: [
            Semantics(header: true, child: Text(kind, style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.2))),
            if (finished.total > 0) Text('${finished.right} of ${finished.total} right the first time.', style: sans(18, color: k.ink, height: 1.5)),
            Text(
              '${finished.minutes} ${finished.minutes == 1 ? 'minute' : 'minutes'}'
              '${finished.kept > 0 ? ' · ${finished.kept} ${finished.kept == 1 ? 'day' : 'days'} kept' : ''}',
              style: sans(15, color: k.muted),
            ),
            if (topItem != null && topLevel != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${itemLabel(topItem)} · ${topLevel.name}', style: sans(16, weight: FontWeight.w600, color: k.ink)),
                    const SizedBox(height: 2),
                    Text(topLevel.means, style: sans(14, color: k.muted, height: 1.45)),
                  ],
                ),
              ),
            if (message.isNotEmpty) Text(message, style: sans(15, color: k.muted, height: 1.5)),
            if (cta != null) KButton(cta, onPressed: () => context.pushReplacement('/lesson')),
            KButton('Back to Today', quiet: cta != null, onPressed: onExit),
          ],
        ),
      ],
    );
  }
}
