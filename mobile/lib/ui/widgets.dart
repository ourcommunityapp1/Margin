// The shared pieces every screen is built from, each one a class in heir.css:
// .hr-page, .hr-card, .hr-btn, .hr-row, .hr-label, .hr-tag, .hr-back, .hr-choice, .hr-seg, input[type=text], .hr-mark.

import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:material_ui/material_ui.dart';

import 'theme.dart';

/// A screen's column of cards (`.hr-page`): at most 520 wide, centred, with room for the status bar and,
/// on tab screens, the floating tab bar. [bare] screens (welcome, sign in, start) have no tab bar.
class KPage extends StatelessWidget {
  const KPage({super.key, required this.children, this.bare = false, this.scroll = true, this.pushDown = false});

  final List<Widget> children;
  final bool bare;
  final bool scroll;

  /// Spread the pieces over the screen's height, so the last card sits at the bottom
  /// (the website's `marginTop: 'auto'` on that card).
  final bool pushDown;

  @override
  Widget build(BuildContext context) {
    final pad = MediaQuery.paddingOf(context);
    final padding = EdgeInsets.fromLTRB(
      KSize.pageSide + pad.left,
      KSize.pageTop + pad.top,
      KSize.pageSide + pad.right,
      // The keyboard covers the safe area, so use whichever is taller. This lifts the page's last card above the
      // keyboard (nothing else in the app resizes for it).
      (bare ? KSize.pageTop : KSize.underTabs) + math.max(pad.bottom, MediaQuery.viewInsetsOf(context).bottom),
    );
    Widget column(double minHeight) => ConstrainedBox(
          constraints: BoxConstraints(minHeight: minHeight),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: KSize.pageMaxWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisAlignment: pushDown ? MainAxisAlignment.spaceBetween : MainAxisAlignment.start,
                mainAxisSize: MainAxisSize.max,
                children: _gapped(children, KSize.gap),
              ),
            ),
          ),
        );
    return LayoutBuilder(
      builder: (context, c) {
        final minHeight = c.maxHeight.isFinite ? c.maxHeight - padding.vertical : 0.0;
        final body = Padding(padding: padding, child: pushDown ? IntrinsicHeight(child: column(minHeight)) : column(0));
        // A see-through Material layer, so text fields and ink work on every screen.
        return Material(
          type: MaterialType.transparency,
          child: scroll ? SingleChildScrollView(child: body) : body,
        );
      },
    );
  }
}

List<Widget> _gapped(List<Widget> children, double gap) => [
      for (var i = 0; i < children.length; i++) ...[if (i > 0) SizedBox(height: gap), children[i]],
    ];

/// A solid card (`.hr-card`): rounded 28, padded 22, softly shadowed.
class KCard extends StatelessWidget {
  const KCard({super.key, required this.child, this.padding = const EdgeInsets.all(KSize.cardPadding)});

  final Widget child;
  final EdgeInsets padding;

