// Friend requests (src/app/heir/ui/social.tsx RequestsScreen): ones for you to answer, and ones you sent.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;
import 'avatar.dart';

class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key});

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  ({List<RequestRow> incoming, List<RequestRow> outgoing})? _data;
  String _error = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      final d = await api.listRequests();
      if (mounted) setState(() => _data = d);
    } catch (_) {
      if (mounted) setState(() => _error = 'Couldn’t load requests. Check your connection.');
    }
  }

  Future<void> _run(Future<void> Function(SocialApi api) fn) async {
    try {
      await fn(ref.read(socialApiProvider)!);
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = e is SocialFailure ? e.message : 'Something went wrong. Try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final d = _data;
    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/friends')))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Semantics(header: true, child: Text('Friend requests', style: serif(30, weight: FontWeight.w500, color: k.ink)))),
        if (_error.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(_error, style: sans(15, color: k.miss))),
        KCard.column(
          gap: 14,
          children: [
            KLabel('For you${d == null ? '' : ' · ${d.incoming.length}'}'),
            if (d != null && d.incoming.isEmpty) Text('No requests right now.', style: sans(16, color: k.muted)),
            for (final r in d?.incoming ?? const <RequestRow>[])
              Container(
                decoration: BoxDecoration(border: Border(top: BorderSide(color: k.line))),
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    InkWell(
                      onTap: () => context.push('/u/${Uri.encodeComponent(r.username)}'),
                      child: Row(
                        children: [
                          KAvatar(r.name),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r.name, style: sans(16, weight: FontWeight.w700, color: k.ink)),
                                Text('@${r.username}${place(r.city, r.region).isEmpty ? '' : ' · ${place(r.city, r.region)}'}', style: sans(13, color: k.muted)),
                                Text('${friendsCount(r.friendsCount)}${r.mutual > 0 ? ' · ${r.mutual} in common' : ''}', style: sans(13, color: k.muted)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: WellButton('Not now', onPressed: () => _run((api) => api.answerRequest(r.id, false)))),
                        const SizedBox(width: 10),
                        Expanded(child: KButton('Accept', onPressed: () => _run((api) => api.answerRequest(r.id, true)))),
                      ],
                    ),
                  ],
                ),
              ),
            if (d != null && d.incoming.isNotEmpty) Text('“Not now” doesn’t tell them.', style: sans(13, color: k.muted)),
          ],
        ),
        if (d != null && d.outgoing.isNotEmpty)
          KCard.column(
            gap: 10,
            children: [
              KLabel('You sent · ${d.outgoing.length}'),
              for (final r in d.outgoing)
                Row(
                  children: [
                    KAvatar(r.name, size: 32),
                    const SizedBox(width: 12),
                    Expanded(child: Text(r.name, style: sans(16, color: k.ink))),
                    InkWell(onTap: () => _run((api) => api.cancelRequest(r.id)), child: const KTag('Cancel')),
                  ],
                ),
            ],
          ),
      ],
    );
  }
}
