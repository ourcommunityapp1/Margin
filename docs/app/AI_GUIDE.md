# Guide for the AI building the Katekize app

Read this before writing app code. The plan is [README.md](README.md); the decisions are in [adr/](adr/).

## Where the truth lives

| Question | Source of truth |
|---|---|
| How memory, grading, scheduling, Today's plan and "in memory" work | `src/heir/*.ts` (TypeScript). The Dart engine copies it; fixtures prove it (ADR-0003). |
| Why the engine is the way it is | `docs/memory/ADR-001-review-engine.md`, `ADR-002-today-and-daily-plan.md`, `PROGRESS_PLAN.md` |
| Course text | `src/heir/content/`, exported to `mobile/assets/content/content.json` (ADR-0005). Never hand-edit. |
| What each screen shows and says | The website's screen in `src/app/heir/` (table below). Match its copy and behaviour unless told otherwise. |
| Database, RPCs, security | `supabase/migrations/` (applied in order). The app uses the same RPCs; it never holds a service key. |
| Look | `src/app/heir/heir.css`, ported to `mobile/lib/ui/theme.dart` |

## Rules that are not negotiable

1. **Never change the word of God.** Scripture, catechism and creed text is copied exactly. No retyping, no "fixing"
   punctuation.
2. **Never show a window more lit than earned.** No fully lit window images as decoration.
3. **The engine stays identical to the website's.** Change both with a fixture, or neither.
4. **Children are never shown outside their family.** Profiles are for people 13 and older.
5. **No secrets in the app.** Only the Supabase URL and publishable key. Server-only work goes in a website route.
6. **Old app versions keep working.** Add to the API and the data format; don't break them.

## Product rules learned with the owner (keep them)

**Today:**
- A carousel of the day's recommended cards, one course each. Each card shows a tag, the course name, its window and one
  button.
- Tags: "Recommended", "Fix today", "This morning", "Before sleep".
- A finished card shows one word for what it was ("Lesson", "Fix", "Review") with a tick and its minutes.
- A session that finished no card gets its own done card.
- When all are done: a slim banner ("Today's lessons are done · N min") and a "Done for today" card. That card shows
  the real window, the minutes and an "Extra practice" link.