  /// A card holding a column of pieces with an even gap between them.
  static Widget column({Key? key, required List<Widget> children, double gap = 16, EdgeInsets? padding}) => KCard(
        key: key,
        padding: padding ?? const EdgeInsets.all(KSize.cardPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: _gapped(children, gap),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: context.k.card,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        boxShadow: const [
          BoxShadow(color: Color(0x0D14181C), blurRadius: 2, offset: Offset(0, 1)),
          BoxShadow(color: Color(0x0F14181C), blurRadius: 24, offset: Offset(0, 8)),
        ],
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

/// The main button (`.hr-btn`): full width, 56 tall, pill shaped. [quiet] is the plain text button under it.
class KButton extends StatelessWidget {
  const KButton(this.label, {super.key, required this.onPressed, this.quiet = false, this.busyLabel, this.busy = false, this.color, this.ink});

  final String label;
  final VoidCallback? onPressed;
  final bool quiet;

  /// A fill and text colour other than the usual (Continue turns green after a right answer).
  final Color? color, ink;

  /// Shown instead of [label] while [busy] ("Sending…").
  final String? busyLabel;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final enabled = onPressed != null && !busy;
    final bg = color ?? (quiet ? Colors.transparent : k.button);
    final fg = ink ?? (quiet ? k.ink : k.buttonInk);
    return Semantics(
      button: true,
      enabled: enabled,
      child: Opacity(
        opacity: enabled || quiet ? 1 : 0.45,
        child: Material(
          color: bg,
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          child: InkWell(
            borderRadius: BorderRadius.circular(KSize.cardRadius),
            onTap: enabled
                ? () {
                    HapticFeedback.selectionClick();
                    onPressed!();
                  }
                : null,
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: quiet ? KSize.quietButtonHeight : KSize.buttonHeight),
              child: Center(
                child: Text(
                  busy ? (busyLabel ?? label) : label,
                  style: sans(17, weight: quiet ? FontWeight.w500 : FontWeight.w600, color: fg, height: 1),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A row in a list (`.hr-row`): 56 tall, a line above every row but the first.
class KRow extends StatelessWidget {
  const KRow({super.key, required this.child, this.trailing, this.onTap, this.first = false});

  final Widget child;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final row = Container(
      constraints: const BoxConstraints(minHeight: KSize.rowHeight),
      decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: k.line))),
      child: Row(
        children: [
          Expanded(child: DefaultTextStyle(style: sans(16, color: k.ink), child: child)),
          if (trailing != null) ...[const SizedBox(width: 12), trailing!],
        ],
      ),
    );
    return onTap == null ? row : InkWell(onTap: onTap, child: row);
  }
}

/// A small heading above a field or a list (`.hr-label`).
class KLabel extends StatelessWidget {
  const KLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Text(text, style: sans(14, weight: FontWeight.w600, color: context.k.muted));
}

/// A tag (`.hr-tag`): "Recommended", "Fix today", "This morning", "When you lie down".
class KTag extends StatelessWidget {
  const KTag(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(10)),
      child: Text(text, style: sans(13, weight: FontWeight.w600, color: k.ink)),
    );
  }
}

/// The round back button (`.hr-back`).
class KBack extends StatelessWidget {
  const KBack({super.key, required this.onPressed, this.label = 'Back'});
  final VoidCallback onPressed;
  final String label;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: k.card,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Center(child: KIcon(KIcons.back, size: 18, color: k.ink, strokeWidth: 2)),
          ),
        ),
      ),
    );
  }
}

