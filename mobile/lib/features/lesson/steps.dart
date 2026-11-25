// The exercises (src/app/heir/ui/steps.tsx). Each one reports an [Outcome] once; the lesson shows the feedback and
// moves on. Typing steps keep their words near the top of the card, so the keyboard never hides them.
//
// Say-aloud uses the "check yourself" mode only: real speech recognition is a later phase (ADR-0008), and the
// website falls back to the same mode where a browser can't listen.

import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/grade.dart';
import '../../engine/lesson.dart' as lesson;
import '../../engine/types.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'outcome.dart';
import 'step_frame.dart';

// ───────────────────────────── Intro, info, verse ─────────────────────────────

/// A new part, shown in full before it is practised (steps.tsx Intro).
class IntroStep extends StatelessWidget {
  const IntroStep({super.key, required this.item, required this.track, required this.step, required this.onNext});
  final Item item;
  final Track track;
  final lesson.Step step;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final u = step.unit!;
    final c = item.chunks[track]!;
    final before = c.sublist(0, u.start).join(' ');
    final text = lesson.unitText(item, track, u).text;
    final after = c.sublist(u.end).join(' ');
    final verse = isVerse(item);
    final badge = u.part > 1 ? 'Next part' : verse ? 'New ${itemNoun(item, 1)}' : 'New question';
    final source = verse ? getCollection(item.collection)?.title : itemLabel(item);
    return StepFrame(
      body: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: k.ink, borderRadius: BorderRadius.circular(10)),
                  child: Text(badge, style: sans(13, weight: FontWeight.w700, color: k.card)),
                ),
                KLabel('${source ?? ''}${u.of > 1 ? ' · Part ${u.part} of ${u.of}' : ''}'),
              ],
            ),
            const SizedBox(height: 6),
            Text(item.prompt, style: serif(24, weight: FontWeight.w600, color: k.ink, height: 1.3)),
          ],
        ),
        Text.rich(
          TextSpan(children: [
            if (before.isNotEmpty) TextSpan(text: '$before ', style: TextStyle(color: k.muted.withValues(alpha: 0.6))),
            TextSpan(text: text),
            if (after.isNotEmpty) TextSpan(text: ' $after', style: TextStyle(color: k.muted.withValues(alpha: 0.6))),
          ]),
          style: serif(22, color: k.ink, height: 1.45),
        ),
        Text(
          '${u.of > 1 ? 'This lesson covers the darker words. ' : ''}Read it aloud once, slowly.',
          style: sans(15, color: k.muted),
        ),
      ],
      dock: KButton('Continue', onPressed: onNext),
    );
  }
}

/// A welcome card: a title and a paragraph.
class InfoStep extends StatelessWidget {
  const InfoStep({super.key, required this.step, required this.onNext});
  final lesson.Step step;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return StepFrame(
      body: [
        const KLabel('Welcome'),
        Semantics(header: true, child: Text(step.title ?? '', style: serif(26, weight: FontWeight.w600, color: k.ink, height: 1.2))),
        Text(step.body ?? '', style: sans(18, color: k.ink, height: 1.55)),
      ],
      dock: KButton('Continue', onPressed: onNext),
    );
  }
}

/// The verse in the Bible text that ships with the app, with where it is from. (The website fetches the NASB from its
/// server; until the app does too, the bundled KJV shows.)
class VerseStep extends StatelessWidget {
  const VerseStep({super.key, required this.step, required this.onNext});
  final lesson.Step step;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final text = verses[step.itemId]?.text ?? step.text ?? '';
    return StepFrame(
      body: [
        const SizedBox(height: 24),
        Text(text, style: serif(25, color: k.ink, height: 1.45)),
        Text('${step.ref ?? ''} (KJV)', style: sans(15, weight: FontWeight.w600, color: k.muted)),
      ],
      dock: KButton('Continue', onPressed: onNext),
    );
  }
}

// ───────────────────────────── Choices ─────────────────────────────

/// Answer options. Picking one answers at once, then shows which was right: green with a tick for the right
/// answer, red with a cross for a wrong pick. Before that nothing is coloured, so a pick never looks like a
/// mistake (steps.tsx Choices).
class Choices extends StatefulWidget {
  const Choices({super.key, required this.options, required this.answer, required this.onPick, this.useSerif = false});
  final List<String> options;
  final String answer;
  final ValueChanged<String> onPick;
  final bool useSerif;

