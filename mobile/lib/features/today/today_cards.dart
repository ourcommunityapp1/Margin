// Today's carousel of cards (src/app/heir/ui/today.tsx Carousel, heir.css .hr-rose-card .hr-slide .hr-glass-btn):
// one dark card per recommended lesson or review, a "Done for today" card, and a done card for each session that
// finished no card. The window is a plain placeholder until the stained glass exists (phase 3).

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/dayplan.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'window_placeholder.dart';

// The rose card's own colours: it is dark and warm whatever the page is.
const roseInk = Color(0xFFF4EFE6);
const roseMuted = Color(0xFFC9C1B3);
const roseGold = Color(0xFFF3D8B6);
const _roseBg = Color(0xFF15181B);

const arrowPath = '<path d="M5 12h14M13 6l6 6-6 6"/>';
const checkPath = '<path d="M5 12l5 5 9-10"/>';

/// One card in the carousel.
sealed class Slide {
  const Slide();
  String get id;
  bool get done => false;
}

class CardSlide extends Slide {
  const CardSlide({required this.state, required this.course, required this.href, required this.tag, required this.button});
  final CardState state;
  final Course course;
  final String href;
  final String tag, button;
  @override
  String get id => state.card.id;
  @override
  bool get done => state.done;
}

class ExtraSlide extends Slide {
  const ExtraSlide({required this.session, required this.course, required this.tag});
  final DaySession session;
  final Course course;
  final String tag;
  @override
  String get id => session.id;
  @override
  bool get done => true;
}

class DoneSlide extends Slide {
  const DoneSlide({required this.minutes, required this.course, required this.extra});
  final int minutes;
  final Course course;
  final bool extra;
  @override
  String get id => 'done';
}

/// The dark card (`.hr-rose-card`).
class RoseCard extends StatelessWidget {
  const RoseCard({super.key, required this.children, this.padding = const EdgeInsets.fromLTRB(18, 22, 18, 20), this.gap = 16, this.fill = false});
  final List<Widget> children;

  /// Fill the height it is given, spreading the pieces (a carousel card); otherwise hug them.
  final bool fill;
  final EdgeInsets padding;
  final double gap;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
          color: _roseBg,
          borderRadius: BorderRadius.circular(36),
          boxShadow: const [BoxShadow(color: Color(0x4D14181C), blurRadius: 50, offset: Offset(0, 24))],
        ),
        child: Padding(
          padding: padding,
          child: Column(
            mainAxisSize: fill ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: fill ? MainAxisAlignment.spaceBetween : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [for (var i = 0; i < children.length; i++) ...[if (i > 0 && !fill) SizedBox(height: gap), children[i]]],
          ),
        ),
      );
}

/// The call to action: a rounded square of frosted glass with a light square holding an arrow (`.hr-glass-btn`).
class GlassButton extends StatelessWidget {
  const GlassButton(this.label, {super.key, required this.onPressed, this.quiet = false, this.arrow = true});
  final String label;
  final VoidCallback onPressed;
  final bool quiet;
  final bool arrow;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onPressed,
          child: Ink(
            height: 62,
            padding: EdgeInsets.only(left: quiet ? 0 : 22, right: quiet ? 0 : 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: quiet
                  ? null
                  : const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0x2BFFFFFF), Color(0x0FFFFFFF)]),
              color: quiet ? const Color(0x0DFFFFFF) : null,
              border: Border.all(color: const Color(0x3DFFFFFF)),
              boxShadow: const [BoxShadow(color: Color(0x4D000000), blurRadius: 30, offset: Offset(0, 12))],
            ),
            child: Row(
              mainAxisAlignment: quiet && !arrow ? MainAxisAlignment.center : MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: sans(17, weight: FontWeight.w600, color: const Color(0xFFFFF8EE))),
                if (arrow)
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(color: const Color(0xEBFFF8EE), borderRadius: BorderRadius.circular(14)),
                    child: Center(child: KIcon(arrowPath, size: 18, color: _roseBg, strokeWidth: 2.2)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The small round tick (`.hr-day-tick`).
class DayTick extends StatelessWidget {
  const DayTick({super.key, this.size = 26});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(color: roseGold, shape: BoxShape.circle),
        child: Center(child: KIcon(checkPath, size: 15, color: const Color(0xFF15181B), strokeWidth: 3)),
      );
}

/// The day's cards, swiped sideways, with dots under them.
class TodayCarousel extends StatefulWidget {
  const TodayCarousel({super.key, required this.slides});
  final List<Slide> slides;

  @override
  State<TodayCarousel> createState() => _TodayCarouselState();
}

class _TodayCarouselState extends State<TodayCarousel> {
  PageController? _controller;
  double _width = 0;
  int _at = 0;
  String _first = '';

  @override
  void initState() {
    super.initState();
    _first = widget.slides.isEmpty ? '' : widget.slides.first.id;
  }

