import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/app.dart';
import 'package:katekize/state/auth.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/state/clock.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';
import 'package:katekize/platform/share.dart';
import 'package:katekize/data/verses.dart';
import 'package:katekize/platform/speech.dart';
import 'package:katekize/platform/reminders.dart';
import 'package:katekize/state/reminders.dart';
import 'package:katekize/state/social.dart';
import 'package:katekize/data/social.dart';
import 'package:katekize/data/board.dart';
import 'package:katekize/data/content_assets.dart';
import 'package:material_ui/material_ui.dart';

/// A sign-in service that never touches the network. The right code is always 123456.
class FakeAuth implements Auth {
  FakeAuth({this.accounts = true, String? email, this.failSend = false}) : _email = email;

  @override
  final bool accounts;
  final bool failSend;
  String? _email;
  final _changes = StreamController<String?>.broadcast();
  final sent = <String>[];

  @override
  String? get email => _email;

  @override
  Stream<String?> get changes => _changes.stream;

  @override
  Future<void> sendCode(String email) async {
    if (failSend) throw const AuthFailure('no');
    sent.add(email.trim());
  }

  @override
  Future<void> verifyCode(String email, String code) async {
    if (code.trim() != '123456') throw const AuthFailure('bad code');
    _email = email.trim();
    _changes.add(_email);
  }

  @override
  Future<void> signInWithPassword(String email, String password) async {
    if (email.trim() != 'appreview@katekize.com' || password != 'review-pass') throw const AuthFailure('bad password');
    _email = email.trim();
    _changes.add(_email);
  }

  @override
  Future<void> signOut() async {
    _email = null;
    _changes.add(null);
  }
}

/// The whole app at a fixed time (a Tuesday afternoon), on an iPhone-sized screen, with a fake sign-in.
Future<void> pumpApp(WidgetTester tester, {FakeAuth? auth, Store? store, SocialApi? social, Sharer? sharer, ReminderScheduler? reminders, List<Override> overrides = const [], DateTime? now}) async {
  final at = now ?? DateTime(2026, 11, 24, 14);
  await tester.runAsync(loadBundledContent);
  tester.view.physicalSize = const Size(1206, 2622);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  // As if "reduce motion" is on: the light moving behind unstarted windows stands still, so the screen can settle.
  tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
  addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authProvider.overrideWithValue(auth ?? FakeAuth()),
        storeProvider.overrideWithValue(store ?? MemoryStore()),
        // No real account database in these tests.
        accountApiProvider.overrideWithValue(null),
        socialApiProvider.overrideWithValue(social),
        // No share sheet in tests: links are copied instead (tests that want one pass their own).
        sharerProvider.overrideWithValue(sharer ?? const _NoShare()),
        verseApiProvider.overrideWithValue(FakeVerses()),
        // Never touch the phone's real notifications in tests.
        reminderSchedulerProvider.overrideWithValue(reminders ?? FakeScheduler()),
        clockProvider.overrideWithValue(() => at),
        ...overrides,
      ],
      child: KatekizeApp(now: at),
    ),
  );
  await tester.pumpAndSettle();
}

/// A people database in memory: one profile, some taken usernames, and linked accounts.
class FakeSocial implements SocialApi {
  FakeSocial({this.profile, this.taken = const {'katie'}, this.autoProfile = false, List<LinkedAccount>? linked}) : linked = linked ?? [];
  /// A new account: the database makes the profile when asked (heir_profile_auto).
  final bool autoProfile;
  var autoCalls = 0;
  MyProfile? profile;
  final Set<String> taken;
  final List<LinkedAccount> linked;
  final saved = <ProfileEdit>[];
  final unlinked = <String>[];
  var invites = 0;
  var deleted = false;

  @override
  Future<MyProfile?> getProfile() async => profile;

  @override
  Future<bool> ensureProfile() async {
    autoCalls++;
    if (!autoProfile || profile != null) return false;
    profile = const MyProfile(username: 'anns', firstName: 'Ann', lastName: 'Smith');
    return true;
  }

  @override
  Future<bool> usernameFree(String name) async => !taken.contains(name.toLowerCase());

  @override
  Future<MyProfile> saveProfile(ProfileEdit p) async {
    if (taken.contains(p.username.toLowerCase())) throw const SocialFailure('That username is taken.');
    saved.add(p);
    return profile = MyProfile(
      username: p.username,
      firstName: p.first,
      lastName: p.last,
      city: p.city.isEmpty ? null : p.city,
      region: p.region.isEmpty ? null : p.region,
      discoverable: p.discoverable,
      fofVisible: p.fof,
    );
  }

  @override
  Future<void> deleteProfile() async {
    deleted = true;
    profile = null;
  }

  @override
  Future<String> createInvite() async {
    invites++;
    return 'abcdef0123456789abcdef0123456789';
  }

  final joined = <String>[];

  @override
  Future<void> acceptInvite(String code) async => joined.add(code);

