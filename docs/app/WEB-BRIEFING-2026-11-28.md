# Brief for the web app: what the phone app did on Nov 27–28

The phone app (Flutter, `mobile/`) now has everything in `MAC-BRIEFING-2026-11-26.md`. The owner then reviewed it on a phone and
asked for several screen changes. **Those changes are not on the website yet. Please match them** (section 2). Section 3 lists
bugs found in the app that the website has too, or might have.

Rules as always: never change Scripture, catechism or creed text; plain words; old app versions keep working; fetch and merge
(no force-push).

## 1. Ported from the website (no action needed; for reference)

- **Five levels (ADR-005).**
  - `level_scale.dart` and `tiers.dart`; `levels.dart` rules, `nextStep`, awards; keep, measures, stats, `foldStones`.
  - `levelScale: 2` is read and written. Parse and merge both migrate.
  - Engine fixtures `journeys.json` and `small.json` pass in Dart.
  - Level badges are now drawn gems, as on the website. The stone photos are gone from the app.
- **ADR-006 Phase 0:** `lightMark`, `dampedStep` and the same-day undo. The app now records `tested` on blanks and spot answers,
  and the wrong word's position as `missed` on a wrong spot answer.
- **Lighter reviews:**
  - The five feedback bands (`state/feedback.dart`, with a test). No red Continue; a perfect whole answer is celebrated.
  - "It'll come back once more at the end."
  - The effort chip on Today's big card, "✎" on rows, "Done for now", "opens 7 pm".
  - Default daily goal: 7 minutes.
- **Item stats:** `wordCards`, `recitedPerfectly`, `timesPracticed`, `strengthSeries` (`state/item_stats.dart`, with the website's
  test).
- **Progress:** the ring row (Verses, Catechism, Min this week, Day streak); a "Growing" chart with a point a day; the sections the
  website hides are hidden.
- **Plan:**
  - `removed[]`, `verses[]`, `dailyCourse`, `inPlan`, `removeFromPlan`, `addVerse` and `removeVerse` (with `plan.test.ts`
    ported).
  - `startedCourses(..., removed, verses)`; the `planDay` verse lesson (`DayCard.item`).
  - Today's "Your plan is empty" card; `mode=learn`.
- **Learn tab:** search, Discover, verse shelves (`lib/data/verse_shelves.dart` mirrors `verse-shelves.ts`), the season's course.
  `buildPractice` (two-minute practice).
- **Community:** the Requests and Friends boxes, the share icon, and plain buttons on the leaderboard card.
- **Not ported:** "This week" (the website dropped it). The season card is a plain course card, not the blurred-glass card.

## 2. Screen changes the owner asked for in the app (please mirror them on the website)

### Lesson / step screens (more room for the answer when the keyboard is up)
- **Top bar:**
  - The progress bar is **6 px** tall (was 10), with rounded ends.
  - The close button is **36 px** with a 16 px icon.
  - About **8 px** under the status bar, and **8 px** between the bar and the step.
- **Question:** **21 px** (was 25). While the keyboard is open:
  - the question is **18 px**;
  - the course label line ("Westminster Shorter Catechism · Q12") is hidden;
  - the space between the header items is tighter (10 px; 14 px otherwise).
- **Removed for good:** the "Last practiced yesterday · strength 85%" line on review steps (the `why` line).
- **First letters:** the passage line height is **1.55** (was 1.7).

### Outlined buttons
- The outline style (`.hr-btn-outline`, used by **Review** and **Add to plan**) was invisible on the blurred background with the
  `--edge` colour (#4b565e).
- The app now uses **1.5 px of the ink colour at 45% opacity**. Please do the same in dark mode.

### Course page (`/heir/courses/[id]`)
- **Boxes:** the "in memory" box is gone. The boxes are now **% of the course done · learned of total · average strength**.
- **Each verse or question row:**
  - the gem (a dashed outline before it's learned) on the left;
  - the title and two lines of text;
  - the strength **% large (20 px, bold)** in its band colour;
  - a **› arrow on every row**, so all of them look tappable.
  - No line under the % (no "Practised today", no level name, no "Needs a refresh"; the gem still fades when it needs a
    refresh).
- **A verse not started yet** shows **"0%" in grey** (muted at 60%) with the dashed outline.
- **Rows are roomier:** 16 px of padding top and bottom, 80 px minimum height.

### Verse / answer page (`/heir/item/[id]`)
- **Header:** for a **verse**, the back button sits beside the **reference alone** ("John 3:16"), not "Christmas · Verse 3". The
  small reference line above the verse text is removed, since the header now names it. Questions and creed parts keep
  "Course · Q12".
- **Less space** above the back button.
- **New order:**
  1. the verse;
  2. **Added to plan ▾** (or Add to plan), with its note;
  3. the status card;
  4. **Practice | Review** side by side;
  5. Word by word, Strength over time, meaning, and the rest.

  An unlearned verse: verse, Add to plan, then Learn it · 2 min.
- **The status card:**
  - the strength ring and "Stone · Familiar" (plus "Due for a refresh" when it applies);
  - then **one row of three numbers: recited perfectly · times practised · learned (date)**;
  - then "Often missed", only when there is one.
- **Removed from the card:**
  - the "Strength, practised today" caption;
  - "Strong until about …";
  - "next review";
  - the "Learned" and "Last time" rows;
  - "Next: Recalled, once you …".

## 3. Bugs found in the app; please check the website

1. **"Learn it" on a verse that's already learned** (a stale Today card from earlier in the day, or learned since):
   - The website's `mode=learn` falls through to the course's **next lesson**, and when it finishes, adds the verse to
     `plan.verses` anyway.
   - The app now gives a short practice on that verse instead.
   - The website needs the same guard in `LessonRunner`.
2. **Plan fields the website doesn't know are dropped.** `parseHousehold` keeps only `course`, `minutes`, `removed` and `verses`,
   so any field a newer app saves on the plan would be erased on the next save. The app now keeps unknown plan fields as they
   are (`Plan.extra`). Worth doing the same on the website.
3. **The onboarding text "What long-term memory means"** still describes the old Emerald rule ("recalled each answer correctly for
   six months, including after two months away"). Expert now needs three right whole answers in six months, one of them after two
   months away. Please check that the wording still fits.

## Where things live in the app

| What | Where |
|---|---|
| Lesson top bar and header | `mobile/lib/features/lesson/lesson_screen.dart` (`build`, `_header`), `step_frame.dart` |
| Outline buttons | `mobile/lib/ui/widgets.dart` (`KButton(outline: true)`) |
| Course page | `mobile/lib/features/courses/course_screen.dart` (`_ItemRow`, the boxes) |
| Verse page | `mobile/lib/features/item/item_screen.dart` (`ItemScreen`, `_Status`) |
| Plan buttons | `mobile/lib/features/courses/plan_buttons.dart` |