- Below the carousel, Keep going: one slim row per started course, opening to Next lesson above Review. "Add a course"
  is not here (it's on Courses).

**Reviews:**
- They follow the ladder: under 75% chance, fill in the blanks then first letters; 75 to 90%, first letters then the
  whole thing; 90% or more, the whole thing once.
- A quiet reason line under the question.
- No strength percentage on the same day as the last practice.
- Never pick something learned today or recalled in the last 16 hours.

**Extra whole-answer checks** in a lesson come only from that lesson's course.

**Streak:** Sunday is a rest day, plus one free day each week. The week view lives on Progress.

**Words:**
- Plain and short.
- Never "pieces".
- Say "Review" and "Try again" for calls to action.
- Don't explain the model in numbers people can't relate to.

## How to check your work

| What | How |
|---|---|
| Engine | `cd mobile && flutter test test/engine` (not `dart test`: the tests use `flutter_test`): every fixture in `fixtures/engine/` must pass. Regenerate fixtures with `npx tsx scripts/export-fixtures.ts` when the website's engine changes. |
| Website engine still green | `npm run heir:test` |
| Static checks | `cd mobile && flutter analyze` (no warnings) |
| Screens | Widget tests; golden screenshots (`flutter test --update-goldens` only when a change is intended, and say so). You can also `flutter build web` and screenshot it with Playwright to look at a screen. |
| On a phone | The owner tries TestFlight builds; if the Mac is connected, run the simulator and take screenshots yourself |
| Content | The export test: every item's text equals the source |

## Screens to port (website → app)

| Website file | App feature |
|---|---|
| `src/app/heir/page.tsx`, `ui/today.tsx`, `ui/days-kept.tsx` | `features/today/` |
| `ui/lesson.tsx`, `ui/steps.tsx`, `lesson/page.tsx` | `features/lesson/` (every step kind: intro, info, quiz, verse, order, meaning, blanks, letters, say, type, match, spot, next) |
| `courses/page.tsx`, `courses/[id]/page.tsx`, `ui/course-list.tsx` | `features/courses/` |
| `item/[id]/page.tsx`, `ui/item.tsx`, `ui/explain.tsx`, `ui/related.tsx` | `features/item/` |
| `progress/page.tsx`, `ui/community.tsx` (preview) | `features/progress/` |
| `community/page.tsx` | `features/community/` |
| `friends/*`, `u/page.tsx`, `profile/page.tsx`, `invite/page.tsx`, `ui/social.tsx`, `ui/invite.tsx` | `features/friends/`, `features/profile/` |
| `keep/page.tsx`, `ui/keep-screen.tsx` | `features/keep/` |
| `you/page.tsx`, `family/page.tsx`, `plan/page.tsx`, `linked/page.tsx`, `join/page.tsx` | `features/you/` |
| `welcome/page.tsx`, `start/page.tsx`, `signin/page.tsx` | `features/onboarding/`, `features/signin/` |
| `ui/glass/*` | `ui/window/` (ADR-0007) |

## Phase checklists

### Phase 1: engine (done Nov 25, 2026)

- [x] `scripts/export-content.ts` writes `mobile/assets/content/content.json`; a test checks every item's words join exactly.
- [x] `scripts/export-fixtures.ts` writes `fixtures/engine/*.json` (run it with `TZ=America/Chicago`, as the Dart tests are):
  grading, FSRS, memory, lessons, six simulated learners over 120 days each (every finish, settle, day plan and screen
  read checked after each step), two-phone merges, and the small files.
- [x] Ported in dependency order into `mobile/lib/engine/` (pure Dart, no Flutter imports).
- [x] All fixtures pass: `cd mobile && TZ=America/Chicago flutter test test/engine`.
- Not ported on purpose: `calibrate.ts` fitting (the server fits; the app only applies a fit with `setPopulationCal` /
  `setPersonCal`), `answers.ts`, `sync.ts`, `recover.ts`, `statsjob.ts`, `validate.ts` (server or website plumbing; the
  app's data layer comes in phase 2), and `usfm.ts`'s HTML clean-up (the server returns clean verse text).

**Parity table** (TypeScript → Dart; every row passed its fixtures on Nov 25, 2026):

| Website | App | Fixture |
|---|---|---|
| `words.ts`, `grade.ts` | `words.dart`, `grade.dart` | `words`, `grade` (1,793 cases) |
| `ts-fsrs` 6.0.0 (FSRS-6, fuzz, long-term) | `fsrs.dart` | `fsrs` (260 runs × 14 reviews) |
| `memory.ts` | `memory.dart`, `models.dart` | `memory` (40 histories, 3 calibrations) |
| `content/index.ts` | `content.dart` | via `lesson`, `journeys` |
| `lesson.ts` | `lesson.dart` | `lesson` (767 seeded sessions) |
| `progress.ts`, `keep.ts`, `levels.ts`, `measures.ts`, `planner.ts`, `dayplan.ts`, `related.ts` | same names `.dart` | `journeys` (6 learners, every step), merges |
| `stats.ts`, `path.ts`, `social.ts`, `board.ts`, `season.ts`, `time.ts`, `usfm.ts` (refs) | `stats`, `path`, `social`, `board`, `season.dart`, `usfm.dart` | `small` |

**Notes for whoever changes the engine next:**
- Change the TypeScript first, regenerate fixtures, then make Dart match. Never edit a fixture by hand.
- Local days matter (stones, days kept, the day plan), so fixtures and tests both run in `America/Chicago`.
- Numbers are compared to 1e-9; dates as exact ISO text. JavaScript's `Math.round`, stable sorting and the seeded
  generators are copied exactly (`util.dart`, `lesson.dart`, `fsrs.dart`).

### Phase 2: first slice

- [ ] Theme, fonts, the tab bar.
- [ ] Sign-in (emailed code); the session in secure storage.
- [ ] Household and progress from on-phone storage, then merged with the account (`loadRemote`, `saveRemote`,
  `mergeProgress`, as in `ui/provider.tsx` and `ui/cloud.ts`).
- [ ] Today with real cards, using a placeholder window.
- [ ] The lesson runner with every step kind; the done screen.
- [ ] Saving offline, syncing online; answers and card events sent.
- [ ] Codemagic builds it to TestFlight.

### Phases 3 to 7

See the plan's table. Each feature needs:
- widget tests;
- a golden screenshot;
- a side-by-side check with the website screen;
- a real-phone check by the owner.

## Parity table

| Engine function | Fixtures | Last passed |
|---|---|---|
| (filled in during phase 1) | | |
