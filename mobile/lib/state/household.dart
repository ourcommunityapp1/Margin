// The person using the app, for now just their name.
//
// PLACEHOLDER: the real household (members, tracks, plan) comes from the engine's household rules and on-phone
// storage (src/heir/household.ts, ui/provider.tsx) once they are ported. Until then the name lives in memory only,
// so the app starts at Welcome each time it is opened.

import 'package:flutter_riverpod/flutter_riverpod.dart';

class Me {
  const Me(this.name);
  final String name;

  /// The first word of the name, for the greeting ("Good evening, Landon").
  String get firstName => name.trim().split(RegExp(r'\s+')).first;

  /// The initial shown on the You button.
  String get initial => name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
}

class MeNotifier extends Notifier<Me?> {
  @override
  Me? build() => null;

  void setName(String name) => state = Me(name.trim());
}

/// The person using the app, or null before they have said their name.
final meProvider = NotifierProvider<MeNotifier, Me?>(MeNotifier.new);
