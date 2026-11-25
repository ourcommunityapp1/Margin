# Handoff for a new Claude session

Read this first, then `AI_GUIDE.md` and `README.md` in this folder.

## The project
- **Katekize**: a family Scripture, catechism and creed memorization app. The website (Next.js) is live at katekize.com.
  The phone app is a Flutter rewrite in `mobile/` (iPhone and Android). **Never name that folder `app/`:** Next.js
  treats a top-level `app/` as the website's pages and every page of katekize.com would return 404.
- **Repo:** github.com/ourcommunityapp1/Margin. **Work on branch `claude/sleepy-goldberg-gjg4bh`** (PR #1). Pull before
  starting; commit and push often. Another Claude session (in the cloud) is working on the same branch.
- **The owner is not technical.** Explain in plain words, ask before anything needing a password, never ask for secrets
  in chat.

## Who does what right now
- **Cloud session:** ports the engine in `mobile/lib/engine/` (pure Dart), proved identical to the website's TypeScript
  engine in `src/heir/` by shared test files in `fixtures/engine/`. Don't edit `mobile/lib/engine/`, `mobile/test/engine/`,
  `fixtures/` or `scripts/export-*.ts` from the Mac session, to avoid clashes.
- **Mac session:** the screens and the app around the engine: `mobile/lib/ui/`, `features/`, `state/`, `data/`,
  `app.dart`, `main.dart`, `mobile/test/widget/`, `mobile/test/session_test.dart`, `mobile/test/household_test.dart`,
  and the iOS project. It reads the engine; it never edits it. If a screen needs an engine change, ask the cloud
  session (or change both with a fixture).
- The Mac has Flutter 3.50 (`brew install --cask flutter`), CocoaPods and Xcode 27; `flutter doctor` is green apart from
  Android. The app runs in the iPhone 18 Pro simulator: `cd mobile && flutter build ios --simulator --debug`, then
  install `build/ios/iphonesimulator/Runner.app` (`xcrun simctl install` / `launch com.katekize.katekize`).

## Status (Nov 25, 2026)
- Phase 1 (engine) is done: the whole engine is in `mobile/lib/engine/` and matches the website on every shared case
  (see the parity table in AI_GUIDE.md). Phase 2 (first slice of screens) can use it. Load content first with
  `loadContent(jsonDecode(await rootBundle.loadString('assets/content/content.json')))`.
- Phase 2 (screens) has started on the Mac: see the checklist in AI_GUIDE.md. What runs today: welcome, first-run setup,
  sign-in (untried against the real server), Today (one card for the next lesson), Courses, a course, an item, the
  lesson player with every step kind, saved progress, You. 37 tests pass (`TZ=America/Chicago flutter test`).
- Content export: `node scripts/export-content.ts` → `mobile/assets/content/content.json`.
- Fixtures: `TZ=America/Chicago node scripts/export-fixtures.ts` → `fixtures/engine/*.json`; Dart side:
  `cd mobile && TZ=America/Chicago flutter test test/engine`.

## Rules that never bend
- Never change the word of God (Scripture, catechism, creed text is copied exactly).
- Never show a stained-glass window more lit than the person has earned.
- No secrets in the app: only the Supabase URL and publishable key.
- Apple and Google accounts: owner enrolls as an individual (no D-U-N-S needed). Codemagic isn't needed; builds and
  uploads go through Xcode on this Mac.
