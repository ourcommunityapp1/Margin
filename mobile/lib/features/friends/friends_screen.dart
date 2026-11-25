// Friends (src/app/heir/friends/page.tsx, ui/social.tsx). Only shown once signed in.

import 'package:material_ui/material_ui.dart';

import '../../ui/screen_parts.dart';
import '../../ui/widgets.dart';

class FriendsScreen extends StatelessWidget {
  const FriendsScreen({super.key});

  @override
  Widget build(BuildContext context) => const KPage(
        children: [
          KTitle('Friends'),
          KComingCard('Your friends, their streaks and the words they have in memory will show here.'),
        ],
      );
}
