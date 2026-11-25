// The app: the theme, the background behind every screen, the screens and the tab bar.
// Paths mirror the website's (ADR-0006): /today, /courses, /progress, /friends, /you, /signin, /welcome, /start.

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'features/courses/course_screen.dart';
import 'features/courses/courses_screen.dart';
import 'features/friends/friends_screen.dart';
import 'features/item/item_screen.dart';
import 'features/onboarding/start_screen.dart';
import 'features/onboarding/welcome_screen.dart';
import 'features/progress/progress_screen.dart';
import 'features/signin/signin_screen.dart';
import 'features/today/today_screen.dart';
import 'features/you/you_screen.dart';
import 'state/auth.dart';
import 'state/household.dart';
import 'ui/background.dart';
import 'ui/tab_bar.dart';
import 'ui/theme.dart';
import 'ui/widgets.dart';

class KatekizeApp extends ConsumerWidget {
  const KatekizeApp({super.key, this.now});

  /// A fixed time for the background and greeting, for tests and screenshots.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
const _needsSomeone = ['/today', '/courses', '/progress', '/friends', '/you'];

final routerProvider = Provider<GoRouter>((ref) {
  // go_router asks again whenever the person or the sign-in changes.
  final refresh = ValueNotifier(0);
  ref.listen(meProvider, (_, _) => refresh.value++);
  ref.listen(emailProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/today',
    refreshListenable: refresh,
    redirect: (context, state) {
      final path = state.uri.path;
      final someone = ref.read(meProvider) != null;
      if (!someone && _needsSomeone.any(path.startsWith)) return '/welcome';
      if (path.startsWith('/friends') && ref.read(emailProvider).value == null) return '/today';
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
              onTap: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            ),
          ),
        ],
      ),
    );
  }
}
