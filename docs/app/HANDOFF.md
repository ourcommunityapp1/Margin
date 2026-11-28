# Handoff: everything a new Claude session (or person) needs

Last updated Nov 25, 2026. Read this first, then `AI_GUIDE.md` (rules, screen mapping, checklists), `README.md` (the plan, C4
diagrams) and `adr/` (why each choice) in this folder.

## 1. The product and the owner
- **Katekize** (was "Heir"): a family app for memorizing Scripture, the Westminster catechisms and the creeds. Short daily lessons,
  spaced reviews timed by a memory model, and a stained-glass window per course that lights up pane by pane as you learn.
  Friends, a community board, stones and days kept. Free.
- **Live at katekize.com** (website and installable web app, Next.js). A **Flutter app** for iPhone and Android is being built in `mobile/`.
- **Owner: Landon Whitlock**, not technical, has a Mac with Xcode. Explain in plain words. Ask before anything that needs a
  password. **Never ask for or paste secrets in chat** (the Supabase service key especially). The owner is not sending any
  letters or mailings: do not suggest them.
- Contact email for the product: **hello@katekize.com** (forwards to the owner's Gmail so their name is not exposed).
- Right now the owner is nearly the only user; a few testers are about to be invited.

## 2. Rules that never bend
1. **Never change the word of God.** Scripture, catechism and creed text is copied exactly. No retyping, no "fixing" punctuation.
2. **Never show a window more lit than earned.** No fully lit window images as decoration, ever.
3. **The Dart engine stays identical to the website's TypeScript engine.** Change TypeScript first, regenerate fixtures, make Dart match.
4. **Children are never shown outside their family.** Profiles are for adults (13+).
5. **No secrets in the app.** Only the Supabase URL and publishable key. Server-only work goes in a website route.
6. **Old app versions keep working.** Add to the API and the data format; never break them.
7. Words: plain and short, no jargon, never "pieces"; "Review" and "Try again" for buttons. Don't explain the model in numbers.

## 3. Where things live
| What | Where |
|---|---|
| Website pages | `src/app/` (Next.js 16, read `node_modules/next/dist/docs/` before changing it; see `AGENTS.md`). Public pages `src/app/(site)/`, the app `src/app/heir/`, API routes `src/app/api/heir/`. |
| **The engine (TypeScript, the source of truth)** | `src/heir/*.ts`; course text in `src/heir/content/`. 146 tests: `npm run heir:test`. |
| **The Flutter app** | `mobile/`. **Never name this folder `app/`**: Next.js treats a top-level `app/` as the website's pages and every page 404s. |
| Dart engine (pure Dart) | `mobile/lib/engine/`, proved identical by shared test files in `fixtures/engine/` (written by `scripts/export-fixtures.ts`). |
| App screens / state / data | `mobile/lib/{ui,features,state,data,platform}`, widget tests in `mobile/test/widget/`. |
| Database | Supabase project `hfhurrvijmuxedsqdplc`; migrations in `supabase/migrations/` (all applied to production). |
| Hosting | Netlify site `9fc1ceb0-f8c3-49f7-b040-c28d58c580a5` ("marginnoteapp", serves katekize.com). |
| Design decisions | `docs/memory/` (review engine: ADR-001, ADR-002, PROGRESS_PLAN), `docs/app/adr/0001..0010` (Flutter plan). |

Repo: github.com/ourcommunityapp1/Margin. **Branch `claude/sleepy-goldberg-gjg4bh`**, PR #1. Pull before you start; commit and push often.
Two Claude sessions work on this branch (see section 7); if a push is rejected, `git fetch` and merge (never force-push or rebase).

## 4. How the memory engine works (so you do not break it)
- FSRS-6 (`ts-fsrs` 6.0.0, default weights, fuzz on, short-term off). Part-level memory is rebuilt by replaying answers.
- Grading: typed or said in full and right = good; a slip or two (within the allowance), a hint, or one misheard word = hard; more = again.
  First letters is cued recall: at best hard. Voice-typing slips ("Mann" for "man", "principal" for "principally") are forgiven (`grade.ts`).
- **In memory** = the model's chance for the weakest part stays above 70% (under 70% for 7 days drops it), with a guard rail of twice the
  stone's old window (windows 90 / 240 / 425 days by level). Strength numbers are not shown on the day of practice.
- A calibration (logistic a, b) corrects the model's chance using real answers; the server fits it, the app only applies it.
  `p_recall` stored on answers is always the raw prediction.
- **Today**: the day's plan is made once per day and stored in `MemberProgress.today` (cards, sessions, started ids). Cards: Recommended
  lesson, Fix today, reviews. A brake stops new lessons when reviews already fill most of the goal. Done cards say Lesson / Fix / Review.
  Window lights up pane by pane when a card comes into view; the panes light as one spreading patch, clockwise from the top
  (`sweepOrder` in `src/app/heir/ui/glass/light-motion.ts`, used by full and small windows).
- The evening ("When you lie down", Deuteronomy 6:7) and morning ("When you rise") recalls are an **optional banner above the carousel**, not cards; ×
  hides it for that evening or morning (per phone).
- Reviews follow a ladder by chance: under 75% blanks then first letters; 75 to 90% first letters then whole; 90%+ whole once. Never pick
  something learned today or recalled in the last 16 hours. Extra whole-answer checks come only from the lesson's own course.
- Streak ("days kept"): Sunday rest day plus one free day a week.

## 5. Accounts, friends, privacy (decided Nov 2026)
- Sign-in is an emailed code (Supabase auth). One account per family; a household has people (adult or child track).
- **A new account gets a profile made for it** (`heir_profile_auto`, migration `20261204000000`): first adult's name, username like
  `landonw`, "Let people find me" and "Friends of friends see my rank" on. Only accounts made after 2026-11-25 04:00 UTC, only adults, only
  with a first and last name, never again after the person deletes their profile (`heir_profile_declined`). Sign-in says "you confirm
  you're 13 or older". Website (`ensureProfile`, `social.tsx`, `provider.tsx`) and phone app (`state/sync.dart`, `state/social.dart`) both call it.
- Friend invite links (`heir_invites`), blocking, reporting, reserved usernames, a community board, linked accounts (spouse view-only).
- **Account deletion** for the store: app screen plus `POST /api/heir/account/delete` (needs `HEIR_SUPABASE_SERVICE_KEY` on the server).
- Privacy page: `src/app/(site)/privacy/page.tsx` (keep it matching what the app collects and the store privacy labels).
- "Labs" features (understanding track, the owner's review link) are still only for two test accounts (`src/heir/labs.ts`); not for everyone.

## 6. Status of the Flutter app (mobile/)
- **Phase 1 engine: done.** Every engine file ported; all fixtures pass (grading 1,793 cases, FSRS 260 runs, memory 40 histories, lessons 767,
  six 120-day simulated learners, two-phone merges, small files). Run: `cd mobile && TZ=America/Chicago flutter test` (tests use America/Chicago local days).
- **Phases 2 to 6 built by the Mac session** (details and checkboxes in `AI_GUIDE.md`): welcome, first run, sign-in, Today (cards, banner,
  Keep going), Courses, item, the lesson runner (all step kinds), Progress, You (course, goal, family, profile, linked accounts, reminders,
  delete account), Friends, Community board, windows (full-size, small, lesson-done), reminders, haptics, share sheet, speech, NASB shown
  through the site with the Lockman link, 2x text fixes. 138 widget and engine tests pass. Account sync reads and writes the real account
  (`Config.syncWrites` true by default; `--dart-define=SYNC_WRITES=false` for read-only).
- Flutter is pinned to **3.50.x** in `mobile/pubspec.yaml`. Mac: `brew install --cask flutter`, CocoaPods, Xcode.
- Not done: Android never built (no Android SDK on the Mac); real-phone checks (speech, haptics, notification timing); Home Screen widget;
  TestFlight/Play builds (need the developer accounts); store screenshots.

## 7. Who does what
- **Cloud session** (this kind of chat): engine, website, Supabase migrations, deploys. Can't reach the owner's Mac (the Remote Control folders
  show "not available" to cloud sessions).
- **Mac session** (Claude Code, Local, on the owner's Mac, repo cloned): `mobile/` screens, state, data, iOS project, simulator runs, Xcode.
  It must not edit `mobile/lib/engine/`, `mobile/test/engine/`, `fixtures/` or `scripts/export-*.ts` (ask the cloud session, or change both
  with a fixture). It must not recreate a top-level `app/` folder.

## 8. How to check and ship
| Task | How |
|---|---|
| Website engine tests | `npm run heir:test` (146). Type check: `npx tsc --noEmit -p .`; lint: `npx eslint <files>` (2 old errors in `src/app/session/[id]/page.tsx` are unrelated). |
| Dart engine and app | `cd mobile && TZ=America/Chicago flutter test`; `flutter analyze` must say "No issues found". |
| Regenerate fixtures after an engine change | `TZ=America/Chicago node scripts/export-fixtures.ts` (and `node scripts/export-content.ts` for course text). |
| Run the website locally | `npx next dev -p 3100`; screenshots with Playwright (preinstalled). `AGENTS.md` may be regenerated by Next: `git checkout AGENTS.md` before committing. |
| Database change | Add a file to `supabase/migrations/`, apply it to production with the Supabase tools, test on made-up rows inside a transaction that rolls back. Secrets never go in chat. |
| Deploy the website | Netlify "deploy-site" gives an `npx @netlify/mcp ... --proxy-path ...` command; run it with `NODE_USE_ENV_PROXY=1` (in the cloud container Node ignores the proxy otherwise). Keep the upload small: `rm -rf mobile/build`, and move `fixtures/` aside during the upload, then back. |
| Local Postgres for migration tests | `/tmp/pgtest` (started with `pg_ctl` as the postgres user) when it exists; otherwise test on production inside a rolled-back DO block. |

## 9. Business and store setup (owner's side)
- Enroll as an **individual** (no D-U-N-S number needed): Apple Developer $99/year, Google Play $25 once. Google requires a closed test with
  12+ testers for 14 days before a new personal account can publish. An LLC later, if wanted (Apple doesn't accept DBAs).
- Builds and uploads go through **Xcode on the owner's Mac** (Codemagic is not needed).
- Before submitting: the reviewer account (`appreview@katekize.com`, made by the owner; see `STORE_PACKAGE.md`), approved listing text and
  privacy labels (`STORE_PACKAGE.md`), account deletion deployed with the service key set, YouVersion terms re-read for NASB in a phone app,
  `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` set on Netlify so invite links open the app (`NATIVE_SETUP.md`).
- NASB text comes from the YouVersion Platform (licensed; the owner believes the terms cover a phone app, not yet re-read).

## 10. Open work, roughly in order
1. Owner: Apple Developer enrollment; make the reviewer account; Xcode signing; try the app on a real iPhone; recruit Android testers.
2. Real-phone checks of speech, haptics and reminders; first TestFlight build; store screenshots.
3. **Reminder emails and phone notifications** (planned, not built): opt-out by default, warm plain wording, one chooser shared by email and push,
   rested wordings, quiet hours, one-click unsubscribe, privacy page line. Plan: https://claude.ai/artifact/4HvrkWKErFxqFcSLzWnZ5w (Resend is the mailer).
4. "Everything you've learned" page: every verse or answer with its strength, filters, common mistakes (to-do; mockup first, the owner said "not yet").
5. Optional "what did I practice" line on done cards; smaller windows could animate (kept still on purpose).
6. Android build and widget extensions; the website's `/heir/*` and the app must stay in step (change both for any screen or rule change).