  @override
  void didUpdateWidget(TodayCarousel old) {
    super.didUpdateWidget(old);
    // When the front card changes (one was finished), go back to the front.
    final first = widget.slides.isEmpty ? '' : widget.slides.first.id;
    if (first != _first) {
      _first = first;
      _at = 0;
      if (_controller?.hasClients ?? false) _controller!.jumpToPage(0);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final slides = widget.slides;
    if (slides.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, c) {
        // Each card is the page's width; the next one shows 10 pixels at the edge, as on the website.
        if (_controller == null || _width != c.maxWidth) {
          _width = c.maxWidth;
          _controller?.dispose();
          _controller = PageController(viewportFraction: (c.maxWidth + 10) / c.maxWidth, initialPage: _at.clamp(0, slides.length - 1));
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 520,
              child: PageView(
                controller: _controller,
                clipBehavior: Clip.none,
                padEnds: false,
                onPageChanged: (i) => setState(() => _at = i),
                children: [for (final s in slides) Padding(padding: const EdgeInsets.only(right: 10), child: _SlideCard(slide: s))],
              ),
            ),
            if (slides.length > 1) ...[
              const SizedBox(height: 12),
              Semantics(
                container: true,
                label: 'Cards',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (final (i, s) in slides.indexed)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3.5),
                        child: GestureDetector(
                          onTap: () => _controller?.animateToPage(i, duration: const Duration(milliseconds: 250), curve: Curves.easeOut),
                          child: Semantics(
                            button: true,
                            label: 'Card ${i + 1} of ${slides.length}',
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: i == _at ? 20 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                color: i == _at ? roseInk : s.done ? const Color(0x8CF3D8B6) : const Color(0x4DF4EFE6),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _SlideCard extends StatelessWidget {
  const _SlideCard({required this.slide});
  final Slide slide;

  @override
  Widget build(BuildContext context) {
    final s = slide;
    return switch (s) {
      DoneSlide() => Semantics(
          label: 'Done for today',
          child: RoseCard(
            fill: true,
            children: [
              Semantics(header: true, child: Text('Done for today', style: serif(28, weight: FontWeight.w500, color: roseInk))),
              const WindowPlaceholder(),
              Text('${s.minutes} min', style: serif(32, color: roseInk, height: 1)),
              if (s.extra)
                TextButton(
                  onPressed: () => context.push('/lesson?mode=extra'),
                  child: Text(
                    'Extra practice',
                    style: sans(15, weight: FontWeight.w600, color: const Color(0xFFE4DDD0)).copyWith(decoration: TextDecoration.underline, decorationColor: const Color(0x73E4DDD0)),
                  ),
                ),
            ],
          ),
        ),
      CardSlide() => _CardBody(course: s.course, tag: s.state.done ? _doneWord(s.state.card.kind) : s.tag, fix: s.state.card.kind == 'fix' && !s.state.done, done: s.state.done, secs: s.state.secs, button: s.button, href: s.href),
      ExtraSlide() => _CardBody(course: s.course, tag: s.tag, fix: false, done: true, secs: s.session.secs, button: '', href: ''),
    };
  }

  /// A finished card says what it was in one word.
  static String _doneWord(String kind) => switch (kind) { 'lesson' => 'Lesson', 'fix' => 'Fix', _ => 'Review' };
}

class _CardBody extends StatelessWidget {
  const _CardBody({required this.course, required this.tag, required this.fix, required this.done, required this.secs, required this.button, required this.href});
  final Course course;
  final String tag, button, href;
  final bool fix, done;
  final num secs;

  @override
  Widget build(BuildContext context) {
    final mins = (secs / 60).round().clamp(1, 1 << 30);
    return Semantics(
      label: course.title,
      child: Opacity(
        opacity: 1,
        child: RoseCard(
          fill: true,
          children: [
            _Tag(tag, fix: fix),
            Semantics(header: true, child: Text(course.title, textAlign: TextAlign.center, style: serif(26, weight: FontWeight.w500, color: roseInk, height: 1.12))),
            Opacity(opacity: done ? 0.75 : 1, child: const WindowPlaceholder()),
            if (done)
              Opacity(
                opacity: 0.75,
                child: SizedBox(
                  height: 62,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [const DayTick(), const SizedBox(width: 10), Text('$mins min', style: sans(17, weight: FontWeight.w600, color: roseInk))],
                  ),
                ),
              )
            else
              GlassButton(button, onPressed: () => context.push(href)),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.text, {required this.fix});
  final String text;
  final bool fix;

  @override
  Widget build(BuildContext context) {
    final color = fix ? const Color(0xFFF7C2A8) : roseGold;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: fix ? const Color(0x29F0A789) : const Color(0x1FF3D8B6),
        border: Border.all(color: fix ? const Color(0x73F0A789) : const Color(0x4DF3D8B6)),
      ),
      child: Text(text.toUpperCase(), style: sans(11, weight: FontWeight.w700, color: color, spacing: 1.1)),
    );
  }
}
