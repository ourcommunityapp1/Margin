// Courses (src/app/heir/courses/page.tsx). The shelves of courses come from the course content, which the
// engine side is loading next.

import 'package:material_ui/material_ui.dart';

import '../../ui/screen_parts.dart';
import '../../ui/widgets.dart';

class CoursesScreen extends StatelessWidget {
  const CoursesScreen({super.key});

  @override
  Widget build(BuildContext context) => const KPage(
        children: [
          KTitle('Courses'),
          KComingCard('Every course will be listed here, from First Verses to the catechisms, with how far you’ve got.'),
        ],
      );
}
