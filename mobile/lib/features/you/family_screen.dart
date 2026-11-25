// Family (src/app/heir/ui/family.tsx): who is memorizing on this phone. Add someone, switch who is active, change a
// person's track, remove someone (their copy stays on this phone, and they can be brought back).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart';
import '../../data/removed.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;

class FamilyScreen extends ConsumerStatefulWidget {
  const FamilyScreen({super.key});

  @override
  ConsumerState<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends ConsumerState<FamilyScreen> {
  final _name = TextEditingController();
  final Map<String, TextEditingController> _restoreName = {};
  Track _track = Track.adult;
  String? _confirmRemove;

  @override
  void dispose() {
    _name.dispose();
    for (final c in _restoreName.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _add() {
    if (_name.text.trim().isEmpty) return;
    final id = newId(), now = ref.read(clockProvider)(), name = _name.text, track = _track;
    ref.read(householdProvider.notifier).update((h) => addMember(h, name, track, id, now));
    _name.clear();
    FocusScope.of(context).unfocus();
  }

  void _remove(Member m) {
    rememberRemoved(ref.read(storeProvider), m);
    ref.read(householdProvider.notifier).update((h) => removeMember(h, m.id));
    setState(() => _confirmRemove = null);
  }

  void _restore(Orphan o, String name, Track track) {
    final now = ref.read(clockProvider)();
    ref.read(householdProvider.notifier).update((h) => addMember(h, name, track, o.id, now));
    // Their saved progress is already here: send it up with them.
    ref.read(progressProvider.notifier).update((p) => p);
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final household = ref.watch(householdProvider);
    final progress = ref.watch(progressProvider);
    final removed = ref.watch(removedProvider);
    final members = household.members;
    final orphans = orphanedProgress(progress, members);

    Widget heading(String t, {double size = 24, FontWeight w = FontWeight.w600}) => Semantics(header: true, child: Text(t, style: serif(size, weight: w, color: k.ink, height: 1.15)));

    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you')))),
        if (orphans.isNotEmpty)
          KCard.column(
            gap: 14,
            children: [
              heading('Bring back a removed person'),
              Text('This phone still holds saved progress for someone no longer in your family.', style: sans(15, color: k.muted, height: 1.5)),
              for (final o in orphans)
                Builder(builder: (context) {
                  final known = removed.where((g) => g.id == o.id).firstOrNull;
                  final ctl = _restoreName.putIfAbsent(o.id, () => TextEditingController(text: known?.name ?? ''));
                  return Container(
                    padding: const EdgeInsets.only(top: 14),
                    decoration: BoxDecoration(border: Border(top: BorderSide(color: k.line))),
                    child: ListenableBuilder(
                      listenable: ctl,
                      builder: (context, _) => Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(known?.name ?? 'Saved progress', style: sans(16, weight: FontWeight.w600, color: k.ink)),
                          const SizedBox(height: 10),
                          Text(
                            '${o.lessons} ${o.lessons == 1 ? 'lesson' : 'lessons'} · ${o.days} ${o.days == 1 ? 'day' : 'days'} kept · ${o.stones} ${o.stones == 1 ? 'stone' : 'stones'}',
                            style: sans(14, color: k.muted),
                          ),
                          const SizedBox(height: 10),
                          KTextField(controller: ctl, label: 'Name', hint: 'Name', maxLength: 40),
                          const SizedBox(height: 10),
                          KButton(
                            'Bring back ${ctl.text.trim().isEmpty ? 'this person' : ctl.text.trim()}',
                            onPressed: ctl.text.trim().isEmpty ? null : () => _restore(o, ctl.text, known?.track ?? Track.adult),
                          ),
                          for (final m in members) ...[
                            const SizedBox(height: 10),
                            WellButton('Add this progress to ${m.name}', onPressed: () => mergeProgressInto(ref, o.id, m.id)),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
            ],
          ),
        KCard.column(
          children: [
            heading('Family', size: 30, w: FontWeight.w500),
            Text(
              'Everyone gets their own pace and progress. The child track uses shorter pieces.${members.length > 1 ? ' Tap a name to make it the active person on this phone.' : ''}',
              style: sans(15, color: k.muted, height: 1.5),
            ),
            if (members.isNotEmpty)
              Column(
                children: [
                  for (final (i, m) in members.indexed)
                    Container(
                      decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: k.line))),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Semantics(
                                  button: true,
                                  selected: household.activeMemberId == m.id,
                                  child: InkWell(
                                    onTap: () => ref.read(householdProvider.notifier).update((h) => setActive(h, m.id)),
                                    child: ConstrainedBox(
                                      constraints: const BoxConstraints(minHeight: 56),
                                      child: Align(
                                        alignment: Alignment.centerLeft,
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text('${m.name}${household.activeMemberId == m.id ? ' · active' : ''}', style: sans(16, weight: FontWeight.w600, color: k.ink)),
                                            const SizedBox(height: 2),
                                            Text(m.track == Track.child ? 'Child track' : 'Adult track', style: sans(14, color: k.muted)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Semantics(
                                button: true,
                                label: 'Switch ${m.name} to the ${m.track == Track.child ? 'adult' : 'child'} track',
                                excludeSemantics: true,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(10),
                                  onTap: () => ref.read(householdProvider.notifier).update((h) => updateMember(h, m.id, track: m.track == Track.child ? Track.adult : Track.child)),
                                  child: Container(
                                    constraints: const BoxConstraints(minHeight: 36),
                                    alignment: Alignment.center,
                                    child: KTag(m.track == Track.child ? 'Child' : 'Adult'),
                                  ),
                                ),
                              ),
                              Semantics(
                                button: true,
                                label: 'Remove ${m.name}',
                                expanded: _confirmRemove == m.id,
                                excludeSemantics: true,
                                child: InkWell(
                                  customBorder: const CircleBorder(),
                                  onTap: () => setState(() => _confirmRemove = _confirmRemove == m.id ? null : m.id),
                                  child: SizedBox(width: 44, height: 44, child: Center(child: KIcon('<path d="M6 6l12 12M18 6L6 18"/>', size: 16, color: k.muted, strokeWidth: 2))),
                                ),
                              ),
                            ],
                          ),
                          if (_confirmRemove == m.id)
                            Semantics(
                              liveRegion: true,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(16)),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Text.rich(
                                      TextSpan(children: [
                                        TextSpan(text: 'Remove ${m.name}?', style: sans(15, weight: FontWeight.w700, color: k.ink, height: 1.45)),
                                        const TextSpan(text: ' Their lessons, stones and days kept are removed from your account too. A copy stays on this phone, and you can bring it back from this page.'),
                                      ]),
                                      style: sans(15, color: k.ink, height: 1.45),
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(child: _Pill('Keep ${m.name}', k.card, k.ink, () => setState(() => _confirmRemove = null))),
                                        const SizedBox(width: 10),
                                        Expanded(child: _Pill('Remove', k.miss, k.card, () => _remove(m))),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ListenableBuilder(
              listenable: _name,
              builder: (context, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const KLabel('Add someone'),
                  const SizedBox(height: 10),
                  KTextField(controller: _name, label: 'Name', hint: 'Name', maxLength: 40, textCapitalization: TextCapitalization.words, onSubmitted: (_) => _add()),
                  const SizedBox(height: 10),
                  Semantics(
                    label: 'Track',
                    child: Container(
                      decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(20)),
                      child: KSegmented<Track>(options: const {Track.adult: 'Adult track', Track.child: 'Child track'}, value: _track, onChanged: (t) => setState(() => _track = t)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  WellButton('Add', onPressed: _name.text.trim().isEmpty ? null : _add),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.label, this.bg, this.fg, this.onTap);
  final String label;
  final Color bg, fg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: bg,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          onTap: onTap,
          child: SizedBox(height: KSize.buttonHeight, child: Center(child: Text(label, textAlign: TextAlign.center, style: sans(16, weight: FontWeight.w600, color: fg, height: 1)))),
        ),
      );
}
