// People removed from this phone's family, and the saved progress left behind, so a removed person can be brought back
// with the right name (src/app/heir/ui/removed.ts and src/heir/recover.ts). Kept only on this phone.

import 'dart:convert';

import '../engine/progress.dart';
import '../engine/types.dart';
import 'household.dart';
import 'store.dart';

const removedKey = 'heir-removed-v1';

class Gone {
  const Gone({required this.id, required this.name, required this.track});
  final String id, name;
  final Track track;
}

List<Gone> readRemoved(Store store) {
  try {
    final v = jsonDecode(store.read(removedKey) ?? '[]');
    if (v is! List) return const [];
    return [
      for (final g in v)
        if (g is Map && g['id'] is String && g['name'] is String) Gone(id: g['id'] as String, name: g['name'] as String, track: g['track'] == 'child' ? Track.child : Track.adult),
    ];
  } catch (_) {
    return const [];
  }
}

/// Remembers a removed person (the latest twenty), newest first.
Future<void> rememberRemoved(Store store, Member m) {
  final list = [Gone(id: m.id, name: m.name, track: m.track), ...readRemoved(store).where((g) => g.id != m.id)].take(20);
  return store.write(removedKey, jsonEncode([for (final g in list) {'id': g.id, 'name': g.name, 'track': trackName(g.track)}]));
}

/// Saved progress that no longer belongs to anyone in the family.
class Orphan {
  const Orphan({required this.id, required this.lessons, required this.units, required this.days, required this.stones});
  final String id;
  final int lessons, units, days, stones;
}

List<Orphan> orphanedProgress(Progress p, List<Member> members) {
  final here = members.map((m) => m.id).toSet();
  final out = [
    for (final e in p.entries)
      if (!here.contains(e.key) && (e.value.lessons > 0 || e.value.units.isNotEmpty || e.value.days.isNotEmpty || e.value.log.isNotEmpty))
        Orphan(id: e.key, lessons: e.value.lessons, units: e.value.units.length, days: e.value.days.length, stones: e.value.levels.values.where((n) => n > 0).length),
  ];
  out.sort((a, b) => b.lessons != a.lessons ? b.lessons - a.lessons : b.units - a.units);
  return out;
}
