// Runs a list of steps one at a time (src/app/heir/ui/lesson.tsx LessonRunner): a progress bar, the step's card, a
// feedback sheet after each answer, and a second try at the end for anything missed.
//
// So far this is a practice run: the steps come from the engine's lesson builders, but nothing is saved, graded
// into the person's memory, or counted towards Today yet. That needs the household and progress storage
// (finishSession, settle, Today's record), which come next. The done screen says so.

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/lesson.dart' as lesson;
import '../../engine/types.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'outcome.dart';
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

class LessonScreen extends StatefulWidget {
  const LessonScreen({super.key, required this.steps, required this.track, this.label});

  final List<lesson.Step> steps;
  final Track track;

  /// A line under the progress bar ("Welcome", "Practice · Q1").
  final String? label;

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  late List<lesson.Step> _queue = [...widget.steps];
  int _pos = 0;
  Outcome? _feedback;
  bool _finished = false;
  final Set<String> _retried = {};

  /// Whether each step was right the first time it was answered.
  final Map<String, bool> _results = {};

  static String _key(lesson.Step s) => s.id.replaceAll(RegExp(r':typed$'), '');

  void _report(Outcome o) {
    final step = _queue[_pos];
    final key = _key(step);
    _results.putIfAbsent(key, () => o.ok);
    setState(() {
      if (!o.ok && !_retried.contains(key)) {
        _retried.add(key);
        _queue = [..._queue, step];
      }
      _feedback = o;
    });
  }

  void _advance() {
    setState(() {
      _feedback = null;
      if (_pos + 1 < _queue.length) {
        _pos++;
      } else {
        _finished = true;
      }
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

  void _again() => setState(() {
        _queue = [...widget.steps];
        _pos = 0;
        _feedback = null;
        _finished = false;
        _retried.clear();
        _results.clear();
      });

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final pad = MediaQuery.paddingOf(context);
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    if (_finished) return _Done(right: _results.values.where((r) => r).length, total: _results.length, onExit: _exit, onAgain: _again);

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
                    if (widget.label != null)
                      Padding(padding: const EdgeInsets.fromLTRB(4, 10, 4, 0), child: KLabel(widget.label!)),
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
              bottom: 0,
              child: Container(
                padding: EdgeInsets.fromLTRB(KSize.pageSide + pad.left, 22, KSize.pageSide + pad.right, pad.bottom + 20),
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
    final units = widget.steps.where((s) => s.unit != null).map((s) => s.unit!);
    final u = units.where((x) => x.itemId == step.itemId).firstOrNull;
    final part = !step.review && u != null && u.of > 1 ? ' · Part ${u.part} of ${u.of}' : '';
    final title = '${itemLabel(item)}$part';
    final tag = step.review ? 'Review' : null;
    final second = retry ? ' · Second try' : '';

    Widget tagged(String text) => Row(
          children: [
            if (tag != null) ...[KTag(tag), const SizedBox(width: 8)],
            Flexible(child: KLabel(text)),
          ],
        );

    switch (step.kind) {
      case 'intro' || 'info' || 'verse':
        return const [];
      case 'quiz':
        return const [KLabel('Welcome')];
      case 'match' || 'meaning':
        return [tagged('${step.kind == 'meaning' ? title : 'Match'}$second')];
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

class _Done extends StatelessWidget {
  const _Done({required this.right, required this.total, required this.onExit, required this.onAgain});
  final int right, total;
  final VoidCallback onExit, onAgain;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return KPage(
      bare: true,
      pushDown: true,
      children: [
        const SizedBox(height: 40),
        KCard.column(
          gap: 14,
          children: [
            Semantics(header: true, child: Text('Practice complete', style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.2))),
            if (total > 0) Text('$right of $total right the first time.', style: sans(18, color: k.ink, height: 1.5)),
            Text(
              'This was a practice run, so nothing was saved yet. Saving what you learn and planning Today’s cards come next.',
              style: sans(15, color: k.muted, height: 1.5),
            ),
            KButton('Done', onPressed: onExit),
            KButton('Try again', quiet: true, onPressed: onAgain),
          ],
        ),
      ],
    );
  }
}
