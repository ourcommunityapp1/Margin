// A person (src/app/heir/ui/social.tsx PersonScreen): who they are, and, once you are friends, their streak, words in
// memory, stones, courses and friends. Never answers. Remove, block and report live here.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart';
import '../../engine/content.dart';
import '../../engine/levels.dart';
import '../../engine/util.dart' show localDay;
import '../../state/clock.dart';
import '../../state/social.dart';
import '../../ui/stone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;
import 'avatar.dart';

enum _Confirm { unfriend, block, report }

class PersonScreen extends ConsumerStatefulWidget {
  const PersonScreen({super.key, required this.username});
  final String username;

  @override
  ConsumerState<PersonScreen> createState() => _PersonScreenState();
}

class _PersonScreenState extends ConsumerState<PersonScreen> {
  Person? _p;
  bool _loaded = false;
  String _error = '';
  _Confirm? _confirm;
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      final p = await api.viewPerson(widget.username);
      if (mounted) {
        setState(() {
          _p = p;
          _loaded = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _p = null;
          _loaded = true;
        });
      }
    }
  }

  Future<void> _run(Future<void> Function(SocialApi api) fn, {VoidCallback? after}) async {
    setState(() => _error = '');
    try {
      await fn(ref.read(socialApiProvider)!);
      if (!mounted) return;
      setState(() => _confirm = null);
      if (after != null) {
        after();
      } else {
        await _load();
      }
    } catch (e) {
      if (mounted) setState(() => _error = e is SocialFailure ? e.message : 'Something went wrong. Try again.');
    }
  }

  void _leave() => context.canPop() ? context.pop() : context.go('/friends');

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final p = _p;
    final today = localDay(ref.watch(clockProvider)());
    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: _leave))),
        if (!_loaded)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Loading…', style: sans(16, color: k.muted)))
        else if (p == null)
          KCard(child: Text('We couldn’t find that person.', style: serif(24, color: k.ink)))
        else ...[
          Column(
            children: [
              KAvatar(p.name, size: 72),
              const SizedBox(height: 12),
              Semantics(header: true, child: Text(p.name, textAlign: TextAlign.center, style: serif(30, weight: FontWeight.w500, color: k.ink))),
              const SizedBox(height: 6),
              Text('@${p.username}${place(p.city, p.region).isEmpty ? '' : ' · ${place(p.city, p.region)}'}', textAlign: TextAlign.center, style: sans(16, color: k.muted)),
              const SizedBox(height: 4),
              Text('${friendsCount(p.friendsCount)}${p.mutual > 0 ? ' · ${p.mutual} in common' : ''}', style: sans(14, color: k.muted)),
              if (p.relation == Relation.friend && p.friendsSince != null) ...[
                const SizedBox(height: 8),
                KTag('Friends since ${sinceLabel(p.friendsSince)}'),
              ],
            ],
          ),
          if (p.relation == Relation.none) KButton('Add friend', onPressed: () => _run((api) => api.sendRequest(p.username))),
          if (p.relation == Relation.incoming)
            KButton('Accept request', onPressed: () => _run((api) async {
                  final r = await api.listRequests();
                  final req = r.incoming.where((x) => x.username == p.username).firstOrNull;
                  if (req != null) await api.answerRequest(req.id, true);
                })),
          if (p.relation == Relation.requested) Text('Request sent.', textAlign: TextAlign.center, style: sans(16, color: k.muted)),
          if (p.relation == Relation.none || p.relation == Relation.requested || p.relation == Relation.incoming)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(KSize.cardRadius), border: Border.all(color: k.line)),
              child: Text('Their streak, words in memory, stones and courses show here once you’re friends.', textAlign: TextAlign.center, style: sans(14, color: k.muted, height: 1.45)),
            ),
          if ((p.relation == Relation.friend || p.relation == Relation.me) && p.stones != null) ...[
            Semantics(
              label: 'Summary',
              child: KCard(
                child: Row(
                  children: [
                    _Stat(_fmt(p.wordsInMemory), 'words in memory'),
                    _Stat('${p.streak}', p.streak > 0 ? 'day streak' : streakLine(0, p.lastDay, today)),
                    _Stat('${p.friendsCount}', 'friends'),
                  ],
                ),
              ),
            ),
            Semantics(
              label: 'Stones',
              child: KCard.column(
                gap: 12,
                children: [
                  const KLabel('Stones'),
                  for (var row = 0; row < levelList.length; row += 3) ...[
                    if (row > 0) const SizedBox(height: 14),
                    Row(
                      children: [
                        for (var i = row; i < row + 3; i++)
                          Expanded(
                            child: i >= levelList.length
                                ? const SizedBox()
                                : Opacity(
                                    opacity: (i < p.stones!.length ? p.stones![i] : 0) > 0 ? 1 : 0.4,
                                    child: Column(
                                      children: [
                                        KStone(level: levelList[i].n, size: 40),
                                        const SizedBox(height: 4),
                                        Text('${i < p.stones!.length ? p.stones![i] : 0}', style: sans(15, weight: FontWeight.w700, color: k.ink)),
                                        Text(levelList[i].counts, textAlign: TextAlign.center, style: sans(11, color: k.muted)),
                                      ],
                                    ),
                                  ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (p.courses.isNotEmpty)
              Semantics(
                label: 'Courses',
                child: KCard.column(
                  gap: 12,
                  children: [
                    const KLabel('Courses'),
                    for (final c in p.courses)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(courseFor(c.course)?.title ?? c.course, style: sans(16, weight: FontWeight.w700, color: k.ink))),
                              Text('${c.learned} of ${c.total}', style: sans(14, color: k.muted)),
                            ],
                          ),
                          const SizedBox(height: 5),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(3),
                            child: Container(
                              height: 6,
                              color: k.well,
                              alignment: Alignment.centerLeft,
                              child: FractionallySizedBox(widthFactor: (c.learned / (c.total < 1 ? 1 : c.total)).clamp(0, 1).toDouble(), child: Container(color: k.good)),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            if (p.friends.isNotEmpty)
              Semantics(
                label: 'Their friends',
                child: KCard.column(
                  gap: 10,
                  children: [
                    KLabel('Friends · ${p.friendsCount}'),
                    Wrap(
                      spacing: 14,
                      runSpacing: 10,
                      children: [
                        for (final f in p.friends)
                          InkWell(
                            onTap: () => context.push('/u/${Uri.encodeComponent(f.username)}'),
                            child: SizedBox(
                              width: 64,
                              child: Column(children: [KAvatar(f.name, size: 44), const SizedBox(height: 4), Text(f.name.split(' ').first, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: sans(12, color: k.ink))]),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
          if (_error.isNotEmpty) Text(_error, textAlign: TextAlign.center, style: sans(15, color: k.miss)),
          if (p.relation != Relation.me)
            KCard.column(
              gap: 10,
              children: [
                if (_confirm == null)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (p.relation == Relation.friend) InkWell(onTap: () => setState(() => _confirm = _Confirm.unfriend), child: const _Chip('Remove friend')),
                      InkWell(onTap: () => setState(() => _confirm = _Confirm.block), child: const _Chip('Block')),
                      InkWell(onTap: () => setState(() => _confirm = _Confirm.report), child: const _Chip('Report')),
                    ],
                  )
                else if (_confirm == _Confirm.report) ...[
                  const KLabel('What’s wrong? (optional)'),
                  KTextField(controller: _note, maxLength: 200, label: 'What’s wrong?', textCapitalization: TextCapitalization.sentences),
                  Row(
                    children: [
                      Expanded(child: WellButton('Cancel', onPressed: () => setState(() => _confirm = null))),
                      const SizedBox(width: 10),
                      Expanded(child: KButton('Send report', onPressed: () => _run((api) => api.report(p.username, _note.text.trim())))),
                    ],
                  ),
                ] else ...[
                  Text(
                    _confirm == _Confirm.unfriend ? 'Remove ${p.name} as a friend? They won’t be told.' : 'Block ${p.name}? You’ll be hidden from each other everywhere, and any friendship or request ends.',
                    style: sans(15, color: k.ink, height: 1.5),
                  ),
                  Row(
                    children: [
                      Expanded(child: WellButton('Keep', onPressed: () => setState(() => _confirm = null))),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Material(
                          color: k.miss,
                          borderRadius: BorderRadius.circular(KSize.cardRadius),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(KSize.cardRadius),
                            onTap: () => _run((api) => _confirm == _Confirm.unfriend ? api.unfriend(p.username) : api.block(p.username), after: _leave),
                            child: SizedBox(height: KSize.buttonHeight, child: Center(child: Text(_confirm == _Confirm.unfriend ? 'Remove' : 'Block', style: sans(16, weight: FontWeight.w600, color: k.card, height: 1)))),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
        ],
      ],
    );
  }
}

String _fmt(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');

class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label);
  final String value, label;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Expanded(
      child: Column(
        children: [
          Text(value, style: serif(24, weight: FontWeight.w700, color: k.ink)),
          Text(label, textAlign: TextAlign.center, style: sans(12, color: k.muted)),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: KTag(text));
}