  @override
  Future<void> unlink(String ownerId) async {
    unlinked.add(ownerId);
    linked.removeWhere((a) => a.ownerId == ownerId);
  }

  @override
  Future<List<LinkedAccount>> loadLinked() async => [...linked];

  // Friends: a few people to find, who is a friend, and what was done.
  List<Person> people = [];
  List<FriendRow> friends = [];
  List<RequestRow> incoming = [], outgoing = [];
  final sent = <String>[], answered = <String>[], removed = <String>[], blocked = <String>[], reports = <String>[], accepted = <String>[];
  InvitePeek peek = const InvitePeek('ok', name: 'Dan', username: 'dan');
  var friendInvites = 0;

  @override
  Future<List<Person>> search(String q) async => [for (final p in people) if (p.name.toLowerCase().contains(q.toLowerCase()) || p.username.contains(q.toLowerCase())) p];

  @override
  Future<Person?> viewPerson(String username) async => people.where((p) => p.username == username).firstOrNull;

  @override
  Future<List<FriendRow>> listFriends() async => friends;

  @override
  Future<({List<RequestRow> incoming, List<RequestRow> outgoing})> listRequests() async => (incoming: incoming, outgoing: outgoing);

  @override
  Future<String> sendRequest(String username) async {
    sent.add(username);
    return 'requested';
  }

  @override
  Future<void> answerRequest(String id, bool accept) async {
    answered.add('$id:$accept');
    incoming.removeWhere((r) => r.id == id);
  }

  @override
  Future<void> cancelRequest(String id) async {
    answered.add('cancel:$id');
    outgoing.removeWhere((r) => r.id == id);
  }

  @override
  Future<void> unfriend(String username) async => removed.add(username);

  @override
  Future<void> block(String username) async => blocked.add(username);

  @override
  Future<void> report(String username, String note) async => reports.add('$username:$note');

  @override
  Future<String> createFriendInvite() async {
    friendInvites++;
    return 'f00dfeedf00dfeedf00dfeedf00dfeed';
  }

  @override
  Future<InvitePeek> peekFriendInvite(String code) async => peek;

  @override
  Future<String> acceptFriendInvite(String code) async {
    accepted.add(code);
    return peek.name ?? '';
  }

  // The board.
  Board board = const Board(period: Period.all, total: 1, rows: []);
  BoardStatus boardStatus = const BoardStatus();
  final seenPeriods = <String>[];
  Period? lastBoardPeriod;

  @override
  Future<Board> getBoard(Period period) async {
    lastBoardPeriod = period;
    return Board(period: period, total: board.total, myPlace: board.myPlace, rows: board.rows);
  }

  @override
  Future<BoardStatus> getBoardStatus() async => boardStatus;

  @override
  Future<void> markBoardSeen(Period period) async => seenPeriods.add(period.name);

  var deletes = 0;
  String? deleteFails;

  @override
  Future<void> deleteAccount() async {
    if (deleteFails != null) throw SocialFailure(deleteFails!);
    deletes++;
  }

  var statsAsked = 0;

  @override
  Future<void> refreshStats() async => statsAsked++;
}

class _NoShare implements Sharer {
  const _NoShare();

  @override
  Future<bool> share({required String title, required String text, required String url}) async => false;
}

/// A notification scheduler in memory: permission can be refused, and every schedule is kept.
class FakeScheduler implements ReminderScheduler {
  FakeScheduler({this.allow = true});
  final bool allow;
  var asked = 0;
  final plans = <List<Reminder>>[];

  List<Reminder> get current => plans.isEmpty ? const [] : plans.last;

  @override
  Future<bool> requestPermission() async {
    asked++;
    return allow;
  }

  @override
  Future<void> replaceAll(List<Reminder> items) async => plans.add(items);
}

/// A microphone that hears what a test says. [allow] false is a refused permission.
class FakeSpeech implements SpeechService {
  FakeSpeech({this.allow = true});
  final bool allow;
  var starts = 0, cancels = 0;
  void Function(String)? _onWords;
  void Function()? _onEnded;

  /// What the person says (grows, as the real thing does).
  void say(String words) => _onWords?.call(words);

  /// The recognizer stops by itself (a long pause).
  void end() {
    final f = _onEnded;
    _onEnded = null;
    f?.call();
  }

  @override
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded}) async {
    starts++;
    if (!allow) return false;
    _onWords = onWords;
    _onEnded = onEnded;
    return true;
  }

  @override
  Future<void> stop() async => end();

  @override
  Future<void> cancel() async {
    cancels++;
    _onEnded = null;
  }
}

/// The NASB from a map of item id to text; anything not in it can't be fetched.
class FakeVerses implements VerseApi {
  FakeVerses([this.texts = const {}]);
  final Map<String, String> texts;
  final asked = <String>[];

  @override
  Future<NasbVerse?> nasb(String itemId) async {
    asked.add(itemId);
    final t = texts[itemId];
    return t == null ? null : NasbVerse(t, 'NASB');
  }
}