  @override
  State<Choices> createState() => _ChoicesState();
}

class _ChoicesState extends State<Choices> {
  String? _chosen;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, o) in widget.options.indexed) ...[
          if (i > 0) const SizedBox(height: 10),
          _choice(k, o),
        ],
      ],
    );
  }

  Widget _choice(KColors k, String o) {
    final chosen = _chosen;
    final state = chosen == null ? null : o == widget.answer ? 'right' : o == chosen ? 'wrong' : 'other';
    final bg = state == 'right' ? k.goodWash : state == 'wrong' ? k.missWash : k.card;
    final border = state == 'right' ? k.good : state == 'wrong' ? k.miss : k.card;
    return Opacity(
      opacity: state == 'other' ? 0.45 : 1,
      child: Semantics(
        button: true,
        enabled: chosen == null,
        child: Material(
          color: bg,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: border, width: 1.5)),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: chosen != null
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    setState(() => _chosen = o);
                    widget.onPick(o);
                  },
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        o,
                        style: widget.useSerif ? serif(18, weight: FontWeight.w500, color: k.ink) : sans(17, weight: FontWeight.w500, color: k.ink),
                      ),
                    ),
                    if (state == 'right') Text('✓', semanticsLabel: 'Right', style: sans(18, weight: FontWeight.w700, color: k.good)),
                    if (state == 'wrong') Text('✕', semanticsLabel: 'Not this one', style: sans(18, weight: FontWeight.w700, color: k.miss)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// What a word means: pick the answer (steps.tsx Meaning; also the welcome quiz).
class MeaningStep extends StatelessWidget {
  const MeaningStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  Widget build(BuildContext context) {
    final q = step.question!;
    return StepFrame(
      body: [
        Text(q.question, style: serif(22, weight: FontWeight.w600, color: context.k.ink, height: 1.35)),
        Choices(
          options: step.options!,
          answer: q.answer,
          onPick: (o) => onReport(Outcome(
            ok: o == q.answer,
            note: o == q.answer ? null : 'The answer: ${q.answer}.',
            reveal: Text(q.explain, style: sans(16, color: context.k.ink, height: 1.5)),
          )),
        ),
      ],
    );
  }
}

/// What comes next in the passage.
class NextStep extends StatelessWidget {
  const NextStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return StepFrame(
      body: [
        Text('What comes next?', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        Text.rich(
          TextSpan(children: [
            if ((step.lead ?? '').isNotEmpty) TextSpan(text: '${step.lead} ', style: serif(22, weight: FontWeight.w700, color: k.ink, height: 1.7)),
            WidgetSpan(
              alignment: PlaceholderAlignment.baseline,
              baseline: TextBaseline.alphabetic,
              child: Container(width: 66, height: 20, decoration: BoxDecoration(border: Border(bottom: BorderSide(color: k.ink, width: 2)))),
            ),
          ]),
          style: serif(22, color: k.ink, height: 1.7),
        ),
        Choices(
          useSerif: true,
          options: step.options!,
          answer: step.answer!,
          onPick: (o) => onReport(Outcome(ok: o == step.answer, reveal: Answer(lead: step.lead, text: step.answer!))),
        ),
      ],
    );
  }
}

/// Which verse or question is this?
class MatchStep extends StatelessWidget {
  const MatchStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final item = getItem(step.itemId);
    final verse = item != null && isVerse(item);
    return StepFrame(
      body: [
        KLabel(verse ? 'Which verse is this?' : 'Which question does this answer?'),
        Text(step.text ?? '', style: serif(22, color: k.ink, height: 1.45)),
        Choices(
          options: step.options!,
          answer: step.answer!,
          onPick: (o) => onReport(Outcome(
            ok: o == step.answer,
            note: o == step.answer ? null : verse ? 'It’s ${step.answer}.' : 'It answers: ${step.answer}',
          )),
        ),
      ],
    );
  }
}

// ───────────────────────────── Spot the wrong word ─────────────────────────────

class SpotStep extends StatefulWidget {
  const SpotStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  State<SpotStep> createState() => _SpotStepState();
}

