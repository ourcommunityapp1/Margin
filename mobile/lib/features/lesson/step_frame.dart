// How a step is laid out (lesson.tsx, steps.tsx): a card that fills the screen, holding the step's content, with the
// step's buttons pinned in a bar beneath it (the website's "dock"), above the keyboard while typing.
// The lesson screen puts the tag, cue and earlier words at the top of every card through [StepChrome].

import 'package:material_ui/material_ui.dart';

import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'outcome.dart';

/// What the lesson screen shares with the step on screen.
class StepChrome extends InheritedWidget {
  const StepChrome({super.key, required this.header, required this.locked, required super.child});

  /// The label, cue and earlier words at the top of the card.
  final List<Widget> header;

  /// True while the feedback sheet is up: the card ignores taps and the dock is hidden.
  final bool locked;

  static StepChrome of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<StepChrome>() ?? const StepChrome(header: [], locked: false, child: SizedBox());

  @override
  bool updateShouldNotify(StepChrome old) => locked != old.locked || header != old.header;
}

/// The card and its dock.
class StepFrame extends StatelessWidget {
  const StepFrame({super.key, required this.body, this.dock});

  final List<Widget> body;

  /// The step's buttons, pinned under the card.
  final Widget? dock;

  @override
  Widget build(BuildContext context) {
    final chrome = StepChrome.of(context);
    final children = [...chrome.header, ...body];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: IgnorePointer(
            ignoring: chrome.locked,
            child: KCard(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 18), children[i]]],
                ),
              ),
            ),
          ),
        ),
        if (dock != null && !chrome.locked) ...[const SizedBox(height: 12), dock!],
      ],
    );
  }
}

/// A row of buttons in the dock: [flexes] sets their widths, as `flex: 1` and `flex: 2` do on the website.
class Dock extends StatelessWidget {
  const Dock({super.key, required this.children, this.flexes});
  final List<Widget> children;
  final List<int>? flexes;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          for (final (i, c) in children.indexed) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(flex: flexes?[i] ?? 1, child: c),
          ],
        ],
      );
}

/// A button in the quieter well colour (the website's Hint and "I missed some").
class WellButton extends StatelessWidget {
  const WellButton(this.label, {super.key, required this.onPressed});
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Opacity(
      opacity: onPressed == null ? 0.45 : 1,
      child: Material(
        color: k.well,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          onTap: onPressed,
          child: SizedBox(
            height: KSize.buttonHeight,
            child: Center(child: Text(label, style: sans(17, weight: FontWeight.w600, color: k.ink, height: 1))),
          ),
        ),
      ),
    );
  }
}

/// An outline made of dashes (`border: 1.5px dashed var(--line)`), for the empty places in an answer.
class DashedBox extends StatelessWidget {
  const DashedBox({super.key, this.radius = 14, this.child, this.width, this.height});
  final double radius;
  final Widget? child;
  final double? width, height;

  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: _DashedPainter(context.k.line, radius),
        child: SizedBox(width: width, height: height, child: child),
      );
}

class _DashedPainter extends CustomPainter {
  _DashedPainter(this.color, this.radius);
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)));
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 7) {
        canvas.drawPath(m.extractPath(d, (d + 4).clamp(0, m.length)), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedPainter old) => old.color != color || old.radius != radius;
}

/// The words that come before the part being practised, in bold (`.hr-lead`).
class Lead extends StatelessWidget {
  const Lead(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) =>
      text.isEmpty ? const SizedBox.shrink() : Text('$text ', style: serif(18, weight: FontWeight.w700, color: context.k.ink));
}

/// The right answer, with the lead-in before it (`<Answer>`).
class Answer extends StatelessWidget {
  const Answer({super.key, this.lead, required this.text});
  final String? lead;
  final String text;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Text.rich(TextSpan(children: [
      if (lead != null && lead!.isNotEmpty) TextSpan(text: '$lead ', style: serif(19, weight: FontWeight.w700, color: k.ink, height: 1.45)),
      TextSpan(text: text),
    ]), style: serif(19, color: k.ink, height: 1.45));
  }
}

/// Quiet earlier words in the passage (`<Context>`), fading at the top when long.
class ContextBefore extends StatelessWidget {
  const ContextBefore(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    final style = serif(16, color: context.k.muted, height: 1.45);
    final box = ConstrainedBox(
      constraints: const BoxConstraints(maxHeight: 16 * 1.45 * 4),
      child: ClipRect(child: Align(alignment: Alignment.bottomLeft, heightFactor: 1, child: Text(text, style: style, overflow: TextOverflow.fade))),
    );
    return Semantics(
      label: 'Earlier in the passage',
      child: text.length > 150
          ? ShaderMask(
              shaderCallback: (r) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x00FFFFFF), Color(0xFFFFFFFF)],
                stops: [0, 0.35],
              ).createShader(r),
              blendMode: BlendMode.dstIn,
              child: box,
            )
          : box,
    );
  }
}

/// Reports a step's outcome the first time only (a step reports once).
class OnceReport {
  OnceReport(this._report);
  final Report _report;
  bool _done = false;
  bool get done => _done;
  void call(Outcome o) {
    if (_done) return;
    _done = true;
    _report(o);
  }
}
