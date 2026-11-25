# Guide for the AI building the Katekize app

Read this before writing app code. The plan is [README.md](README.md); the decisions are in [adr/](adr/).

## Where the truth lives

| Question | Source of truth |
|---|---|
| How memory, grading, scheduling, Today's plan and "in memory" work | `src/heir/*.ts` (TypeScript). The Dart engine copies it; fixtures prove it (ADR-0003). |
| Why the engine is the way it is | `docs/memory/ADR-001-review-engine.md`, `ADR-002-today-and-daily-plan.md`, `PROGRESS_PLAN.md` |
| Course text | `src/heir/content/`, exported to `app/assets/content/content.json` (ADR-0005). Never hand-edit. |
| What each screen shows and says | The website's screen in `src/app/heir/` (table below). Match its copy and behaviour unless told otherwise. |
| Database, RPCs, security | `supabase/migrations/` (applied in order). The app uses the same RPCs; it never holds a service key. |
| Look | `src/app/heir/heir.css`, ported to `app/lib/ui/theme.dart` |

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
| Engine | `cd app && flutter test test/engine` (not `dart test`: the tests use `flutter_test`): every fixture in `fixtures/engine/` must pass. Regenerate fixtures with `npx tsx scripts/export-fixtures.ts` when the website's engine changes. |
| Website engine still green | `npm run heir:test` |
| Static checks | `cd app && flutter analyze` (no warnings) |
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

### Phase 1: engine

- [ ] Write `scripts/export-content.ts` and `content.json`, plus the content-equality test.
- [ ] Write `scripts/export-fixtures.ts`. Cover:
  - grading (`wordMatches`, `gradeSpoken`, `markOf`, `gradeRecall`);
  - memory (`recallChance`, `replayParts`, `partMemories`, `outAt`, `strongUntil`, calibration);
  - `finishSession` (both grading modes) and `mergeProgress`, `parseProgress`;
  - `planNext`, `planDay`, `cardStates`, `extraSessions`;
  - the lesson builders with `seeded()`;
  - `keepState`, `heldItems`;
  - `levelFromLog`, `earnedLevels`, `daysKept`.
- [ ] Port in dependency order:
  1. `types`, `words`, `grade`
  2. `content`
  3. `lesson`
  4. FSRS
  5. `memory`
  6. `progress`
  7. `levels`
  8. `keep`
  9. `planner`
  10. `dayplan`
  11. `measures`, `stats`, `path`, `social`, `board`, `related`, `season`
- [ ] All fixtures pass. Keep a parity table in this file: one row per function, and the date it last passed.

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
