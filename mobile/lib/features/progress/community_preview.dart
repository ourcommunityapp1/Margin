// The community preview at the top of Progress (ui/community.tsx CommunityPreview): the top three, then you if you are
// lower down, with a pill when your place changed. Only shown signed in. Tapping through opens the full board.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/board.dart';
import '../../state/auth.dart';
import '../../state/board.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../friends/board_rows.dart';

class CommunityPreview extends ConsumerWidget {
  const CommunityPreview({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final signedIn = ref.watch(accountsProvider) && ref.watch(emailProvider).value != null;
    if (!signedIn) return const SizedBox.shrink();
    final profile = ref.watch(myProfileProvider);
    if (!profile.hasValue) return const SizedBox.shrink();
    final status = ref.watch(boardProvider);
    final alert = status?.alert ?? false;

    Widget go(String label, String to) => InkWell(
          onTap: () => context.push(to),
          child: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              children: [
                Expanded(child: Text(label, style: sans(16, weight: FontWeight.w600, color: k.ink))),
                KIcon('<path d="M5 12h14M13 6l6 6-6 6"/>', size: 16, color: k.ink, strokeWidth: 2.2),
              ],
            ),
          ),
        );

    if (profile.value == null) {
      return Semantics(
        label: 'Community',
        child: KCard.column(
          gap: 10,
          children: [
            const KLabel('Community'),
            Text('Memorize alongside friends. Make a profile to see how you compare.', style: sans(16, color: k.ink, height: 1.5)),
            go('Make my profile', '/profile'),
          ],
        ),
      );
    }

    final board = ref.watch(previewBoardProvider).value;
    if (board == null) return const SizedBox.shrink();
    final rows = previewRows(board);
    final myMove = status != null && alert && status.moved != 0 ? status.moved : 0;
    final pill = myMove != 0 ? arrow(myMove) : (status != null ? status.topTenNote : '');
    final me = board.rows.where((r) => r.isMe).firstOrNull;
    final ordinalNote = board.myPlace != null ? '${ordinal(board.myPlace!)} of ${board.total}' : '';

    return Semantics(
      label: 'Community',
      child: Container(
        decoration: alert ? BoxDecoration(borderRadius: BorderRadius.circular(KSize.cardRadius), border: Border.all(color: boardGold, width: 1.5)) : null,
        child: KCard.column(
          gap: 14,
          children: [
            Row(
              children: [
                const Expanded(child: KLabel('Community')),
                if (pill.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: boardGold, borderRadius: BorderRadius.circular(999)),
                    child: Text(pill, style: sans(12, weight: FontWeight.w700, color: const Color(0xFF1D2327), height: 1)),
                  ),
              ],
            ),
            if (board.total <= 1) ...[
              BoardRowView(
                me ?? const BoardRow(place: 1, idx: 1, username: 'me', relation: 'me', words: 0, name: 'You', isMe: true),
                note: 'Just you so far',
                height: 60,
              ),
              Text('Add friends to race them here. Their friends join your board too.', style: sans(14, color: k.muted, height: 1.45)),
              go('Find friends', '/friends'),
            ] else ...[
              Column(
                children: [
                  for (final (i, r) in rows.indexed) ...[
                    if (i == 3 && r.idx > 4) Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Center(child: Text('···', style: sans(13, color: k.muted, spacing: 4)))),
                    if (i > 0) const SizedBox(height: 8),
                    BoardRowView(r, height: 60, note: r.isMe ? ordinalNote : null),
                  ],
                ],
              ),
              go('View leaderboard', '/community'),
            ],
          ],
        ),
      ),
    );
  }
}