class _SpotStepState extends State<SpotStep> {
  int? _tapped;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final step = widget.step;
    final tokens = step.text!.split(' ');
    final wrongAt = step.wrongIndex!;
    return StepFrame(
      body: [
        Text('One word is wrong. Tap it.', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        Wrap(
          children: [
            for (final (i, t) in tokens.indexed)
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: _word(k, i, t, wrongAt, tokens),
              ),
          ],
        ),
      ],
    );
  }

  Widget _word(KColors k, int i, String t, int wrongAt, List<String> tokens) {
    final step = widget.step;
    final tapped = _tapped;
    final state = tapped == null ? null : i == wrongAt ? 'right' : tapped == i ? 'wrong' : null;
    final bg = state == 'right' ? k.goodWash : state == 'wrong' ? k.missWash : tapped == i ? k.select : Colors.transparent;
    final outline = state == 'right' ? k.good : state == 'wrong' ? k.miss : null;
    return Semantics(
      button: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: tapped != null
            ? null
            : () {
                setState(() => _tapped = i);
                final wrong = splitToken(tokens[wrongAt]).core, right = splitToken(step.rightWord!).core;
                widget.onReport(Outcome(
                  ok: i == wrongAt,
                  note: '“$wrong” should be “$right”.',
                  reveal: Text.rich(
                    TextSpan(children: [
                      for (final (j, w) in step.correctText!.split(' ').indexed)
                        TextSpan(text: '$w ', style: j == wrongAt ? serif(19, weight: FontWeight.w700, color: k.ink, height: 1.45) : null),
                    ]),
                    style: serif(19, color: k.ink, height: 1.45),
                  ),
                ));
              },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 3),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(6),
            border: outline == null ? null : Border.all(color: outline, width: 1.5),
          ),
          child: Text(t, style: serif(22, color: k.ink, height: 1.4)),
        ),
      ),
    );
  }
}

// ───────────────────────────── Put it in order ─────────────────────────────

class OrderStep extends StatefulWidget {
  const OrderStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  State<OrderStep> createState() => _OrderStepState();
}

class _OrderStepState extends State<OrderStep> {
  final List<int> _picked = [];

  void _check() {
    final step = widget.step;
    final pieces = step.pieces ?? false;
    final r = checkOrder([for (final i in _picked) step.bank![i]], step.tiles!);
    final unit = pieces ? 'phrase' : 'word';
    final String? note = r.ok
        ? null
        : r.extra.isNotEmpty
            ? '${quoteList(r.extra)} ${plural(r.extra.length, 'isn’t', 'aren’t')} part of this answer.'
            : r.missing.isNotEmpty
                ? '${r.missing.length} ${plural(r.missing.length, '$unit is', '${unit}s are')} missing.'
                : '${r.outOfPlace} ${plural(r.outOfPlace, '$unit is', '${unit}s are')} out of order.';
    widget.onReport(Outcome(ok: r.ok, close: r.close, note: note, reveal: Answer(lead: step.lead, text: step.tiles!.join(' '))));
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final step = widget.step;
    final pieces = step.pieces ?? false;
    final showSlots = pieces || (step.slots ?? false);
    final lead = step.lead ?? '';

    Widget tile(String label, {bool placed = false, bool used = false, VoidCallback? onTap, String? semantics}) {
      final text = Text(label, style: pieces ? serif(18, weight: FontWeight.w500, color: used ? Colors.transparent : k.ink) : sans(17, weight: FontWeight.w500, color: used ? Colors.transparent : k.ink));
      final box = Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: used
            ? null
            : BoxDecoration(
                color: k.card,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: placed ? k.ink : k.line),
                boxShadow: placed ? null : [BoxShadow(color: k.line, offset: const Offset(0, 2))],
              ),
        child: text,
      );
      return Semantics(
        button: !used,
        label: semantics,
        excludeSemantics: semantics != null,
        child: used
            ? ExcludeSemantics(child: DashedBox(child: box))
            : GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: pieces ? SizedBox(width: double.infinity, child: box) : box),
      );
    }

    final placed = [
      for (final (at, i) in _picked.indexed)
        tile(step.bank![i], placed: true, semantics: '${step.bank![i]} (tap to take back)', onTap: () => setState(() => _picked.removeAt(at))),
    ];
    final slots = showSlots
        ? [
            for (final t in step.tiles!.skip(_picked.length))
              pieces
                  ? const DashedBox(height: 48)
                  : DashedBox(width: (math.max(3, t.length) + 2.2) * 9.5, height: 44),
          ]
        : const <Widget>[];

    final answerBox = Container(
      constraints: const BoxConstraints(minHeight: 112),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: k.line))),
      child: Semantics(
        label: 'Your answer',
        child: pieces
            ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                if (lead.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(lead, style: serif(18, weight: FontWeight.w700, color: k.ink))),
                for (final w in [...placed, ...slots]) Padding(padding: const EdgeInsets.only(bottom: 8), child: w),
              ])
            : Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (lead.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 8), child: Text(lead, style: serif(18, weight: FontWeight.w700, color: k.ink))),
                  ...placed,
                  ...slots,
                ],
              ),
      ),
    );

    final bank = pieces
        ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final (i, t) in step.bank!.indexed)
              Padding(padding: const EdgeInsets.only(bottom: 8), child: tile(t, used: _picked.contains(i), onTap: () => setState(() => _picked.add(i)))),
          ])
        : Semantics(
            label: 'Word bank',
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (i, t) in step.bank!.indexed) tile(t, used: _picked.contains(i), onTap: () => setState(() => _picked.add(i))),
              ],
            ),
          );

    return StepFrame(
      body: [
        Text(pieces ? 'Put the phrases in order' : 'Put the words in order', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        answerBox,
        bank,
      ],
      dock: KButton('Check', onPressed: _picked.isEmpty ? null : _check),
    );
  }
}

