// Where each verse and answer stands for the keeping rules, for the person using the app (ui/keep.ts useKeep).

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../engine/content.dart';
import '../engine/keep.dart';
import 'clock.dart';
import 'household.dart';

final keepProvider = Provider<KeepSummary?>((ref) {
  final me = ref.watch(meProvider);
  if (me == null) return null;
  final mine = ref.watch(myProgressProvider);
  final now = ref.watch(clockProvider)();
  return summarize(heldItems(allItems(), mine, me.track, now, KeepOptions(launch: keepLaunch, tz: null)));
});
