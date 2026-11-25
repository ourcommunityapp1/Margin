// The app: the theme, the background behind every screen, the screens and the tab bar.
// Paths mirror the website's (ADR-0006): /today, /courses, /progress, /friends, /you, /signin, /welcome, /start.

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'features/about/about_screen.dart';
import 'features/courses/course_screen.dart';
import 'features/courses/courses_screen.dart';
import 'features/friends/community_screen.dart';
import 'features/friends/friends_screen.dart';
import 'features/friends/invite_screen.dart';
import 'features/friends/join_screen.dart';
import 'features/friends/person_screen.dart';
import 'features/friends/requests_screen.dart';
import 'features/item/item_screen.dart';
import 'features/lesson/session_screen.dart';
import 'features/onboarding/start_screen.dart';
import 'features/window/window_view_screen.dart';
import 'features/you/family_screen.dart';
import 'features/you/how_screen.dart';
import 'features/you/plan_screen.dart';
import 'features/onboarding/welcome_screen.dart';
import 'features/progress/progress_screen.dart';
import 'features/signin/signin_screen.dart';
import 'features/you/delete_account_screen.dart';
import 'features/you/linked_screen.dart';
import 'features/you/profile_screen.dart';
import 'features/you/reminders_screen.dart';
import 'features/today/today_screen.dart';
import 'features/you/you_screen.dart';
import 'platform/links.dart';
import 'state/auth.dart';
import 'state/board.dart';
import 'state/reminders.dart';
import 'state/household.dart';
import 'state/sync.dart';
import 'ui/background.dart';
import 'ui/tab_bar.dart';
import 'ui/theme.dart';
import 'ui/widgets.dart';

class KatekizeApp extends ConsumerStatefulWidget {
  const KatekizeApp({super.key, this.now});

  /// A fixed time for the background and greeting, for tests and screenshots.
  final DateTime? now;

  @override
  ConsumerState<KatekizeApp> createState() => _KatekizeAppState();
}

class _KatekizeAppState extends ConsumerState<KatekizeApp> with WidgetsBindingObserver {
  DateTime? get now => widget.now;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Start keeping the phone and the account together (a no-op without accounts or when signed out).
    ref.read(syncProvider);
    ref.read(boardProvider);
    // Keep reminders matching what is already done today.
    ref.read(remindersProvider);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Back on the app (another phone may have saved a lesson): bring the account's progress in.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(syncProvider.notifier).refresh();
      ref.read(boardProvider.notifier).check();
      ref.read(remindersProvider.notifier).sync();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Katekize',
      debugShowCheckedModeBanner: false,
      theme: katekizeTheme(),
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
        // Light status bar text over the dark frame, on both platforms.
        value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
        child: Stack(
          fit: StackFit.expand,
          children: [
            KBackground(now: now),
            if (child != null) child,
          ],
        ),
      ),
    );
  }
}

/// Screens that need a name first; without one the app goes to Welcome.
const _needsSomeone = ['/today', '/courses', '/progress', '/friends', '/you', '/lesson', '/item', '/window', '/plan', '/family', '/how', '/profile', '/linked', '/u', '/invite', '/community', '/reminders', '/join', '/delete-account'];