// ───────────────────────────── Fill in the blanks ─────────────────────────────

class BlanksStep extends StatefulWidget {
  const BlanksStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  State<BlanksStep> createState() => _BlanksStepState();
}

class _BlanksStepState extends State<BlanksStep> {
  late final List<String> _tokens = widget.step.text!.split(' ');
  late final Map<int, TextEditingController> _ctl = {for (final i in widget.step.blanks!) i: TextEditingController()};
  late final Map<int, FocusNode> _focus = {for (final i in widget.step.blanks!) i: FocusNode()};
  int _hints = 0;

  @override
  void dispose() {
    for (final c in _ctl.values) {
      c.dispose();
    }
    for (final f in _focus.values) {
      f.dispose();
    }
    super.dispose();
  }

  String _value(int i) => _ctl[i]!.text;
  String _core(int i) => splitToken(_tokens[i]).core;

  Widget _reveal(KColors k) => Text.rich(
        TextSpan(children: [
          if ((widget.step.lead ?? '').isNotEmpty) TextSpan(text: '${widget.step.lead} ', style: serif(19, weight: FontWeight.w700, color: k.ink, height: 1.45)),
          for (final (i, t) in _tokens.indexed) TextSpan(text: '$t ', style: widget.step.blanks!.contains(i) ? serif(19, weight: FontWeight.w700, color: k.ink, height: 1.45) : null),
        ]),
        style: serif(19, color: k.ink, height: 1.45),
      );

  void _check() {
    final k = context.k;
    final blanks = widget.step.blanks!;
    final right = blanks.where((i) => wordMatches(_value(i), _core(i))).toList();
    final near = blanks.where((i) => closeWord(_value(i), _core(i))).toList();
    final missed = blanks.where((i) => !right.contains(i) && !near.contains(i)).toList();
    if (missed.isEmpty) {
      widget.onReport(Outcome(
        ok: true,
        slip: near.isNotEmpty,
        hints: _hints,
        misses: 0,
        missedAt: const [],
        note: near.isNotEmpty ? 'Check the spelling: ${quoteList([for (final i in near) _tokens[i]])}.' : null,
        reveal: near.isNotEmpty ? _reveal(k) : null,
      ));
      return;
    }
    widget.onReport(Outcome(
      ok: false,
      hints: _hints,
      misses: missed.length,
      missedAt: missed,
      close: missed.length == 1 && blanks.length > 1,
      note: '${plural(missed.length, 'The missing word was', 'The missing words were')} ${quoteList([for (final i in missed) _tokens[i]])}.',
      reveal: _reveal(k),
    ));
  }

