import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/app.dart';
import 'package:katekize/state/auth.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/state/clock.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';
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
  Future<void> signOut() async {
    _email = null;
    _changes.add(null);
  }
}

/// The whole app at a fixed time (a Tuesday afternoon), on an iPhone-sized screen, with a fake sign-in.
Future<void> pumpApp(WidgetTester tester, {FakeAuth? auth, Store? store, SocialApi? social}) async {
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
        clockProvider.overrideWithValue(() => DateTime(2026, 11, 24, 14)),
      ],
      child: KatekizeApp(now: DateTime(2026, 11, 24, 14)),
    ),
  );
  await tester.pumpAndSettle();
}

/// A people database in memory: one profile, some taken usernames, and linked accounts.
class FakeSocial implements SocialApi {
  FakeSocial({this.profile, this.taken = const {'katie'}, List<LinkedAccount>? linked}) : linked = linked ?? [];
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

  @override
  Future<void> acceptInvite(String code) async {}

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

  var statsAsked = 0;

  @override
  Future<void> refreshStats() async => statsAsked++;
}
