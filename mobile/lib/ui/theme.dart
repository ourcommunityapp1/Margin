// The look, ported from the website's src/app/heir/heir.css: a softened photo behind solid cards,
// Source Serif 4 for Scripture and headings, Inter for the interface. Dark slate cards and light text,
// all day (the website always sets data-theme="dark"); the light palette is kept for a light theme later.
// One soft peach marks what is selected.
//
// Every colour and size used by screens comes from here; screens never write their own hex values.


import 'package:material_ui/material_ui.dart';

/// The colour tokens (`--card`, `--ink` and so on in heir.css).
@immutable
class KColors extends ThemeExtension<KColors> {
  const KColors({
    required this.card,
    required this.ink,
    required this.muted,
    required this.line,
    required this.well,
    required this.select,
    required this.button,
    required this.buttonInk,
    required this.wash,
    required this.ground,
    required this.edge,
    required this.good,
    required this.goodWash,
    required this.miss,
    required this.missWash,
  });

  final Color card, ink, muted, line, well, select, button, buttonInk, wash, ground, edge, good, goodWash, miss,
      missWash;

  /// `.hr[data-theme='dark']`: what the app shows.
  static const dark = KColors(
    card: Color(0xFF1E252B),
    ink: Color(0xFFECEEF0),
    muted: Color(0xFFA9B3BA),
    line: Color(0xFF333C43),
    well: Color(0xFF2B343B),
    select: Color(0xFF6B5332),
    button: Color(0xFFECE8DF),
    buttonInk: Color(0xFF1D2327),
    wash: Color.fromRGBO(12, 16, 22, 0.5),
    ground: Color(0xFF11161C),
    edge: Color(0xFF4B565E),
    good: Color(0xFF93D3B0),
    goodWash: Color(0xFF1F362B),
    miss: Color(0xFFF0A789),
    missWash: Color(0xFF432A20),
  );

  /// `.hr`: the light palette, kept for later.
  static const light = KColors(
    card: Color(0xFFF7F5F0),
    ink: Color(0xFF1D2327),
    muted: Color(0xFF5B6469),
    line: Color(0xFFE3DFD6),
    well: Color(0xFFECE8DF),
    select: Color(0xFFF3D8B6),
    button: Color(0xFF1D2327),
    buttonInk: Color(0xFFF7F5F0),
    wash: Color.fromRGBO(242, 240, 235, 0.48),
    ground: Color(0xFFDCD4C3),
    edge: Color(0xFFCFC8BA),
    good: Color(0xFF2F6B4F),
    goodWash: Color(0xFFE1EEE6),
    miss: Color(0xFF96462A),
    missWash: Color(0xFFF5E4DA),
  );

  /// The page's own ink: the status bar, the tab bar's frost, the screen's edges (`#11161c`).
  static const frame = Color(0xFF11161C);

  @override
  KColors copyWith() => this;

  @override
  KColors lerp(KColors? other, double t) => t < 0.5 || other == null ? this : other;
}

/// Sizes from heir.css, so screens share one rhythm.
abstract final class KSize {
  static const pageMaxWidth = 520.0;
  static const pageSide = 20.0;
  static const pageTop = 28.0;
  static const gap = 14.0;
  static const cardRadius = 28.0;
  static const cardPadding = 22.0;
  static const buttonHeight = 56.0;
  static const quietButtonHeight = 48.0;
  static const rowHeight = 56.0;
  static const inputHeight = 52.0;
  static const inputRadius = 16.0;
  static const tabBarHeight = 68.0; // 56px links + 6px padding each side
  static const tabBarBottom = 16.0;

  /// Space a tab screen leaves at the bottom for the floating tab bar (`.hr-page` padding-bottom: 112px).
  static const underTabs = 112.0;
}

/// The two type families. Both are variable fonts, so the weight is set as a font variation too.
abstract final class KFont {
  static const sans = 'Inter';
  static const serif = 'SourceSerif4';
}

/// A text style in Inter (the interface).
TextStyle sans(double size, {FontWeight weight = FontWeight.w400, Color? color, double? height, double? spacing}) =>
    TextStyle(
      fontFamily: KFont.sans,
      fontSize: size,
      fontWeight: weight,
      fontVariations: [FontVariation.weight(weight.value.toDouble())],
      color: color,
      height: height,
      letterSpacing: spacing,
    );

/// A text style in Source Serif 4 (Scripture and headings).
TextStyle serif(double size, {FontWeight weight = FontWeight.w400, Color? color, double? height, double? spacing}) =>
    TextStyle(
      fontFamily: KFont.serif,
      fontSize: size,
      fontWeight: weight,
      fontVariations: [FontVariation.weight(weight.value.toDouble())],
      color: color,
      height: height,
      letterSpacing: spacing,
    );

/// The app's theme. Screens read colours with `context.k`.
ThemeData katekizeTheme([KColors k = KColors.dark]) {
  final scheme = ColorScheme(
    brightness: k == KColors.dark ? Brightness.dark : Brightness.light,
    primary: k.button,
    onPrimary: k.buttonInk,
    secondary: k.select,
    onSecondary: k.ink,
    error: k.miss,
    onError: k.card,
    surface: k.card,
    onSurface: k.ink,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: k.ground,
    fontFamily: KFont.sans,
    textTheme: TextTheme(
      bodyMedium: sans(16, color: k.ink),
      bodyLarge: sans(17, color: k.ink),
      bodySmall: sans(14, color: k.muted),
    ),
    textSelectionTheme: TextSelectionThemeData(cursorColor: k.ink, selectionColor: k.select),
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    extensions: [k],
  );
}

extension KContext on BuildContext {
  /// The colour tokens for this screen.
  KColors get k => Theme.of(this).extension<KColors>() ?? KColors.dark;
}