  void _hint() {
    setState(() {
      _hints++;
      for (final i in widget.step.blanks!) {
        final core = _core(i);
        if (core.isEmpty || wordMatches(_value(i), core)) continue;
        final n = math.min(core.length - 1, _value(i).length + 1);
        final text = core.substring(0, n <= 0 ? 1 : n);
        _ctl[i]!.value = TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final step = widget.step;
    final blanks = step.blanks!;
    final spans = <InlineSpan>[
      if ((step.lead ?? '').isNotEmpty) TextSpan(text: '${step.lead} ', style: serif(22, weight: FontWeight.w700, color: k.ink, height: 1.7)),
    ];
    for (final (i, t) in _tokens.indexed) {
      if (!blanks.contains(i)) {
        spans.add(TextSpan(text: '$t '));
        continue;
      }
      final (:before, :core, :after) = splitToken(t);
      final at = blanks.indexOf(i);
      final last = at == blanks.length - 1;
      spans
        ..add(TextSpan(text: before))
        ..add(WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: SizedBox(
            width: (math.max(3, core.length) + 1.5) * 12.5,
            child: Semantics(
              label: 'Missing word ${at + 1}',
              child: TextField(
                controller: _ctl[i],
                focusNode: _focus[i],
                autofocus: at == 0,
                autocorrect: false,
                enableSuggestions: false,
                textCapitalization: TextCapitalization.none,
                textInputAction: last ? TextInputAction.done : TextInputAction.next,
                onChanged: (_) => setState(() {}),
                onSubmitted: (_) {
                  if (!last) {
                    _focus[blanks[at + 1]]!.requestFocus();
                  } else if (blanks.every((b) => _value(b).trim().isNotEmpty)) {
                    _check();
                  }
                },
                style: serif(22, color: k.ink),
                cursorColor: k.ink,
                decoration: InputDecoration(
                  isDense: true,
                  filled: true,
                  fillColor: k.well,
                  counterText: '',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  border: UnderlineInputBorder(borderRadius: const BorderRadius.vertical(top: Radius.circular(6)), borderSide: BorderSide(color: k.ink, width: 2)),
                  enabledBorder: UnderlineInputBorder(borderRadius: const BorderRadius.vertical(top: Radius.circular(6)), borderSide: BorderSide(color: k.ink, width: 2)),
                  focusedBorder: UnderlineInputBorder(borderRadius: const BorderRadius.vertical(top: Radius.circular(6)), borderSide: BorderSide(color: k.ink, width: 2)),
                ),
              ),
            ),
          ),
        ))
        ..add(TextSpan(text: '$after '));
    }
    return StepFrame(
      body: [
        Text('Fill in the missing words', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        Text.rich(TextSpan(children: spans), style: serif(22, color: k.ink, height: 1.7)),
      ],
      dock: Dock(
        flexes: const [1, 2],
        children: [
          WellButton('Hint', onPressed: _hint),
          KButton('Check', onPressed: blanks.every((b) => _value(b).trim().isNotEmpty) ? _check : null),
        ],
      ),
    );
  }
}

// ───────────────────────────── First letters ─────────────────────────────

/// Type the first letter of each word. The keyboard target sits on top of the words (invisible), so the words stay
/// in view while typing.
class LettersStep extends StatefulWidget {
  const LettersStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  State<LettersStep> createState() => _LettersStepState();
}

class _LettersStepState extends State<LettersStep> with SingleTickerProviderStateMixin {
  late final List<String> _tokens = widget.step.text!.split(' ');
  final _input = TextEditingController();
  final _focus = FocusNode();
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
  int _shown = 0, _misses = 0, _hints = 0;
  final List<int> _slips = [];
  bool _reported = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _input.dispose();
    _focus.dispose();
    _shake.dispose();
    super.dispose();
  }

  void _finish(int m, int h) {
    if (_reported) return;
    _reported = true;
    final allowed = math.max(1, _tokens.length ~/ 10);
    final ok = m + h <= allowed;
    final slips = _slips.toSet().toList()..sort();
    widget.onReport(Outcome(
      ok: ok,
      slip: ok && m + h > 0,
      close: !ok && m + h <= allowed + 2,
      hints: h,
      misses: m,
      missedAt: slips,
      note: m > 0
          ? '$m wrong ${plural(m, 'letter', 'letters')}${h > 0 ? ', $h ${plural(h, 'word', 'words')} shown' : ''}.'
          : h > 0
              ? '$h ${plural(h, 'word', 'words')} shown.'
              : null,
      reveal: m > 0 || h > 0 ? Answer(lead: widget.step.lead, text: widget.step.text!) : null,
    ));
  }

  void _advance(int m, int h) {
    final n = _shown + 1;
    setState(() => _shown = n);
    if (n >= _tokens.length) {
      _focus.unfocus();
      _finish(m, h);
    }
  }

  void _press(String ch) {
    if (_shown >= _tokens.length) return;
    if (ch.toLowerCase() == firstLetter(_tokens[_shown])) {
      _advance(_misses, _hints);
    } else {
      _slips.add(_shown);
      setState(() => _misses++);
      HapticFeedback.mediumImpact();
      _shake.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final step = widget.step;
    final spans = <InlineSpan>[
      if ((step.lead ?? '').isNotEmpty) TextSpan(text: '${step.lead} ', style: serif(22, weight: FontWeight.w700, color: k.ink, height: 1.7)),
      for (final (i, t) in _tokens.indexed)
        if (i < _shown)
          TextSpan(text: '$t ')
        else ...[
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: Container(
              width: math.max(2, splitToken(t).core.length) * 0.55 * 22,
              height: 20,
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: i == _shown ? k.ink : k.muted.withValues(alpha: 0.55), width: 2)),
              ),
            ),
          ),
          const TextSpan(text: ' '),
        ],
    ];

