// Where you stand on the community board compared with when you last opened it (src/app/heir/ui/provider.tsx board state).
// null until known. It drives the dot on the Progress tab and the highlight on the Progress preview.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/board.dart';
import 'auth.dart';
import 'social.dart';

class BoardController extends Notifier<BoardStatus?> {
  @override
  BoardStatus? build() {
    // Looks when someone signs in (and at start-up when already signed in); [check] is called when the app comes back.
    ref.listen(emailProvider, (_, next) {
      if (next.value != null) {
        check();
      } else {
        state = null;
      }
    }, fireImmediately: true);
    return null;
  }

  Future<void> check() async {
    final api = ref.read(socialApiProvider);
    if (api == null || ref.read(emailProvider).value == null) return;
    try {
      final s = await api.getBoardStatus();
      state = s;
    } catch (_) {/* the dot is a convenience */}
  }

  /// The board was opened: forget the alert.
  void seen() => state = state?.seen();
}

final boardProvider = NotifierProvider<BoardController, BoardStatus?>(BoardController.new);

/// The "all time" board for the Progress preview. Null when there is no profile or the board can't be read.
final previewBoardProvider = FutureProvider.autoDispose<Board?>((ref) async {
  final api = ref.watch(socialApiProvider);
  if (api == null) return null;
  try {
    return await api.getBoard(Period.all);
  } catch (_) {
    return null;
  }
});