/// A large tappable choice (`.hr-choice`); peach when picked.
class KChoice extends StatelessWidget {
  const KChoice({super.key, required this.child, required this.selected, required this.onTap});
  final Widget child;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final color = selected ? k.select : k.card;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: color,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: color, width: 1.5),
        ),
        elevation: 0,
        shadowColor: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: DefaultTextStyle(style: sans(17, weight: FontWeight.w500, color: k.ink), child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A segmented control (`.hr-seg`): one choice of a few, side by side.
class KSegmented<T> extends StatelessWidget {
  const KSegmented({super.key, required this.options, required this.value, required this.onChanged});
  final Map<T, String> options;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: k.card, borderRadius: BorderRadius.circular(20)),
      child: Row(
        children: [
          for (final (i, e) in options.entries.indexed) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(
              child: Semantics(
                selected: e.key == value,
                button: true,
                child: Material(
                  color: e.key == value ? k.button : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => onChanged(e.key),
                    child: SizedBox(
                      height: 44,
                      child: Center(
                        child: Text(
                          e.value,
                          style: sans(15, weight: FontWeight.w600, color: e.key == value ? k.buttonInk : k.ink),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A text field (`.hr input[type='text']`): 52 tall, rounded 16, a thin line.
class KTextField extends StatelessWidget {
  const KTextField({
    super.key,
    this.controller,
    this.onChanged,
    this.onSubmitted,
    this.keyboardType,
    this.autofillHints,
    this.textCapitalization = TextCapitalization.none,
    this.maxLength,
    this.autofocus = false,
    this.letterSpacing,
    this.label,
    this.textInputAction,
    this.hint,
    this.obscureText = false,
  });

  /// Dots instead of letters (a password).
  final bool obscureText;

  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final TextCapitalization textCapitalization;
  final int? maxLength;
  final bool autofocus;
  final double? letterSpacing;
  final TextInputAction? textInputAction;

  /// Read aloud by screen readers; the visible label is a [KLabel] above the field.
  final String? label;

  /// Faint text shown while the field is empty (the website's placeholder).
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    OutlineInputBorder border(Color c) =>
        OutlineInputBorder(borderRadius: BorderRadius.circular(KSize.inputRadius), borderSide: BorderSide(color: c));
    return TextField(
      controller: controller,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      textCapitalization: textCapitalization,
      textInputAction: textInputAction,
      autofocus: autofocus,
      autocorrect: false,
      obscureText: obscureText,
      enableSuggestions: !obscureText,
      maxLength: maxLength,
      style: sans(17, color: k.ink, spacing: letterSpacing),
      cursorColor: k.ink,
      decoration: InputDecoration(
        semanticCounterText: '',
        counterText: '',
        labelText: null,
        hintText: hint,
        hintStyle: sans(17, color: context.k.muted),
        isDense: true,
        filled: true,
        fillColor: k.card,
        constraints: const BoxConstraints(minHeight: KSize.inputHeight),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        border: border(k.line),
        enabledBorder: border(k.line),
        focusedBorder: border(k.ink),
      ),
    );
  }
}

/// The Katekize K, drawn in the current text colour (`.hr-mark`).
class KMark extends StatelessWidget {
  const KMark({super.key, this.width = 54, this.height = 62, this.color});
  final double width, height;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        width: width,
        height: height,
        child: Image.asset(
          'assets/images/katekize-k-mark.png',
          fit: BoxFit.contain,
          color: color ?? context.k.ink,
          colorBlendMode: BlendMode.srcIn,
        ),
      ),
    );
  }
}

/// The website's line icons, drawn from the same SVG paths (24×24, round caps).
abstract final class KIcons {
  static const today = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>';
  static const courses =
      '<path d="M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 0-2 2zM21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 1 2 2z"/>';
  static const progress =
      '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M12 13v4M8 20h8M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3"/>';
  static const friends =
      '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.3A4.6 4.6 0 0 1 21 18.6"/>';
  static const back = '<path d="M15 5l-7 7 7 7"/>';
}

/// One of [KIcons], stroked in [color].
class KIcon extends StatelessWidget {
  const KIcon(this.paths, {super.key, this.size = 20, this.color, this.strokeWidth = 1.7});
  final String paths;
  final double size;
  final Color? color;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
        'stroke="#000" stroke-width="$strokeWidth" stroke-linecap="round" stroke-linejoin="round">$paths</svg>';
    return SvgPicture.string(
      svg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color ?? context.k.ink, BlendMode.srcIn),
      excludeFromSemantics: true,
    );
  }
}

/// Text whose lines come out even (CSS `text-wrap: balance`): it takes the narrowest width that still needs the same number
/// of lines, so a title breaks as "Westminster Shorter / Catechism" and a sentence never ends with one word alone on a line.
class KBalancedText extends StatelessWidget {
  const KBalancedText(this.text, {super.key, required this.style, this.maxLines, this.textAlign = TextAlign.start});
  final String text;
  final TextStyle style;
  final int? maxLines;
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    final direction = Directionality.of(context);
    // Measure exactly what Text will draw: the style merged into the default one (letter spacing, font features and all).
    final drawn = DefaultTextStyle.of(context).style.merge(style);
    return LayoutBuilder(
      builder: (context, c) {
        final max = c.maxWidth;
        if (!max.isFinite) return Text(text, style: style, maxLines: maxLines, textAlign: textAlign);
        int linesAt(double w) {
          final tp = TextPainter(text: TextSpan(text: text, style: drawn), textDirection: direction, textScaler: scaler, maxLines: maxLines)..layout(maxWidth: w);
          final n = tp.computeLineMetrics().length;
          tp.dispose();
          return n;
        }

        final lines = linesAt(max);
        var width = max;
        if (lines > 1) {
          // The narrowest width that still fits in [lines] lines: search between half the width and the full width.
          var lo = max / 2, hi = max;
          for (var i = 0; i < 12; i++) {
            final mid = (lo + hi) / 2;
            if (linesAt(mid) > lines) {
              lo = mid;
            } else {
              hi = mid;
            }
          }
          // A pixel of slack for rounding, never past the room there is.
          width = (hi + 1).clamp(0, max).toDouble();
        }
        return Align(
          alignment: textAlign == TextAlign.center ? Alignment.topCenter : AlignmentDirectional.topStart,
          child: SizedBox(width: width, child: Text(text, style: style, maxLines: maxLines, textAlign: textAlign, overflow: maxLines == null ? null : TextOverflow.ellipsis)),
        );
      },
    );
  }
}
