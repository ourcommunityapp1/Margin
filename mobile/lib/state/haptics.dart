// Whether the phone vibrates (You → Vibration). Kept on this phone only; on by default.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../platform/haptics.dart';
import 'household.dart';

const hapticsKey = 'hr-haptics';

class HapticsOn extends Notifier<bool> {
  @override
  bool build() {
    final on = ref.read(storeProvider).read(hapticsKey) != 'off';
    Haptics.enabled = on;
    return on;
  }

  void set(bool on) {
    ref.read(storeProvider).write(hapticsKey, on ? 'on' : 'off');
    Haptics.enabled = on;
    state = on;
    if (on) Haptics.select();
  }
}

final hapticsOnProvider = NotifierProvider<HapticsOn, bool>(HapticsOn.new);
