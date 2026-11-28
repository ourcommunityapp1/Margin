// One row of the community board (ui/community.tsx RowBody): place, avatar, name with the line under it, words in memory.
// You are picked out in gold. Shared by the full board and the Progress preview.

import 'package:material_ui/material_ui.dart';

import '../../data/board.dart';
import '../../ui/theme.dart';
import 'avatar.dart';

const boardGold = Color(0xFFE8B867);
const _meBg = Color(0xFF3A3123);
const _meSub = Color(0xFFE8CFA0);

String fmtWords(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');

class BoardRowView extends StatelessWidget {
  const BoardRowView(this.r, {super.key, this.note, this.height = 54, this.onTap, this.lifted = false});
  final BoardRow r;

  /// The line under "You" (for example "3rd of 12").
  final String? note;
  final double height;
  final VoidCallback? onTap;

  /// A row that is moving: lifted with a shadow.
  final bool lifted;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final sub = r.isMe ? (note ?? '') : rowSub(r);
    final move = r.isMe ? movement(r) : 0;
    final body = Container(
      constraints: BoxConstraints(minHeight: height),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: r.isMe ? _meBg : null,
        borderRadius: BorderRadius.circular(16),
        border: r.isMe ? Border.all(color: boardGold, width: 1.5) : null,
        boxShadow: lifted ? const [BoxShadow(color: Color(0x73000000), blurRadius: 16, offset: Offset(0, 6))] : null,
      ),
      child: Row(
        children: [
          SizedBox(width: 28, child: Text('${r.place}', textAlign: TextAlign.right, style: sans(14, weight: FontWeight.w600, color: r.isMe ? boardGold : k.muted))),
          const SizedBox(width: 10),
          KAvatar(r.name, size: 28),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.isMe ? 'You' : r.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: sans(16, weight: FontWeight.w600, color: k.ink, height: 1.25)),
                if (sub.isNotEmpty || move != 0)
                  Text.rich(
                    TextSpan(children: [
                      if (move != 0) TextSpan(text: arrow(move), style: sans(12.5, weight: FontWeight.w700, color: move > 0 ? k.good : k.miss)),
                      if (move != 0 && sub.isNotEmpty) const TextSpan(text: ' '),
                      if (sub.isNotEmpty) TextSpan(text: sub),
                    ]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: sans(12.5, color: r.isMe ? _meSub : k.muted, height: 1.25),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(fmtWords(r.words), style: sans(16, weight: FontWeight.w600, color: k.ink)),
        ],
      ),
    );
    return Semantics(
      container: true,
      label: '${r.place}. ${r.isMe ? 'You' : r.name}, ${fmtWords(r.words)} words',
      excludeSemantics: true,
      button: onTap != null,
      child: onTap == null ? body : InkWell(borderRadius: BorderRadius.circular(16), onTap: onTap, child: body),
    );
  }
}
