import 'package:flutter/widgets.dart';

// Placeholder while the engine is ported (phase 1). Replaced by the real app
// (theme, tab bar, Today) in phase 2; see docs/app/AI_GUIDE.md.
// Plain widgets only, so no design package is chosen here.
void main() => runApp(const KatekizeApp());

class KatekizeApp extends StatelessWidget {
  const KatekizeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Color(0xFFFFFFFF),
      child: Center(
        child: Text(
          'Katekize',
          textDirection: TextDirection.ltr,
          style: TextStyle(fontSize: 32, color: Color(0xFF000000)),
        ),
      ),
    );
  }
}
