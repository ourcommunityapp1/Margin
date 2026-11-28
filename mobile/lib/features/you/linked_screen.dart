// Linked accounts (src/app/heir/ui/linked.tsx): see another account's family and progress (view only), link someone new,
// or unlink. Wording matches the website.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart';
import '../../platform/share.dart';
import '../../engine/content.dart';
import '../../engine/levels.dart';
import '../../engine/progress.dart';
import '../../engine/tiers.dart';
import '../../state/auth.dart';
import '../../state/clock.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;

class LinkedScreen extends ConsumerStatefulWidget {
  const LinkedScreen({super.key});

  @override
  ConsumerState<LinkedScreen> createState() => _LinkedScreenState();
}

class _LinkedScreenState extends ConsumerState<LinkedScreen> {
  List<LinkedAccount>? _linked;
  bool _failed = false, _busy = false;
  String? _confirm;
  String _link = '', _message = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      final l = await api.loadLinked();
      if (mounted) {
        setState(() {
          _linked = l;
          _failed = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  Future<void> _make() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    setState(() {
      _busy = true;
      _message = '';
    });
    try {
      final code = await api.createInvite();
      if (mounted) setState(() => _link = '$siteOrigin/heir/join?code=$code');
    } catch (_) {
      if (mounted) setState(() => _message = 'Couldn’t make an invite. Check your connection and try again.');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _send() async {
    final note = await shareOrCopy(ref, title: 'Link our Katekize accounts', text: 'Link our Katekize accounts:', url: _link);
    if (mounted) setState(() => _message = note ?? '');
  }

  Future<void> _unlink(String ownerId) async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      await api.unlink(ownerId);
      if (mounted) setState(() => _confirm = null);
      await _load();
    } catch (_) {
      if (mounted) setState(() => _message = 'Couldn’t unlink. Try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final signedIn = ref.watch(emailProvider).value != null && ref.watch(accountsProvider);
    final today = localDay(ref.watch(clockProvider)());
    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you')))),
        if (!signedIn)
          Text('Sign in to link accounts.', style: sans(16, color: k.muted))
        else ...[
          for (final a in _linked ?? const <LinkedAccount>[])
            KCard.column(
              gap: 14,
              children: [
                Row(
                  children: [
                    Expanded(child: KLabel('Linked account · view only')),
                    if (a.plan != null && courseFor(a.plan!.course) != null)
                      Flexible(child: Text(courseFor(a.plan!.course)!.title, textAlign: TextAlign.right, style: sans(13, weight: FontWeight.w600, color: k.muted))),
                  ],
                ),
                if (a.members.isEmpty) Text('Hasn’t set up a family yet.', style: sans(15, color: k.muted)),
                for (final m in a.members) _Person(m.name, a.progress[m.id], today),
                if (_confirm == a.ownerId) ...[
                  Row(
                    children: [
                      Expanded(child: WellButton('Keep the link', onPressed: () => setState(() => _confirm = null))),
                      const SizedBox(width: 10),
                      Expanded(child: _Danger('Unlink', k, () => _unlink(a.ownerId))),
                    ],
                  ),
                  Text('Unlinking only stops you seeing each other. Nobody’s progress or account is deleted.', style: sans(13, color: k.muted)),
                ] else
                  Align(alignment: Alignment.centerLeft, child: KButton('Unlink', quiet: true, onPressed: () => setState(() => _confirm = a.ownerId))),
              ],
            ),
          KCard.column(
            gap: 12,
            children: [
              const KLabel('Link a spouse’s account'),
              Text(
                'Each of you keeps your own account, progress and course. Once linked, you can see each other’s progress here, view only: neither can change or delete the other’s. The link works once, for a week.',
                style: sans(15, color: k.ink, height: 1.5),
              ),
              if (_link.isNotEmpty) ...[
                SelectableText(_link, style: sans(13, color: k.muted)),
                KButton('Send the link', onPressed: _send),
              ] else
                WellButton(_busy ? 'Making a link…' : 'Make an invite link', onPressed: _busy ? null : _make),
              if (_message.isNotEmpty) Text(_message, style: sans(14, color: k.muted)),
              if (_failed) Text('Couldn’t load linked accounts. Check your connection.', style: sans(14, color: k.miss)),
            ],
          ),
        ],
      ],
    );
  }
}

class _Person extends StatelessWidget {
  const _Person(this.name, this.p, this.today);
  final String name;
  final MemberProgress? p;
  final String today;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final p = this.p;
    final days = p == null ? 0 : daysKept(p.days, today);
    final c = p == null ? null : countsFor(allItems(), p);
    return Container(
      decoration: BoxDecoration(border: Border(top: BorderSide(color: k.line))),
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: serif(20, weight: FontWeight.w600, color: k.ink)),
          const SizedBox(height: 4),
          if (p == null)
            Text('No lessons yet.', style: sans(15, color: k.muted))
          else ...[
            Text('$days ${days == 1 ? 'day' : 'days'} kept · ${p.lessons} ${p.lessons == 1 ? 'lesson' : 'lessons'} · ${p.units.length} learned', style: sans(15, color: k.ink)),
            if (c != null)
              Text(
                '${tiers[1].name} ${c.know} · ${tiers[2].name} ${c.memorized} · ${tiers[3].name} ${c.mastered} · ${tiers[4].name} ${c.longTerm}',
                style: sans(14, color: k.muted),
              ),
          ],
        ],
      ),
    );
  }
}

class _Danger extends StatelessWidget {
  const _Danger(this.label, this.k, this.onTap);
  final String label;
  final KColors k;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: k.miss,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          onTap: onTap,
          child: SizedBox(height: KSize.buttonHeight, child: Center(child: Text(label, style: sans(16, weight: FontWeight.w600, color: k.card, height: 1)))),
        ),
      );
}