    final passage = AnimatedBuilder(
      animation: _shake,
      builder: (_, child) => Transform.translate(offset: Offset(math.sin(_shake.value * math.pi * 4) * 6 * (1 - _shake.value), 0), child: child),
      child: Semantics(liveRegion: true, child: Text.rich(TextSpan(children: spans), style: serif(22, color: k.ink, height: 1.7))),
    );

    return StepFrame(
      body: [
        Text('Type the first letter of each word', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        GestureDetector(
          onTap: _focus.requestFocus,
          child: Stack(
            children: [
              passage,
              // The invisible keyboard target over the words.
              Positioned.fill(
                child: Opacity(
                  opacity: 0,
                  child: Semantics(
                    label: 'Type the first letter of the next word',
                    child: TextField(
                      controller: _input,
                      focusNode: _focus,
                      autofocus: true,
                      autocorrect: false,
                      enableSuggestions: false,
                      enableInteractiveSelection: false,
                      keyboardType: TextInputType.text,
                      maxLines: null,
                      expands: true,
                      textCapitalization: TextCapitalization.none,
                      onChanged: (v) {
                        final ch = v.isEmpty ? '' : v.characters.last;
                        _input.clear();
                        if (ch.trim().isNotEmpty) _press(ch);
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (!_focus.hasFocus && _shown < _tokens.length)
          Text('Tap the words to bring up the keyboard.', style: sans(15, color: k.muted)),
      ],
      dock: KButton(
        'Show the next word',
        quiet: true,
        onPressed: _shown >= _tokens.length
            ? null
            : () {
                _slips.add(_shown);
                setState(() => _hints++);
                _advance(_misses, _hints);
              },
      ),
    );
  }
}

// ───────────────────────────── Type or say it ─────────────────────────────

/// What was said or typed, scored against the words (steps.tsx `scored`).
Outcome scored(BuildContext context, String text, String lead, String said, double pass, String verb) {
  final k = context.k;
  final r = gradeSpoken(text, said);
  final tokens = text.split(' ');
  bool movedAt(int i) => i < r.moved.length && r.moved[i];
  bool heardAt(int i) => i < r.heard.length && r.heard[i];
  final moved = [for (final (i, t) in tokens.indexed) if (movedAt(i)) t];
  final missing = [for (var i = 0; i < tokens.length; i++) if (!heardAt(i) && !movedAt(i)) i].length;
  final notes = <String>[
    if (moved.length == 2)
      'You swapped ${quoteList(moved).replaceFirst(', ', ' and ')}.'
    else if (moved.isNotEmpty)
      '${quoteList(moved)} ${plural(moved.length, 'was', 'were')} in a different place.',
    if (missing > 0) '$missing ${plural(missing, 'word', 'words')} $verb${moved.isNotEmpty ? '' : '. They’re underlined'}.',
  ];
  final ok = r.score >= pass;
  return Outcome(
    ok: ok,
    misses: missing + moved.length,
    missedAt: [for (var i = 0; i < tokens.length; i++) if (!heardAt(i)) i],
    slip: ok && notes.isNotEmpty,
    close: !ok && r.score >= nearly,
    note: notes.isEmpty ? null : notes.join(' '),
    reveal: notes.isEmpty
        ? null
        : Text.rich(
            TextSpan(children: [
              if (lead.isNotEmpty) TextSpan(text: '$lead ', style: serif(19, weight: FontWeight.w700, color: k.ink, height: 1.45)),
              for (final (i, t) in tokens.indexed)
                TextSpan(
                  text: '$t ',
                  style: heardAt(i)
                      ? null
                      : movedAt(i)
                          ? TextStyle(color: k.miss, decoration: TextDecoration.underline, decorationStyle: TextDecorationStyle.wavy, decorationColor: k.miss)
                          : TextStyle(color: k.miss, decoration: TextDecoration.underline, decorationColor: k.miss, decorationThickness: 2),
                ),
            ]),
            style: serif(19, color: k.ink, height: 1.45),
          ),
  );
}

class _ContinueFrom extends StatelessWidget {
  const _ContinueFrom(this.lead);
  final String lead;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    if (lead.isEmpty) return const SizedBox.shrink();
    return Text.rich(TextSpan(children: [
      const TextSpan(text: 'Start after '),
      TextSpan(text: lead, style: serif(18, weight: FontWeight.w700, color: k.ink)),
    ]), style: sans(15, color: k.muted));
  }
}

/// Type the whole answer from memory.
class TypeStep extends StatefulWidget {
  const TypeStep({super.key, required this.step, required this.onReport});
  final lesson.Step step;
  final Report onReport;

  @override
  State<TypeStep> createState() => _TypeStepState();
}

class _TypeStepState extends State<TypeStep> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final step = widget.step;
    OutlineInputBorder border(Color c) => OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: c));
    return StepFrame(
      body: [
        Text('Type it from memory', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        _ContinueFrom(step.lead ?? ''),
        Semantics(
          label: 'Your answer',
          child: TextField(
            controller: _text,
            autofocus: true,
            minLines: 4,
            maxLines: null,
            autocorrect: false,
            enableSuggestions: false,
            textCapitalization: TextCapitalization.sentences,
            keyboardType: TextInputType.multiline,
            onChanged: (_) => setState(() {}),
            style: serif(18, color: k.ink, height: 1.5),
            cursorColor: k.ink,
            decoration: InputDecoration(
              filled: true,
              fillColor: k.card,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: border(k.line),
              enabledBorder: border(k.line),
              focusedBorder: border(k.ink),
            ),
          ),
        ),
      ],
      dock: KButton(
        'Check',
        onPressed: _text.text.trim().isEmpty ? null : () => widget.onReport(scored(context, step.text!, step.lead ?? '', _text.text, typedPass, 'missing or misspelled')),
      ),
    );
  }
}

/// Say the whole answer from memory. For now: say it aloud, then say how you did (the website's mode when it
/// can't listen). Real speech recognition comes with the native features.
class SayStep extends StatefulWidget {
  const SayStep({super.key, required this.step, required this.onReport, required this.onCantSpeak});
  final lesson.Step step;
  final Report onReport;
  final VoidCallback onCantSpeak;

  @override
  State<SayStep> createState() => _SayStepState();
}

class _SayStepState extends State<SayStep> {
  bool _revealed = false;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final step = widget.step;
    return StepFrame(
      body: [
        Text('Say it from memory', style: sans(16, weight: FontWeight.w600, color: k.ink)),
        _ContinueFrom(step.lead ?? ''),
        if (!_revealed)
          Text('Say it aloud without looking. Then check yourself.', style: sans(17, color: k.ink, height: 1.5))
        else
          Answer(lead: step.lead, text: step.text!),
        KButton('Can’t speak now, type it', quiet: true, onPressed: widget.onCantSpeak),
      ],
      dock: !_revealed
          ? KButton('Show the words', onPressed: () => setState(() => _revealed = true))
          : Dock(children: [
              WellButton('I missed some', onPressed: () => widget.onReport(const Outcome(ok: false))),
              KButton('I said it all', onPressed: () => widget.onReport(const Outcome(ok: true))),
            ]),
    );
  }
}
