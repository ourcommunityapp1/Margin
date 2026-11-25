// The household and everyone's progress, kept on the phone (ui/provider.tsx's household and progress state).
// Every change is written straight away under the website's keys, so closing the app loses nothing.
//
// Not here yet: carrying the household and progress to the signed-in account and merging them back
// (loadRemote / saveRemote / mergeProgress in ui/cloud.ts). It comes next; the engine's mergeProgress is ready.

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/household.dart';
import '../data/store.dart';
import '../engine/progress.dart';
import '../engine/types.dart';
import 'sync.dart';

const householdKey = 'heir-household-v1';
const progressKey = 'heir-progress-v1';

/// Where things are kept. The app overrides this with the phone's storage at start-up.
final storeProvider = Provider<Store>((ref) => MemoryStore());

class HouseholdNotifier extends Notifier<Household> {
  @override
  Household build() => parseHousehold(ref.read(storeProvider).read(householdKey));

  void update(Household Function(Household) change) {
    final next = change(state);
    state = next;
    ref.read(storeProvider).write(householdKey, householdToJson(next));
    ref.read(syncProvider.notifier).householdChanged(next);
  }

  /// Sets the household from the account (kept on the phone, but not sent back).
  void replaceFromRemote(Household h) {
    state = h;
    ref.read(storeProvider).write(householdKey, householdToJson(h));
  }
}

final householdProvider = NotifierProvider<HouseholdNotifier, Household>(HouseholdNotifier.new);

class ProgressNotifier extends Notifier<Progress> {
  @override
  Progress build() => parseProgress(ref.read(storeProvider).read(progressKey));

  void update(Progress Function(Progress) change) {
    final next = change(state);
    state = next;
    ref.read(storeProvider).write(progressKey, jsonEncode({for (final e in next.entries) e.key: e.value.toJson()}));
    ref.read(syncProvider.notifier).progressChanged();
  }

  /// Sets progress from the account (kept on the phone, but not sent back).
  void replaceFromRemote(Progress p) {
    state = p;
    ref.read(storeProvider).write(progressKey, jsonEncode({for (final e in p.entries) e.key: e.value.toJson()}));
  }
}

final progressProvider = NotifierProvider<ProgressNotifier, Progress>(ProgressNotifier.new);

/// The person using the app.
class Me {
  const Me({required this.id, required this.name, required this.track});
  final String id, name;
  final Track track;

  /// The first word of the name, for the greeting ("Good evening, Landon").
  String get firstName => name.trim().split(RegExp(r'\s+')).first;

  /// The initial shown on the You button.
  String get initial => name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
}

/// The active person, or null before anyone has been added.
final meProvider = Provider<Me?>((ref) {
  final m = activeMember(ref.watch(householdProvider));
  return m == null ? null : Me(id: m.id, name: m.name, track: m.track);
});

/// This person's progress.
final myProgressProvider = Provider<MemberProgress>((ref) => memberProgress(ref.watch(progressProvider), ref.watch(meProvider)?.id));
