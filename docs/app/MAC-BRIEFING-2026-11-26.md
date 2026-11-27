# Briefing for the Mac Claude Code session (Nov 26, 2026)

Copy everything in this file into Claude Code on the Mac, in the Katekize folder. It is complete on its own.

## Who and what
Katekize is a family app for memorizing Scripture, catechism and creeds (live at katekize.com; the website is Next.js in `src/`, the phone app is Flutter in `mobile/`).
The owner, Landon, is not technical: explain in plain words, ask before anything needing a password, never paste secrets in chat. The cloud session owns the
memory engine, the website and database; you own `mobile/` (screens, state, data, iOS, simulator). Branch: `claude/sleepy-goldberg-gjg4bh`. Start with
`git pull origin claude/sleepy-goldberg-gjg4bh`; if a push is rejected, `git fetch` and merge, never force-push or rebase.

## Rules that never bend
1. Never change the word of God: Scripture, catechism and creed text is copied exactly.
2. Never show a window more lit than earned.
3. The Dart engine (`mobile/lib/engine/`) stays identical to the TypeScript engine (`src/heir/`); you do not edit it, `mobile/test/engine/`, `fixtures/` or `scripts/export-*.ts`. New pure logic goes outside the engine folder (e.g. `lib/state/`) with a test.
4. Never name a top-level folder `app/` (Next.js reads it as pages); the Flutter folder is `mobile/`.
5. Words: plain and short, no jargon, never "pieces"; the evening recall is "When you lie down" (Deuteronomy 6:7), the morning one "When you rise".
6. Old app versions keep working: add to the API and data format, never break them.

## What the website did today, and where the app stands (from your own notes in `docs/app/CHANGES-2026-11-25.md`)
Done in the app already, no need to redo: Today as one big thing (rise / lesson / night / done) with quiet rows, photos and light-up windows; both recalls every day from 5 am
(`morningPicks`); "When you lie down" naming; strength on the Courses and question screens with Practice and Review; pane-by-pane window light-up and `sweepOrder`;
haptics; speech to text through ElevenLabs; the sign-in 13+ line and automatic profile; photo credits on About.
Still to do outside this file: the Apple Developer paperwork, real-phone checks, TestFlight, and the nine Unsplash photographers' names (the owner has not sent them; the About screen says "name to be added").

## The job: the new Progress screen

`git pull origin claude/sleepy-goldberg-gjg4bh` first. Read the heading "Nov 26 (late) · New Progress screen" at the end of
`docs/app/CHANGES-2026-11-25.md`. The website code to copy is `src/app/heir/progress/page.tsx` (look at `RingChip`, `Gauge`, `StepChart`
and the page body), `src/heir/memory-history.ts` with its test `src/heir/test/memory-history.test.ts`, and the `hr-pg-*` rules at the
end of `src/app/heir/heir.css`. Your current `mobile/lib/features/progress/progress_screen.dart` still has the old layout.

## Order of the screen (top to bottom)
1. Title "Progress" (serif 34).
2. **Row of four rings** (a ring 58 px, 3 px stroke, number inside in Inter 600 14.5, label under in muted 12):
   Words (the words in your memory, ring = progress from the last milestone to the next, full when every milestone is reached),
   Days kept (ring = days kept ÷ best), Stones (value = questions holding at least the first stone, ring = that ÷ recited),
   Windows (value = courses started, ring = learned items ÷ total items across those courses). Colours peach #F3D8B6, blue #9fb8e8,
   violet #b9a1e6, gold #e5b66a on a faint white 12% track, ring starts at 12 o'clock and runs clockwise.
