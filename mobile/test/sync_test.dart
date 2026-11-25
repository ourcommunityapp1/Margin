import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/account.dart';
import 'package:katekize/data/config.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/data/sync_rules.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' as lesson;
import 'package:katekize/engine/memory.dart' show Cal;
import 'package:katekize/engine/models.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/auth.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';

import 'engine/content_loader.dart';
import 'widget/fakes.dart' show FakeAuth;

/// A fake account database that remembers every write, so tests can prove what was (and was not) written.
class FakeApi implements AccountApi {
  FakeApi({this.remote, this.rows = const {}, this.fail = false});
  RemoteHousehold? remote;
  Map<String, MemberProgress> rows;
  bool fail;
  final writes = <String>[];

  @override
  Future<RemoteHousehold?> loadRemote() async {
    if (fail) throw Exception('no network');
    return remote;
  }

  @override
  Future<Map<String, MemberProgress>> loadProgressRows(String householdId) async => rows;

  @override
  Future<({Cal? population, Cal? person})> loadCalibration(String? memberId) async => (population: null, person: null);

  @override
  Future<RemoteHousehold> saveRemote(Household h, RemoteHousehold? known) async {
    writes.add('household');
    final id = known?.householdId ?? 'hh-new';
    final r = toRows(h, id);
    return remote = RemoteHousehold(householdId: id, household: h, memberRows: r.members);
  }

  @override
  Future<Map<String, MemberProgress>> saveProgressRows(String householdId, Map<String, MemberProgress> mine) async {
    writes.add('progress:${mine.keys.join(',')}');
    return rows = {...rows, ...mine};
  }
}

RemoteHousehold _account(String name, String id) {
  final h = setPlan(addMember(emptyHousehold(), name, Track.adult, id, DateTime.utc(2026, 11, 1)), const Plan(course: 'gospel', minutes: 25));
  return RemoteHousehold(householdId: 'hh-1', household: h, memberRows: toRows(h, 'hh-1').members);
}

/// Progress after one lesson of Q1 at [at].
MemberProgress _lesson(DateTime at) {
  final item = getItem('wsc-1')!;
  final unit = lesson.unitsFor(item, Track.adult).first;
  return finishSession(
    emptyProgress(),
    results: [StepResult(itemId: item.id, kind: 'type', correct: true, hints: 0, ms: 9000, review: false, words: 11)],
    learned: [unit],
    courseId: 'westminster-shorter',
    now: at,
    grading: 'v2',
    keepRules: (tz: null),
  );
}

ProviderContainer _container(FakeApi? api, {bool writes = false, Store? store, String? email = 'ann@example.com'}) {
  final c = ProviderContainer(overrides: [
    storeProvider.overrideWithValue(store ?? MemoryStore()),
    authProvider.overrideWithValue(FakeAuth(email: email)),
    accountApiProvider.overrideWithValue(api),
    syncWritesProvider.overrideWithValue(writes),
  ]);
  addTearDown(c.dispose);
  return c;
}

Future<void> _settle() => Future<void>.delayed(const Duration(milliseconds: 1000));

