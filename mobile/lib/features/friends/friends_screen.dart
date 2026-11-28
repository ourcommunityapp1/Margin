// Community (src/app/heir/ui/social.tsx FriendsScreen): search, then two small boxes (Requests, and Friends, which opens
// your list), then the leaderboard; and an invite for someone who isn't on Katekize yet. The database decides what each person may see; this only shows what it returns.

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../progress/community_preview.dart';

import '../../data/social.dart';
import '../../platform/share.dart';
import '../../engine/util.dart' show localDay;
import '../../state/clock.dart';
import '../../state/social.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'avatar.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen> {
  final _q = TextEditingController();
  Timer? _timer;
  List<Person>? _results;
  List<FriendRow>? _friends;
  int _incoming = 0;
  String _error = '', _link = '', _inviteNote = '';
  bool _busy = false, _invite = false, _inviteBusy = false, _loadedFor = false, _showFriends = false;

  @override
  void dispose() {
    _timer?.cancel();
    _q.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      final f = await api.listFriends();
      if (mounted) {
        setState(() {
          _friends = f;
          _error = '';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Couldn’t load your friends. Check your connection.');
    }
    try {
      final r = await api.listRequests();
      if (mounted) setState(() => _incoming = r.incoming.length);
    } catch (_) {/* the count is a convenience */}
  }

  void _search(String text) {
    _timer?.cancel();
    final term = text.trim();
    if (term.length < 2) {
      setState(() => _results = null);
      return;
    }
    _timer = Timer(const Duration(milliseconds: 350), () async {
      try {
        final r = await ref.read(socialApiProvider)!.search(term);
        if (mounted) {
          setState(() {
            _results = r;
            _error = '';
          });
        }
      } catch (e) {
        if (mounted) setState(() => _error = e is SocialFailure ? e.message : 'Couldn’t search. Check your connection.');
      }
    });
  }

  Future<void> _act(Person p) async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      Relation next;
      if (p.relation == Relation.incoming) {
        final r = await api.listRequests();
        final req = r.incoming.where((x) => x.username == p.username).firstOrNull;
        if (req != null) await api.answerRequest(req.id, true);
        next = Relation.friend;
      } else {
        next = (await api.sendRequest(p.username)) == 'friends' ? Relation.friend : Relation.requested;
      }
      if (mounted) {
        setState(() => _results = _results?.map((x) => x.username == p.username ? x.withRelation(next) : x).toList());
      }
      if (next == Relation.friend) await _load();
    } catch (e) {
      if (mounted) setState(() => _error = e is SocialFailure ? e.message : 'Something went wrong. Try again.');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _makeInvite() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    setState(() {
      _inviteBusy = true;
      _inviteNote = '';
    });
    try {
      final url = _link.isNotEmpty ? _link : '$siteOrigin/heir/invite?code=${await api.createFriendInvite()}';
      final note = await shareOrCopy(ref, title: 'Memorize with me on Katekize', text: 'Memorize with me on Katekize:', url: url);
      if (mounted) {
        setState(() {
          _link = url;
          _inviteNote = note ?? '';
        });
      }
    } catch (e) {
      if (mounted) setState(() => _inviteNote = e is SocialFailure && e.message.isNotEmpty ? e.message : 'Couldn’t make an invite. Try again.');
    }
    if (mounted) setState(() => _inviteBusy = false);
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final profile = ref.watch(myProfileProvider);
    final today = localDay(ref.watch(clockProvider)());
    final has = profile.value != null;
    if (has && !_loadedFor) {
      _loadedFor = true;
      Future.microtask(_load);
    }
    if (!has) _loadedFor = false;

    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              const Expanded(child: KTitle('Community')),
              if (has)
                Semantics(
                  button: true,
                  label: 'Invite someone to Katekize',
                  child: Material(
                    color: k.button,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => setState(() => _invite = !_invite),
                      child: SizedBox(width: 44, height: 44, child: Icon(_invite ? Icons.close : Icons.add, color: k.buttonInk, size: 22)),
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (has && _invite)
          KCard.column(
            gap: 12,
            children: [
              Text('Invite someone who isn’t on Katekize yet.', style: serif(22, color: k.ink, height: 1.2)),
              Text('They get a link that works once, for a week. When they make a profile and accept, you’re friends.', style: sans(15, color: k.muted, height: 1.5)),
              KButton(_link.isNotEmpty ? 'Send it again' : 'Send an invite', busy: _inviteBusy, busyLabel: 'Making your link…', onPressed: _makeInvite),
              if (_inviteNote.isNotEmpty) Text(_inviteNote, style: sans(15, color: k.muted)),
              if (_link.isNotEmpty) SelectableText(_link, style: sans(13, color: k.muted)),
            ],
          ),
        if (profile.isLoading && !profile.hasValue)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Loading…', style: sans(16, color: k.muted)))
        else if (profile.hasError)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Couldn’t load. Check your connection.', style: sans(16, color: k.miss)))
        else if (!has)
          KCard.column(
            gap: 14,
            children: [
              Text('Memorize with friends. Make a profile to find people and be found.', style: serif(24, color: k.ink, height: 1.2)),
              Text('Friends see your streak, words in memory, stones and courses. Never your answers. Children are never shown.', style: sans(15, color: k.muted, height: 1.5)),
              KButton('Make my profile', onPressed: () => context.push('/profile')),
            ],
          )
        else ...[
          KTextField(controller: _q, hint: 'Search by name or username', label: 'Search by name or username', onChanged: _search),
          if (_error.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(_error, style: sans(15, color: k.miss))),
          if (_results != null)
            Semantics(
              label: 'Search results',
              child: KCard(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                child: _results!.isEmpty
                    ? Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: Text('No one found. They may not have turned on “Let people find me”.', style: sans(16, color: k.muted)))
                    : Column(
                        children: [
                          for (final (i, p) in _results!.indexed)
                            KRow(
                              first: i == 0,
                              onTap: () => context.push('/u/${Uri.encodeComponent(p.username)}'),
                              trailing: _RelationButton(p, _busy, () => _act(p)),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                child: Row(
                                  children: [
                                    KAvatar(p.name),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(p.name, style: sans(16, weight: FontWeight.w700, color: k.ink)),
                                          Text('@${p.username}${place(p.city, p.region).isEmpty ? '' : ' · ${place(p.city, p.region)}'}', style: sans(13, color: k.muted)),
                                          Text('${friendsCount(p.friendsCount)}${p.mutual > 0 ? ' · ${p.mutual} in common' : ''}', style: sans(13, color: k.muted)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
              ),
            )
          else ...[
            // Two small boxes under the search: Requests (with a dot when one is waiting) and Friends (opens the list).
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _MiniBox(
                      label: 'Requests',
                      value: '$_incoming',
                      dot: _incoming > 0,
                      semantics: 'Friend requests${_incoming > 0 ? ', $_incoming waiting' : ''}',
                      onTap: () => context.push('/friends/requests'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MiniBox(
                      label: 'Friends',
                      value: _friends == null ? '–' : '${_friends!.length}',
                      expanded: _showFriends,
                      onTap: () => setState(() => _showFriends = !_showFriends),
                    ),
                  ),
                ],
              ),
            ),
            if (_showFriends)
              Semantics(
              label: 'Your friends',
              child: KCard.column(
                gap: 4,
                children: [
                  KLabel(_friends == null ? 'Friends' : friendsCount(_friends!.length)),
                  if (_friends != null && _friends!.isEmpty)
                    Padding(padding: const EdgeInsets.only(top: 10, bottom: 4), child: Text('No friends yet. Search for someone above to send a request.', style: sans(16, color: k.muted, height: 1.5))),
                  for (final (i, f) in (_friends ?? const <FriendRow>[]).indexed)
                    KRow(
                      first: i == 0,
                      onTap: () => context.push('/u/${Uri.encodeComponent(f.username)}'),
                      trailing: Text(_fmt(f.wordsInMemory), style: sans(16, weight: FontWeight.w700, color: k.ink)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            KAvatar(f.name, size: 36),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(f.name, style: sans(16, weight: FontWeight.w700, color: k.ink)),
                                  Text(streakLine(f.streak, f.lastDay, today), style: sans(13, color: k.muted)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (_friends != null && _friends!.isNotEmpty) Align(alignment: Alignment.centerRight, child: Text('words in memory', style: sans(12, color: k.muted))),
                ],
              ),
            ),
            // The leaderboard, unchanged, below the boxes; not while searching.
            const CommunityPreview(),
          ],
        ],
      ],
    );
  }
}

/// One of the two small boxes (`.hr-mini2`): a word on the left, a number on the right.
class _MiniBox extends StatelessWidget {
  const _MiniBox({required this.label, required this.value, required this.onTap, this.dot = false, this.expanded, this.semantics});
  final String label, value;
  final VoidCallback onTap;
  final bool dot;
  final bool? expanded;
  final String? semantics;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      button: true,
      expanded: expanded,
      label: semantics ?? '$label, $value',
      excludeSemantics: true,
      child: Material(
        color: k.card,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 52),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  if (dot) Container(width: 8, height: 8, margin: const EdgeInsets.only(right: 7), decoration: const BoxDecoration(color: Color(0xFFE8B867), shape: BoxShape.circle)),
                  Expanded(child: Text(label, style: sans(15, weight: FontWeight.w500, color: k.muted))),
                  const SizedBox(width: 10),
                  Text(value, style: serif(20, weight: FontWeight.w600, color: k.ink)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _fmt(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');

class _RelationButton extends StatelessWidget {
  const _RelationButton(this.p, this.busy, this.onTap);
  final Person p;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    if (p.relation == Relation.friend) return const KTag('Friends');
    if (p.relation == Relation.requested) return const KTag('Sent');
    if (p.relation == Relation.me) return const KTag('You');
    return Material(
      color: k.button,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: busy ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(p.relation == Relation.incoming ? 'Accept' : 'Add', style: sans(14, weight: FontWeight.w600, color: k.buttonInk)),
        ),
      ),
    );
  }
}
