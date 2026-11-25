// The community leaderboard (src/app/heir/ui/community.tsx CommunityScreen): you, your friends and their friends, by words
// in memory, this month or all time. Your move since you last looked is shown as it happens. The database decides who is
// on the board and in what order. Children's progress is never on it.

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/board.dart';
import '../../state/auth.dart';
import '../../state/board.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'board_rows.dart';

const _rowH = 58.0, _gapH = 22.0;

class CommunityScreen extends ConsumerStatefulWidget {
  const CommunityScreen({super.key});

  @override
  ConsumerState<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends ConsumerState<CommunityScreen> {
  Period _period = Period.all;
  Board? _board;
  BoardStatus? _status;
  String _error = '';
  bool _animate = true, _loadedFor = false;
  int _mark = 0;

  Future<void> _load(Period p) async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    final mark = ++_mark;
    setState(() => _error = '');
    try {
      final b = await api.getBoard(p);
      final s = p == Period.all ? await api.getBoardStatus() : null;
      if (!mounted || mark != _mark) return;
      setState(() {
        _board = b;
        _status = s;
      });
      await api.markBoardSeen(p);
      ref.read(boardProvider.notifier).seen();
    } catch (_) {
      if (mounted && mark == _mark) setState(() => _error = 'Couldn’t load the board. Check your connection.');
    }
  }

  void _pick(Period p) {
    if (p == _period) return;
    setState(() {
      _animate = false;
      _period = p;
      _board = null;
    });
    _load(p);
  }

  void _explain() {
    final k = context.k;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: k.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('How it’s counted', style: serif(22, color: k.ink)),
              const SizedBox(height: 12),
              Text('A word counts once you’ve typed or said its verse or answer from memory, with no hints, on a later day than you first learned it.', style: sans(16, color: k.ink, height: 1.5)),
              const SizedBox(height: 10),
              Text.rich(
                TextSpan(children: [
                  TextSpan(text: 'All time:', style: sans(16, weight: FontWeight.w700, color: k.ink)),
                  const TextSpan(text: ' every word that counts now. '),
                  TextSpan(text: 'This month:', style: sans(16, weight: FontWeight.w700, color: k.ink)),
                  const TextSpan(text: ' the words added since the 1st.'),
                ]),
                style: sans(16, color: k.ink, height: 1.5),
              ),
              const SizedBox(height: 10),
              Text('Your community is you, your friends, and their friends. The arrow shows how many places you’ve moved since you last looked. Children’s progress is never on the board.', style: sans(14, color: k.muted, height: 1.5)),
              const SizedBox(height: 16),
              KButton('Got it', onPressed: () => Navigator.of(ctx).pop()),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final signedIn = ref.watch(emailProvider).value != null && ref.watch(accountsProvider);
    final profile = ref.watch(myProfileProvider);
    final noProfile = signedIn && profile.hasValue && profile.value == null;
    if (signedIn && profile.hasValue && profile.value != null && !_loadedFor) {
      _loadedFor = true;
      Future.microtask(() => _load(_period));
    }
    final board = _board;
    final note = _status == null ? '' : _status!.topTenNote;

    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/progress')))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Semantics(header: true, child: Text('Community', style: serif(32, weight: FontWeight.w500, color: k.ink)))),
        if (!signedIn)
          KCard.column(gap: 12, children: [Text('Sign in to see your community.', style: serif(24, color: k.ink)), KButton('Sign in', onPressed: () => context.push('/signin?next=/community'))])
        else if (noProfile)
          KCard.column(gap: 12, children: [Text('Make a profile to join your community’s board.', style: serif(22, color: k.ink, height: 1.2)), KButton('Make my profile', onPressed: () => context.push('/profile'))])
        else ...[
          KSegmented<Period>(options: const {Period.month: 'This month', Period.all: 'All time'}, value: _period, onChanged: _pick),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('${_period == Period.all ? 'Words in memory' : 'Words added to memory this month'}${board != null ? ' · ${board.total} ${board.total == 1 ? 'person' : 'people'} in your community' : ''} · ', style: sans(13, color: k.muted)),
                GestureDetector(
                  onTap: _explain,
                  child: Text('How it’s counted', style: sans(13, color: k.muted).copyWith(decoration: TextDecoration.underline)),
                ),
              ],
            ),
          ),
          if (_error.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(_error, style: sans(15, color: k.miss))),
          if (board != null && board.total <= 1)
            KCard.column(gap: 12, children: [
              Text('It’s just you so far. Add friends to see how you compare. Their friends join your board too.', style: sans(16, color: k.ink, height: 1.5)),
              KButton('Find friends', onPressed: () => context.go('/friends')),
            ])
          else if (board != null)
            KCard(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: _Rows(key: ValueKey(board.period), rows: board.rows, animate: _animate, note: note, onOpen: (u) => context.push('/u/${Uri.encodeComponent(u)}')),
            )
          else if (_error.isEmpty)
            Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Loading…', style: sans(16, color: k.muted))),
        ],
      ],
    );
  }
}

class _Rows extends StatefulWidget {
  const _Rows({super.key, required this.rows, required this.animate, required this.note, required this.onOpen});
  final List<BoardRow> rows;
  final bool animate;
  final String note;
  final ValueChanged<String> onOpen;

  @override
  State<_Rows> createState() => _RowsState();
}

class _RowsState extends State<_Rows> {
  late bool _end = !widget.animate;
  Timer? _timer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_end) return;
    // With "reduce motion" on there is no move: the board opens in its place.
    if (MediaQuery.disableAnimationsOf(context)) {
      _end = true;
    } else {
      _timer ??= Timer(const Duration(milliseconds: 700), () {
        if (mounted) setState(() => _end = true);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final rows = widget.rows;
    final (:start, :end) = slots(rows);
    final gaps = gapsAfter(rows);
    int gapsBefore(int slot) => gaps.where((g) => g < slot).length;
    double y(BoardRow r) => _end ? end[r.username]! * _rowH + gapsBefore(end[r.username]!) * _gapH : start[r.username]! * _rowH;
    final height = rows.length * _rowH + gaps.length * _gapH;
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Semantics(
      label: 'Community leaderboard',
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            for (final r in rows)
              AnimatedPositioned(
                key: ValueKey(r.username),
                duration: reduce ? Duration.zero : const Duration(milliseconds: 1100),
                curve: const Cubic(0.22, 0.9, 0.24, 1),
                left: 0,
                right: 0,
                top: y(r),
                height: _rowH - 4,
                child: BoardRowView(
                  r,
                  note: widget.note,
                  lifted: !_end && r.isMe && start[r.username] != end[r.username],
                  onTap: r.relation == 'friend' || r.relation == 'fof' ? () => widget.onOpen(r.username) : null,
                ),
              ),
            if (_end)
              for (final g in gaps)
                Positioned(
                  left: 0,
                  right: 0,
                  top: (g + 1) * _rowH + gaps.where((x) => x < g).length * _gapH,
                  height: _gapH,
                  child: ExcludeSemantics(child: Center(child: Text('···', style: sans(13, color: k.muted, spacing: 4)))),
                ),
          ],
        ),
      ),
    );
  }
}
