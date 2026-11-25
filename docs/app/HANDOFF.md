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
- **Mac session (you):** set up the Mac and get the app building and running in the iPhone simulator:
  1. Install Flutter (`brew install --cask flutter`) and CocoaPods (`brew install cocoapods`) if missing.
  2. `flutter doctor` and fix what it reports (Xcode command-line tools, license, simulator runtime).
  3. `cd mobile && flutter pub get && flutter run` on an iPhone simulator. `mobile/lib/main.dart` was removed while the
     engine is ported; add a minimal placeholder `main.dart` (a plain screen saying "Katekize") so it builds, and commit it.
  4. Report back what works, in plain words.

## Status (Nov 25, 2026)
- Phase 1 (engine) is done: the whole engine is in `mobile/lib/engine/` and matches the website on every shared case
  (see the parity table in AI_GUIDE.md). Phase 2 (first slice of screens) can use it. Load content first with
  `loadContent(jsonDecode(await rootBundle.loadString('assets/content/content.json')))`.
- Content export: `node scripts/export-content.ts` → `mobile/assets/content/content.json`.
- Fixtures: `TZ=America/Chicago node scripts/export-fixtures.ts` → `fixtures/engine/*.json`; Dart side:
  `cd mobile && TZ=America/Chicago flutter test test/engine`.

## Rules that never bend
- Never change the word of God (Scripture, catechism, creed text is copied exactly).
- Never show a stained-glass window more lit than the person has earned.
- No secrets in the app: only the Supabase URL and publishable key.
- Apple and Google accounts: owner enrolls as an individual (no D-U-N-S needed). Codemagic isn't needed; builds and
  uploads go through Xcode on this Mac.
