// Progress (src/app/heir/progress/page.tsx). The week, levels and windows come from the engine's progress and
// levels rules, still being ported.

import 'package:material_ui/material_ui.dart';

import '../../ui/screen_parts.dart';
import '../../ui/widgets.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) => const KPage(
        children: [
          KTitle('Progress'),
          KComingCard('Your week, the days you’ve kept and your windows will show here.'),
        ],
      );
}
