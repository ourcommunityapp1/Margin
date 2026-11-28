// A round initial in a colour picked from the name (ui/social.tsx Avatar), so each person looks the same every time.

import 'package:material_ui/material_ui.dart';

import '../../ui/theme.dart';

const _colors = [Color(0xFF9AD1D4), Color(0xFFFFD6A5), Color(0xFFC3B1E1), Color(0xFFB5E48C), Color(0xFFFFADAD), Color(0xFFA0C4FF), Color(0xFFCAFFBF), Color(0xFFFDFFB6), Color(0xFFFFC6FF)];

class KAvatar extends StatelessWidget {
  const KAvatar(this.name, {super.key, this.size = 40});
  final String name;
  final double size;

  @override
  Widget build(BuildContext context) {
    final sum = name.runes.fold<int>(0, (n, c) => n + c);
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: _colors[sum % _colors.length], shape: BoxShape.circle),
        child: Text(name.isEmpty ? '?' : String.fromCharCode(name.runes.first).toUpperCase(), style: sans(size * 0.4, weight: FontWeight.w700, color: const Color(0xFF11161C), height: 1)),
      ),
    );
  }
}