void main() {
  loadTestContent();

  test('saving to the account is on by default (and off only when a build says so)', () {
    expect(Config.syncWrites, isTrue);
    expect(ProviderContainer().read(syncWritesProvider), isTrue);
  });

  group('read-only (the default): the account is read, never written', () {
    test('an account that already has a family replaces what is on the phone, and its progress is merged in', () async {
      final api = FakeApi(remote: _account('Landon', 'm-1'), rows: {'m-1': _lesson(DateTime.utc(2026, 11, 2, 10))});
      final c = _container(api, store: MemoryStore());
      // The phone has someone else, with a lesson of their own.
      c.read(householdProvider.notifier).replaceFromRemote(addMember(emptyHousehold(), 'Phone person', Track.adult, 'm-local', DateTime.utc(2026, 11, 3)));
      await c.read(syncProvider.notifier).arrive('ann@example.com');

      expect(c.read(householdProvider).members.map((m) => m.name), ['Landon'], reason: 'the account’s family wins');
      expect(c.read(householdProvider).plan!.course, 'gospel');
      expect(c.read(progressProvider)['m-1']!.log, isNotEmpty, reason: 'the account’s lessons are brought in');
      expect(c.read(syncProvider).state, SyncState.synced);
      expect(c.read(syncProvider).summary, contains('Landon'));
      expect(api.writes, isEmpty, reason: 'nothing written to the account');
    });

    test('a family only on the phone is not uploaded, and the phone says so', () async {
      final api = FakeApi();
      final store = MemoryStore();
      final c = _container(api, store: store);
      c.read(householdProvider.notifier).replaceFromRemote(addMember(emptyHousehold(), 'Ann', Track.adult, 'm-1', DateTime.utc(2026, 11, 3)));
      await c.read(syncProvider.notifier).arrive('ann@example.com');

      expect(api.writes, isEmpty);
      expect(c.read(syncProvider).state, SyncState.local);
      expect(c.read(syncProvider).note, contains('switched off'));
      expect(c.read(householdProvider).members.single.name, 'Ann', reason: 'the phone’s family is untouched');
    });

    test('changes on the phone are kept on the phone only', () async {
      final api = FakeApi(remote: _account('Landon', 'm-1'));
      final c = _container(api);
      await c.read(syncProvider.notifier).arrive('ann@example.com');
      c.read(progressProvider.notifier).update((p) => {...p, 'm-1': _lesson(DateTime.utc(2026, 11, 4))});
      c.read(householdProvider.notifier).update((h) => setPlan(h, const Plan(course: 'psalm-23')));
      await _settle();
      expect(api.writes, isEmpty);
      expect(c.read(progressProvider)['m-1']!.log, isNotEmpty);
    });

    test('an unreachable account leaves the phone as it was', () async {
      final api = FakeApi(remote: _account('Landon', 'm-1'), fail: true);
      final c = _container(api);
      c.read(householdProvider.notifier).replaceFromRemote(addMember(emptyHousehold(), 'Ann', Track.adult, 'm-1', DateTime.utc(2026, 11, 3)));
      await c.read(syncProvider.notifier).arrive('ann@example.com');
      expect(c.read(syncProvider).state, SyncState.offline);
      expect(c.read(householdProvider).members.single.name, 'Ann');
    });

    test('signed out: nothing is read or written', () async {
      final api = FakeApi(remote: _account('Landon', 'm-1'));
      final c = _container(api, email: null);
      await c.read(syncProvider.notifier).arrive(null);
      expect(c.read(syncProvider).state, SyncState.local);
      expect(api.writes, isEmpty);
    });
  });

  group('when writing is switched on', () {
    test('a family only on the phone is carried up, once', () async {
      final api = FakeApi();
      final c = _container(api, writes: true);
      c.read(householdProvider.notifier).replaceFromRemote(addMember(emptyHousehold(), 'Ann', Track.adult, 'm-1', DateTime.utc(2026, 11, 3)));
      await c.read(syncProvider.notifier).arrive('ann@example.com');
      expect(api.writes, ['household']);
      expect(c.read(syncProvider).state, SyncState.synced);
    });

    test('a lesson done on the phone is saved to the account, merged with what is there', () async {
      final api = FakeApi(remote: _account('Landon', 'm-1'), rows: {'m-1': _lesson(DateTime.utc(2026, 11, 2, 10))});
      final c = _container(api, writes: true);
      await c.read(syncProvider.notifier).arrive('ann@example.com');
      api.writes.clear();
      final before = c.read(progressProvider)['m-1']!.log.length;
      c.read(progressProvider.notifier).update((p) => {...p, 'm-1': mergeProgress(p['m-1']!, _lesson(DateTime.utc(2026, 11, 4, 9)))});
      await _settle();
      expect(api.writes, ['progress:m-1']);
      expect(c.read(progressProvider)['m-1']!.log.length, greaterThan(before));
    });

    test('a change of course is saved to the account', () async {
      final api = FakeApi(remote: _account('Landon', 'm-1'));
      final c = _container(api, writes: true);
      await c.read(syncProvider.notifier).arrive('ann@example.com');
      api.writes.clear();
      c.read(householdProvider.notifier).update((h) => setPlan(h, const Plan(course: 'psalm-23')));
      await _settle();
      expect(api.writes, ['household']);
    });
  });

  test('progress from two phones is merged, not overwritten', () async {
    final theirs = _lesson(DateTime.utc(2026, 11, 2, 10));
    final api = FakeApi(remote: _account('Landon', 'm-1'), rows: {'m-1': theirs});
    final c = _container(api, store: MemoryStore());
    final mine = _lesson(DateTime.utc(2026, 11, 5, 8));
    c.read(progressProvider.notifier).replaceFromRemote({'m-1': mine});
    await c.read(syncProvider.notifier).arrive('ann@example.com');
    final merged = c.read(progressProvider)['m-1']!;
    expect(merged.log.length, mergeProgress(theirs, mine).log.length);
    expect(merged.days.toSet().containsAll({...theirs.days, ...mine.days}), isTrue, reason: 'both days are kept');
  });

  group('the rules', () {
    test('household rows and back', () {
      final h = setPlan(addMember(emptyHousehold(), 'Ann', Track.child, 'a', DateTime.utc(2026, 1, 1)), const Plan(course: 'gospel', minutes: 15));
      final r = toRows(h, 'hh');
      final back = fromRows(r.household, r.members);
      expect(back.members.single.name, 'Ann');
      expect(back.members.single.track, Track.child);
      expect(back.plan!.course, 'gospel');
      expect(back.activeMemberId, 'a');
    });

    test('sign-in chooses the account’s family when it has one, else uploads the phone’s', () {
      final local = addMember(emptyHousehold(), 'Phone', Track.adult, 'p', DateTime.utc(2026, 1, 1));
      final remote = addMember(emptyHousehold(), 'Account', Track.adult, 'r', DateTime.utc(2026, 1, 1));
      expect(chooseOnSignIn(local, remote).household.members.single.name, 'Account');
      expect(chooseOnSignIn(local, remote).upload, isFalse);
      expect(chooseOnSignIn(local, null).upload, isTrue);
      expect(chooseOnSignIn(local, emptyHousehold()).upload, isTrue);
      expect(chooseOnSignIn(emptyHousehold(), null).upload, isFalse);
    });

    test('a removed person is found by what is gone from the household', () {
      final h = addMember(emptyHousehold(), 'Keep', Track.adult, 'k', DateTime.utc(2026, 1, 1));
      final before = [
        MemberRow(id: 'k', householdId: 'hh', name: 'Keep', track: 'adult', createdAt: 'x'),
        MemberRow(id: 'g', householdId: 'hh', name: 'Gone', track: 'adult', createdAt: 'x'),
      ];
      expect(removedMemberIds(before, h), ['g']);
    });

    test('answers become rows: only those with an id, oldest first after the last one sent', () {
      final p = _lesson(DateTime.utc(2026, 11, 2, 10));
      final rows = toAnswerRows('hh', 'm', p.log);
      expect(rows, hasLength(p.log.where((e) => e.id != null).length));
      expect(rows.first['household_id'], 'hh');
      expect(rows.first['member_id'], 'm');
      expect(rows.first.keys, containsAll(['id', 'item_id', 'kind', 'correct', 'hints', 'ms', 'review', 'session_at', 'local_day']));
      expect(unsent(p.log, ''), hasLength(p.log.length));
      expect(unsent(p.log, p.log.last.at), isEmpty, reason: 'nothing newer than the newest sent');
    });
  });
}