3. **Hero**, a rounded card (radius 28) with the blurred glass image of the first started course behind it (blur 14, saturation 1.2,
   brightness 0.5) and a dark gradient over it (top 5%, 70% down 55%, bottom 90% of #11161c):
   - **Arc:** viewBox 320 × 100; centre (160, 184), radius 170, from -50° to +50° measured from 12 o'clock; track white 40% 1.4 px;
     lit part #F8EBD8 5 px round cap; three dots at 25, 50, 75% on a radius 14 px larger (2.2 px, white 70%); end labels the last
     milestone passed and the next one (11 px) just under the ends. With no next milestone: full arc, no labels.
   - Number: serif 62 px, tracking -0.02em. Kicker "WORDS IN YOUR MEMORY" (11 px, bold, 0.14em tracking).
   - A serif sentence (24 px): "A few to bring back" when anything needs another go today; else "Keep them strong" when anything needs a review
     soon; else "Your first words are coming" at zero words; else "Steady does it"; "Every milestone reached" when there is no next one.
   - One grey line (14 px, 85% opacity, 30 characters wide): "N need(s) another go today to stay in your count." / "Review N soon to keep it/them in your
     count." / "Recall a verse or answer on a later day and it counts here." (zero words) / **"Next milestone: 1,500 words. You're 216 words
     away."** / "Every word you've learned is holding."
   - A quiet pill (white 14% fill, 18% edge, 14 px bold): "Review N soon" or "Bring N back", linking to the keep screen; none when there is nothing to do.
4. **"Growing" card** (only with more than two weekly points): label "Growing", right side "since <month of the first words>", then the stepped chart.
5. A fold "How a word gets into your memory" (closed; explains the rule, plus how many more are recited but not yet recalled).
6. The keeping rows (try again today / review soon / out of memory), as today, in their own card.
7. Days kept: the existing week card as it is, then a fold "<Month>, day by day · best N" holding the month grid and the rest-day sentence.
8. Stones (unchanged content), Understanding (labs accounts only), Your windows (every window lights up when seen, tap to open), Awards. **No community card on Progress any more** (see below).

## The stepped chart ("Growing")
viewBox 320 × 170, margins left 6, right 46, top 16, bottom 30. Weekly points; x spreads them evenly; the line steps horizontally then
vertically (`H x V y`), peach #F3D8B6 2 px, filled under with a peach gradient (60% at the top to 4% at the bottom). Up to three faint dashed
lines at milestones that are at most 1.15 × today's number and at least an eighth of it, never closer than 22 px to the line above, labelled
on the right. The last point is a dot with today's number above it; two dark pills at the bottom: the first month's short name and "Now".
Top of the scale is 1.1 × the larger of today's number and the highest milestone line.

## The data: words in memory over time (new, pure Dart, outside the engine folder)
Port `src/heir/memory-history.ts` to `mobile/lib/state/memory_history.dart`, using the engine's `levelFromLog`, `itemWords` and `localDay`:
- `memoryDates(items, track, log)`: for each item with answers (ignoring `intro`), take its answer times on a later day than its first, in order;
  the first of those times at which `levelFromLog(item, track, entries up to that time, that time) >= 1` is the day it first counted.
- `wordsHistory(items, track, progress, now, current)`: weekly points ending today (`weeks = min(52, max(2, ceil((now - first) / 7 days) + 2))`),
  each the total words of items whose date is on or before that week's end; the last point is forced to `current` (the keep-adjusted number the hero shows);
  then walk back from the end so no point is larger than the one after it. Empty list when nothing counts yet.
Write the same test as `memory-history.test.ts` (one question: same-day recital does not count; a recall nine days later does; the series never goes down; ends at today's number; empty log gives an empty list).

## Done when
`flutter analyze` clean, `TZ=America/Chicago flutter test` green, simulator screenshots of Progress with a new account (zero words: no chart, "Your first words are coming")
and with a few weeks of answers; note it in the "App port notes" part of `docs/app/CHANGES-2026-11-25.md`; commit and push to the same branch (fetch and merge if rejected, never force-push).

## Two small things to leave as they are
- The website shows no "Keep going" on Today any more, and the app already matches; do not add it back.
- If the website and the app disagree on any screen or rule, the website is the reference: copy its behaviour, then tell the owner what you changed.

## Also: the community card moves to Friends
Remove `CommunityPreview` from `features/progress/progress_screen.dart` and show it at the top of the Friends screen, above "Friend requests" (hidden while a search is showing).
The small dot on the tab bar that says "your place on the leaderboard changed" moves from the Progress tab to the Friends tab. Nothing else about the card changes.

## Nov 26 (evening) · A day plan from the future made Today rebuild every second ❌ for the apps
At 18:04 UTC today something saved the owner's progress with `today.day = 2026-11-27` (most likely a simulator run with `--dart-define=NOW=…` signed in to the real account).
Because `mergeToday` keeps the later day, every website save merged that future plan back in, Today planned again, saved again, and so on about once a second; the big window was rebuilt each time (a black blink).
**Website fix:** `provider.tsx` drops a saved `today` whose day is after this device's local day before merging (`withoutFutureToday`), so this device's plan wins and is saved over the bad one.
**App:** do the same wherever saved progress is merged in (sync), and **never run the simulator with a fake `NOW` while signed in to a real account** (sign out, or use a test account).

**Order update (Nov 26, evening):** "When you rise" is now the big card whenever it is not done, at any hour until 7 pm (before: only until noon, then a row after the day's cards). Today is in time order: rise, then the lessons and reviews, then "This evening". Port the same rule.

## Nov 27 · Lighter reviews, light morning recall, gentler feedback ❌ for the apps (engine ✅ ported)
Plan and guard rails: `docs/memory/ADR-003-weekly-rhythm-and-grace.md` (read "Owner's corrections" and "Built").
- **Engine (done in Dart too, please run `TZ=America/Chicago flutter test test/engine`):** `_ladder` light at every strength (no type/say in reviews);
  no-chance fallback light; no second step unless under 75%; `buildRise` one light step per question (blanks / order in turn) then a verse. Fixtures regenerated.
- **App screens to match:** the five feedback bands and their colours (port `src/heir/feedback.ts` outside the engine folder with its test); no red Continue;
  "It'll come back once more at the end."; a celebration for a perfect whole answer; the effort chip on Today's big card and "✎" on rows with a full answer.
- **Unchanged on purpose:** the logged `correct`, the memory grade, stones, keeping rules, fixes and lock-ins (all still strict and whole).

## Nov 27 (later) · Light recall earns stones, 7-minute default, weekly pace, week line ❌ for the apps (engine ✅ ported, untested in Dart)
Plan: `docs/memory/ADR-003-weekly-rhythm-and-grace.md` ("Amendment to G4" and "Also built").
- **Engine, ported to Dart (please run `TZ=America/Chicago flutter test` and fix the Dart only if a fixture differs):** `levels.dart` light-recall rule for the first three stones
  (`lightWeight`, `_evidence`, `_countingSessions`, new `levelFromLog` and `nextStep`; the stone rule texts changed); `dayplan.dart` `reviewEst` (× 0.5) and `newPerWeek` (5 new lessons in 7 days → no new lesson);
  `planner.dart` `goals = [5, 7, 15, 25]` and `defaultGoal = 7`. `fixtures/engine/journeys.json` regenerated (a few simulated level-ups moved).
- **App screens:** default goal 7 (new accounts and anywhere the app falls back to 15); the "This week" row on Progress (learned / kept up / strengthened / days kept; port `src/heir/week.ts`
  to `lib/state/` with a test like `src/heir/test/week.test.ts`); the stone rule texts on the How-it-works screens.

## Nov 27 · Strength numbers always show (no more "Today" instead) ❌ for the apps
On the course page and the question page, a question's strength % is **always shown**, including on a day it was practised (before, it said "Today", which hid nearly every number once the daily recalls and light reviews started).
A question practised today shows "Practised today" under its number (course list) or "practised today" under the ring (question page). The course's average strength includes every learned question. This supersedes the line in `docs/app/HANDOFF.md` about not showing numbers on the day of practice, for these two screens.

## Nov 27 (night) · Progress ring row, a working "Growing" chart, word-by-word passages, richer course and question pages ❌ for the apps
- **Progress ring row** is now: **Verses** (learned, ring = of the verses in your courses), **Catechism** (answers and creed parts learned, same), **Min this week** (sum of answer times in the last 7 days, each capped at 2 min; ring against 6 days of the goal), **Day streak** (ring against your best). The arc stays on words. (Words, stones and windows left the ring row.)
- **"Growing" chart fixed** (`src/heir/memory-history.ts`): a point a day while the history is under two months (a week after), so a new learner sees a real climb; stones earned under an earlier rule that the current rules can't replay are dated to their first later answer. Port both changes in `lib/state/memory_history.dart`.
- **Question / verse page:** "Recited perfectly N times", "Practised in all N times", a **"Word by word"** card (every word its own chip, coloured by how reliably you recall it: red missed a lot, yellow often, light green pretty good, dark green consistent, grey not tried; newer answers weigh more) and **"Strength over time"** (a line, 85% target dashed). Pure functions in `src/heir/item-stats.ts` (`wordCards`, `recitedPerfectly`, `timesPracticed`, `strengthSeries`) with tests; port them to `lib/state/item_stats.dart` with matching tests. Word positions come from the logged `missed` positions of typed, said and first-letters answers (a clean answer marks every word right; an answer with misses but no positions is skipped; blanks only count misses).
- **Course page:** four boxes: "% of the course done", learned of total, in memory, average strength.

**Today wording (Nov 27):** when the day's cards are done but "When you lie down" is still to come, the big card says **"Done for now"** with "7 minutes · one light recall tonight"; it says "Done for today" only when the evening recall is done too (or there is none).

## Update 2026-11-27: five levels and a simpler Progress tab

See `docs/memory/ADR-004-five-levels-and-simpler-progress.md`. Display-only: Familiar (Stone), Recalled (Bronze), Memorized (Silver), Proficient (Gold), Expert (Diamond); engine levels 4–6 all show as Expert. Progress hides: how-a-word-gets-in fold, keeping rows, days-kept card, month calendar, Understanding, Awards, "Closest next"; the arc card loses its two sentences. Finish screen announces only new tiers. Mirror `src/heir/tiers.ts`; no engine/fixture change.


## Update 2026-11-27 (later): quick steps now feed memory and words (ADR-006 Phase 0)

A bug fix with an engine change: reviews made of quick steps (fill in, order, spot, match, next phrase) used to move nothing, so strong verses came back daily. Now each step moves the memory by what it shows (weights in `observe.ts`). See `docs/memory/ADR-006-one-memory-model.md`, section "Phase 0: built", for the exact Dart port list and the two fixtures (`lesson.json`, `memory.json`) to test against. Also record the new `tested` positions on blanks and spot answers.

## Update 2026-11-27 (evening): plan add/remove, and one call-to-action look

**Plan.** `Plan` gains `removed?: string[]` (courses taken out of the plan; progress is kept). Rules (see `src/heir/household.ts`, `dayplan.ts`, test `plan.test.ts`):
- the plan is the daily course plus every course begun and not removed; Today's new lessons come only from the daily course, reviews from all of them;
- `dailyCourse(plan)` is `plan.course` unless it is in `removed`; `startedCourses(p, track, focus, removed)` skips removed courses (the focus is always kept);
- Add to plan = `setPlan` (makes it the daily course, un-removes it, the others stay in for reviews); Remove from plan = `removeFromPlan(h, id, next)` (another course in the plan takes over as daily, else none); with nothing in the plan Today shows "Your plan is empty / Add a course".
- The household's `plan` JSON is synced, so keep `removed` when the app rewrites the plan (do not drop unknown fields).

**One CTA look.** Course page, plan screen and course rows use the same words: "Add to plan", "Remove from plan", "Make it my daily course". Two button styles only: on a dark card (Today hero, course, Progress) a cream pill (`hr-hero-btn`, same as Today's Start) and an outlined pill for the quieter choice; on a plain card `hr-btn` and `hr-btn quiet`. The old frosted button with the arrow chip is gone.