final routerProvider = Provider<GoRouter>((ref) {
  // go_router asks again whenever the person or the sign-in changes.
  final refresh = ValueNotifier(0);
  ref.listen(householdProvider, (_, _) => refresh.value++);
  ref.listen(emailProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/today',
    refreshListenable: refresh,
    redirect: (context, state) {
      // A link to the website's page (katekize.com/heir/...): open the matching screen in the app.
      final site = appPathForWebsite(state.uri);
      if (site != null) return site;
      final path = state.uri.path;
      final h = ref.read(householdProvider);
      final someone = h.members.isNotEmpty;
      if (!someone && _needsSomeone.any(path.startsWith)) return '/welcome';
      // Someone is added but has not chosen a course yet: finish setting up. Once set up, there is no going back to it.
      if (someone && h.plan == null && path.startsWith('/today')) return '/start';
      if (someone && h.plan != null && path == '/start') return '/today';
      if (path.startsWith('/friends') && ref.read(emailProvider).value == null) return '/today';
      if (path == '/delete-account' && ref.read(emailProvider).value == null) return '/you';
      // Someone's profile or a friend's invite: sign in first, then come back here.
      if ((path.startsWith('/u/') || path == '/invite' || path == '/join') && ref.read(emailProvider).value == null) return '/signin?next=${Uri.encodeComponent(state.uri.toString())}';
      return null;
    },
    routes: [
      GoRoute(path: '/', redirect: (_, _) => '/today'),
      GoRoute(path: '/welcome', pageBuilder: (_, s) => _fade(s, const WelcomeScreen())),
      GoRoute(path: '/start', pageBuilder: (_, s) => _fade(s, const StartScreen())),
      GoRoute(
        path: '/signin',
        pageBuilder: (_, s) => _fade(s, SignInScreen(next: s.uri.queryParameters['next'] ?? '/today')),
      ),
      GoRoute(path: '/you', pageBuilder: (_, s) => _fade(s, const YouScreen())),
      GoRoute(
        path: '/window/:id',
        pageBuilder: (_, s) => _fade(s, WindowViewScreen(courseId: s.pathParameters['id']!, part: int.tryParse(s.uri.queryParameters['part'] ?? ''))),
      ),
      GoRoute(path: '/plan', pageBuilder: (_, s) => _fade(s, const PlanScreen())),
      GoRoute(path: '/profile', pageBuilder: (_, s) => _fade(s, ProfileScreen(next: s.uri.queryParameters['next']))),
      GoRoute(path: '/friends/requests', pageBuilder: (_, s) => _fade(s, const RequestsScreen())),
      GoRoute(path: '/u/:username', pageBuilder: (_, s) => _fade(s, PersonScreen(username: s.pathParameters['username']!))),
      GoRoute(path: '/invite', pageBuilder: (_, s) => _fade(s, InviteScreen(code: s.uri.queryParameters['code'] ?? ''))),
      GoRoute(path: '/join', pageBuilder: (_, s) => _fade(s, JoinScreen(code: s.uri.queryParameters['code'] ?? ''))),
      GoRoute(path: '/community', pageBuilder: (_, s) => _fade(s, const CommunityScreen())),
      GoRoute(path: '/delete-account', pageBuilder: (_, s) => _fade(s, const DeleteAccountScreen())),
      GoRoute(path: '/reminders', pageBuilder: (_, s) => _fade(s, const RemindersScreen())),
      GoRoute(path: '/linked', pageBuilder: (_, s) => _fade(s, const LinkedScreen())),
      GoRoute(path: '/family', pageBuilder: (_, s) => _fade(s, const FamilyScreen())),
      GoRoute(path: '/how', pageBuilder: (_, s) => _fade(s, const HowScreen())),
      GoRoute(path: '/about', pageBuilder: (_, s) => _fade(s, const AboutScreen())),
      GoRoute(
        path: '/lesson',
        pageBuilder: (_, s) {
          final q = s.uri.queryParameters;
          return _fade(
            s,
            SessionScreen(
              mode: q['mode'] ?? (q['item'] != null ? 'item' : 'lesson'),
              courseId: q['course'],
              cardId: q['card'],
              itemIds: (q['items'] ?? '').split(',').where((x) => x.isNotEmpty).toList(),
              itemId: q['item'],
            ),
          );
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _TabShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/today', builder: (_, _) => const TodayScreen())]),
          // Courses, one course and one item share a branch, so the tab bar stays up on all three (as on the website).
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/courses',
              builder: (_, _) => const CoursesScreen(),
              routes: [GoRoute(path: ':id', builder: (_, s) => CourseScreen(id: s.pathParameters['id']!))],
            ),
            GoRoute(path: '/item/:id', builder: (_, s) => ItemScreen(id: s.pathParameters['id']!)),
          ]),
          StatefulShellBranch(routes: [GoRoute(path: '/progress', builder: (_, _) => const ProgressScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/friends', builder: (_, _) => const FriendsScreen())]),
        ],
      ),
    ],
  );
});

/// Screens swap with a short fade over the shared background, as the website's pages do.
CustomTransitionPage<void> _fade(GoRouterState state, Widget child) => CustomTransitionPage(
      key: state.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 200),
      reverseTransitionDuration: const Duration(milliseconds: 200),
      transitionsBuilder: (_, animation, _, child) => FadeTransition(opacity: animation, child: child),
    );

const _tabs = [
  KTab('Today', KIcons.today),
  KTab('Courses', KIcons.courses),
  KTab('Progress', KIcons.progress),
  KTab('Friends', KIcons.friends),
];

/// The four tab screens with the floating tab bar over them. Friends shows only once signed in.
class _TabShell extends ConsumerWidget {
  const _TabShell({required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(accountsProvider) && ref.watch(emailProvider).value != null;
    final tabs = signedIn ? _tabs : _tabs.sublist(0, 3);
    return Material(
      type: MaterialType.transparency,
      child: Stack(
        children: [
          Positioned.fill(child: shell),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: KTabBar(
              tabs: tabs,
              current: shell.currentIndex,
              dots: {if (signedIn && (ref.watch(boardProvider)?.alert ?? false)) 2: 'Your place on the leaderboard changed'},
              onTap: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            ),
          ),
        ],
      ),
    );
  }
}
