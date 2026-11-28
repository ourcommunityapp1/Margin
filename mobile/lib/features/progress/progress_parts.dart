// The pieces of the new Progress screen (src/app/heir/progress/page.tsx RingChip, Gauge, StepChart; heir.css .hr-pg-*):
// the row of rings, the hero (an arc over the number, on the blurred glass of your first course), the stepped "Growing"
// chart, and the folds that open on a tap.

import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:material_ui/material_ui.dart';

import '../../engine/measures.dart' show milestoneList;
import '../../state/memory_history.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

const _cream = Color(0xFFF4EFE6);
const _grey = Color(0xFFC9C1B3);
const _peach = Color(0xFFF3D8B6);
const _shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String fmtWords(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');

/// A small ring with a number inside and a label under it (58 px, 3 px stroke, from 12 o'clock clockwise).
class RingChip extends StatelessWidget {
  const RingChip({super.key, required this.frac, required this.value, required this.label, required this.color});
  final double frac;
  final String value, label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: Column(
        children: [
          SizedBox(
            width: 58,
            height: 58,
            child: CustomPaint(
              painter: _RingPainter(frac.clamp(0.0, 1.0), color),
              child: Center(child: Text(value, style: sans(14.5, weight: FontWeight.w600, color: k.ink, height: 1))),
            ),
          ),
          const SizedBox(height: 5),
          Text(label, textAlign: TextAlign.center, style: sans(12, color: k.muted)),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.frac, this.color);
  final double frac;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCircle(center: size.center(Offset.zero), radius: 26 * size.width / 58);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawArc(rect, 0, math.pi * 2, false, p..color = const Color(0x1FFFFFFF));
    if (frac > 0) canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * frac, false, p..color = color..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.frac != frac || old.color != color;
}

/// The hero: the blurred glass of your first course behind an arc from the last milestone to the next, the number, the
/// kicker, one serif sentence, one grey line and, when there is something to do, a quiet pill.
class ProgressHero extends StatelessWidget {
  const ProgressHero({super.key, required this.wash, required this.frac, this.left, this.right, required this.number, this.say = '', this.line = '', this.button, this.onButton});
  final String? wash; // window folder of the first started course
  final double frac;
  final String? left, right;
  final String number, say, line;
  final String? button;
  final VoidCallback? onButton;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Words in your memory',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0x14FFFFFF)),
            color: const Color(0xFF11161C),
          ),
          child: Stack(
            children: [
              if (wash != null)
                Positioned.fill(
                  child: ExcludeSemantics(
                    child: Transform.scale(
                      scale: 1.15,
                      alignment: const Alignment(0, -0.6),
                      child: ImageFiltered(
                        imageFilter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                        child: ColorFiltered(
                          // saturate(1.2) then brightness(0.5)
                          colorFilter: ColorFilter.matrix(_saturateDim(1.2, 0.5)),
                          child: Image.asset('assets/glass_full/$wash/glass.webp', fit: BoxFit.cover, alignment: const Alignment(0, -0.6)),
                        ),
                      ),
                    ),
                  ),
                ),
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x0D11161C), Color(0x8C11161C), Color(0xE611161C)],
                      stops: [0, 0.7, 1],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                child: Column(
                  children: [
                    AspectRatio(aspectRatio: 320 / 100, child: CustomPaint(painter: _GaugePainter(frac.clamp(0.0, 1.0), left, right))),
                    Text(number, style: serif(62, weight: FontWeight.w500, color: _cream, height: 1).copyWith(letterSpacing: -1.24)),
                    const SizedBox(height: 4),
                    Text('WORDS IN YOUR MEMORY', style: sans(11, weight: FontWeight.w700, color: _cream).copyWith(letterSpacing: 1.54)),
                    if (say.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(say, textAlign: TextAlign.center, style: serif(24, weight: FontWeight.w500, color: _cream, height: 1.15)),
                    ],
                    if (line.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 260),
                        child: Text(line, textAlign: TextAlign.center, style: sans(14, color: _cream.withValues(alpha: 0.85), height: 1.4)),
                      ),
                    ],
                    if (button != null && onButton != null) ...[
                      const SizedBox(height: 12),
                      Semantics(
                        button: true,
                        child: Material(
                          color: const Color(0x24FFFFFF),
                          shape: const StadiumBorder(side: BorderSide(color: Color(0x2EFFFFFF))),
                          child: InkWell(
                            customBorder: const StadiumBorder(),
                            onTap: onButton,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 11),
                              child: Text(button!, style: sans(14, weight: FontWeight.w600, color: _cream)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// A colour matrix for CSS `saturate(s) brightness(b)`.
  static List<double> _saturateDim(double s, double b) {
    const lr = 0.2126, lg = 0.7152, lb = 0.0722;
    final sr = (1 - s) * lr, sg = (1 - s) * lg, sb = (1 - s) * lb;
    return [
      (sr + s) * b, sg * b, sb * b, 0, 0,
      sr * b, (sg + s) * b, sb * b, 0, 0,
      sr * b, sg * b, (sb + s) * b, 0, 0,
      0, 0, 0, 1, 0,
    ];
  }
}

/// The arc (viewBox 320 × 100): centre (160, 184), radius 170, from -50° to +50° from 12 o'clock; the lit part from the left
/// end to [frac]; three faint dots just outside it; the milestone numbers under the ends.
class _GaugePainter extends CustomPainter {
  _GaugePainter(this.frac, this.left, this.right);
  final double frac;
  final String? left, right;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 320);
    const cx = 160.0, cy = 184.0, r = 170.0, a0 = -50.0, a1 = 50.0;
    Offset pt(double rad, double deg) => Offset(cx + rad * math.sin(deg * math.pi / 180), cy - rad * math.cos(deg * math.pi / 180));
    final rect = Rect.fromCircle(center: const Offset(cx, cy), radius: r);
    double flutterAngle(double deg) => (deg - 90) * math.pi / 180;
    canvas.drawArc(rect, flutterAngle(a0), (a1 - a0) * math.pi / 180, false, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = const Color(0x66FFFFFF));
    if (frac > 0) {
      canvas.drawArc(rect, flutterAngle(a0), (a1 - a0) * frac * math.pi / 180, false, Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round
        ..color = const Color(0xFFF8EBD8));
    }
    for (final d in [0.25, 0.5, 0.75]) {
      canvas.drawCircle(pt(r + 14, a0 + (a1 - a0) * d), 2.2, Paint()..color = const Color(0xB3FFFFFF));
    }
    void label(String? s, Offset at) {
      if (s == null) return;
      final tp = TextPainter(text: TextSpan(text: s, style: sans(11, color: _cream.withValues(alpha: 0.8))), textDirection: TextDirection.ltr)..layout();
      tp.paint(canvas, Offset(at.dx - tp.width / 2, at.dy - tp.height + 3));
    }

    final l = pt(r, a0), rr = pt(r, a1);
    label(left, Offset(l.dx - 6, l.dy + 16));
    label(right, Offset(rr.dx + 6, rr.dy + 16));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_GaugePainter old) => old.frac != frac || old.left != left || old.right != right;
}

/// How the words have grown, week by week: a stepped climb ending at today's number, with up to three milestones as faint
/// dashed lines, today's number by the last point, and pills for the first month and "Now" (viewBox 320 × 170).
class StepChart extends StatelessWidget {
  const StepChart({super.key, required this.pts});
  final List<WordsPoint> pts;

  @override
  Widget build(BuildContext context) => Semantics(
        image: true,
        label: 'Words in your memory over time, now ${fmtWords(pts.last.words)}',
        child: AspectRatio(aspectRatio: 320 / 170, child: CustomPaint(painter: _StepPainter(pts, context.k.card))),
      );
}

class _StepPainter extends CustomPainter {
  _StepPainter(this.pts, this.card);
  final List<WordsPoint> pts;
  final Color card;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 320);
    const w = 320.0, h = 170.0, L = 6.0, R = 46.0, T = 16.0, B = 30.0;
    final last = pts.last.words;
    final cand = [for (final m in milestoneList) if (m <= last * 1.15 && m >= last / 8) m];
    final top = math.max(math.max(last, cand.isEmpty ? 0 : cand.last), 10) * 1.1;
    double x(int i) => L + (w - L - R) * i / (pts.length - 1);
    double y(num v) => T + (h - T - B) * (1 - v / top);
    // Milestone lines from the top down, skipping any that would crowd the one above.
    final lines = <int>[];
    for (final m in cand.reversed) {
      if (lines.length < 3 && (lines.isEmpty || y(m) - y(lines.last) >= 22)) lines.add(m);
    }
    void text(String s, Offset at, {bool strong = false, TextAlign align = TextAlign.left}) {
      final tp = TextPainter(
        text: TextSpan(text: s, style: sans(11, weight: strong ? FontWeight.w600 : FontWeight.w400, color: strong ? _cream : _grey)),
        textDirection: TextDirection.ltr,
      )..layout();
      final dx = align == TextAlign.right ? at.dx - tp.width : align == TextAlign.center ? at.dx - tp.width / 2 : at.dx;
      tp.paint(canvas, Offset(dx, at.dy - tp.height + 3));
    }

    final dash = Paint()
      ..color = const Color(0x24FFFFFF)
      ..strokeWidth = 1;
    for (final m in lines) {
      for (var dx = L; dx < w - R; dx += 7) {
        canvas.drawLine(Offset(dx, y(m)), Offset(math.min(dx + 3, w - R), y(m)), dash);
      }
      text(fmtWords(m), Offset(w - R + 6, y(m) + 4));
    }
    // The steps: across, then up.
    final line = Path()..moveTo(x(0), y(pts.first.words));
    for (var i = 1; i < pts.length; i++) {
      line
        ..lineTo(x(i), y(pts[i - 1].words))
        ..lineTo(x(i), y(pts[i].words));
    }
    final fill = Path.from(line)
      ..lineTo(x(pts.length - 1), y(0))
      ..lineTo(x(0), y(0))
      ..close();
    canvas.drawPath(
      fill,
      Paint()
        ..shader = ui.Gradient.linear(Offset(0, T), Offset(0, y(0)), [_peach.withValues(alpha: 0.6), _peach.withValues(alpha: 0.04)]),
    );
    canvas.drawPath(line, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = _peach);
    final lx = x(pts.length - 1), ly = y(last);
    canvas.drawCircle(Offset(lx, ly), 4.5, Paint()..color = _peach);
    canvas.drawCircle(Offset(lx, ly), 4.5, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = card);
    text(fmtWords(last), Offset(lx - 8, ly - 10), strong: true, align: TextAlign.right);
    final firstAt = DateTime.fromMillisecondsSinceEpoch((pts.firstWhere((q) => q.words > 0, orElse: () => pts.first)).at);
    final pill = Paint()..color = const Color(0x1AFFFFFF);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(L, h - 22, 38, 20), const Radius.circular(10)), pill);
    text(_shortMonths[firstAt.month - 1], const Offset(L + 19, h - 8), strong: true, align: TextAlign.center);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(w - R - 44, h - 22, 44, 20), const Radius.circular(10)), pill);
    text('Now', const Offset(w - R - 22, h - 8), strong: true, align: TextAlign.center);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_StepPainter old) => old.pts != pts || old.card != card;
}

/// A card whose body opens on a tap (the website's `<details className="hr-card hr-pg-how">`): closed by default.
class Fold extends StatefulWidget {
  const Fold({super.key, required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  State<Fold> createState() => _FoldState();
}

class _FoldState extends State<Fold> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return KCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: _open,
            child: InkWell(
              onTap: () => setState(() => _open = !_open),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text.rich(
                  TextSpan(children: [
                    TextSpan(text: widget.title),
                    TextSpan(text: _open ? '  ˅' : '  ›', style: TextStyle(color: k.muted)),
                  ]),
                  style: sans(14, weight: FontWeight.w600, color: k.ink),
                ),
              ),
            ),
          ),
          if (_open) ...[const SizedBox(height: 10), ...widget.children],
        ],
      ),
    );
  }
}
