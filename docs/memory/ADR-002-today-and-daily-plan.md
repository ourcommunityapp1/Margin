# ADR-002: Today and the daily plan, joined with the review engine

- **Status:** Proposed
- **Date:** 2026-11-24
- **Amends:** [ADR-001](./ADR-001-review-engine.md), Decision 5
- **Mockups:** "Katekize Daily Lesson", version 5

## What we're building

Today shows:
- **The day's recommended sessions** as a carousel of course windows. Each card is one lesson or one review in one
  course, with a small "Recommended" tag, the course name, its window and a Start button.
- **When one is finished**, it's marked done and moves to the back, and the next one slides in.
- **When all are done:**
  - a slim banner at the top ("Today's lessons are done · 14 min");
  - a same-size "Done for today" card: the windows, the minutes and an optional Extra practice link.
- **Below, Keep going:** every started course as a slim row. Tap a row to open its window, with Next lesson above
  Review.

The review engine (ADR-001) decides what those cards are and what goes inside each one.

## How the screens map to the logic

| On screen | Where it comes from |
|---|---|
| Which cards, in what order | **Day planner** (new, `dayplan.ts`), from every course the member has started. Order: fix-ups first, then courses with reviews piling up, then the focus course's next lesson. |
| How many cards | The existing daily goal (`household.plan.minutes`: 5 / 15 / 25 min), filled by each card's time estimate. |
| What's inside a card | **Lesson builder**, within one course. A lesson brings its new part plus that course's most at-risk reviews. A review card holds that course's due items, most valuable first. |
| The window and its lit glass | `partWindow` as now, per course. Review cards use the course's current part. |
| "Recommended" tag | Cards in today's plan. |
| Done ✓ and minutes on a card | Today's record (below), with the session's real duration. |
| Banner and "Done for today" | All planned cards done. Minutes are the day's total. |
| Extra practice | The engine's lowest-chance items not yet due, across courses. Optional, never needed for the day. |
| Keep going rows | Every started course. Its line says "Lesson 5 next" or "All learned". |
| Next lesson / Review in a row | Lesson builder for that course: next lesson, or the course's review (weakest first when nothing is due). |
| Focus course | `household.plan.course`, as now. Courses → "Continue this course" already sets it. |

## Decisions

### 1. Two levels: the day, then the lesson (amends ADR-001 Decision 5)

**Decision:** ADR-001 proposed one lesson mixing all courses. The design puts each lesson in one course, so the
composer splits into two levels.
- **Day planner:** chooses the cards (course and kind) for the day.
- **Lesson builder:** fills one card with steps, within that course.

**Cost:** less mixing of courses inside a lesson. Mixing still happens across the day's cards, and items within a course
are still mixed.

### 2. The day's plan is made once and kept

**Decision:** the first time Today opens on a local day, the planner writes
`today = { day, cards: [{ id, course, kind, est }], done: [{ id, at, secs }] }` into the member's progress, which is
synced like the rest.

**Rules for changing it:**
- Cards are never reordered or removed during the day.
- A fix-up that appears later (a miss in a lesson) may be added at the end.
- A new day replaces it.

**Why:**
- Two phones show the same cards.
- Nothing jumps around under the person's thumb.
- "3 of 3 done" means the same thing all day.

### 3. Work started from Keep going counts

**Decision:**
- A lesson in course X completes today's lesson card for X, if there is one.
- A review in X completes today's review card for X.
- Anything else counts toward the day's minutes and the streak, as now.

### 4. Time is measured, not guessed

**Decision:**
- Each finished session records its wall-clock seconds (start to finish, idle gaps over 2 minutes cut).
- The card shows its minutes.
- The banner and done card show the day's total.
- The same numbers give each person's per-step time, which the lesson builder needs to fit a lesson to about 5–8
  minutes (ADR-001).

### 5. One time setting

**Decision:**
- The existing daily goal (5 / 15 / 25 minutes) sizes the day.
- Lessons stay about 5–8 minutes on their own; there's no lesson-length dial.
- The mockup's Settings page becomes two controls:
  - the daily goal (already exists);
  - Extra practice on or off.

### 6. Ship the screens before the new engine

**Decision:** Phase A ships the new Today on today's per-item FSRS, with two engine fixes it depends on:
- **Reviews from every started course.** Today they come only from the current course.
- **One forgetting curve.** The planner's curve is replaced with the scheduler's.

The part-level engine (ADR-001 Decisions 1–4) follows in phase B and needs no screen changes.

## Gaps found, with proposals

Decisions needed are marked ⚑.

| # | Gap | Proposal |
|---|---|---|
| 1 ⚑ | **A fix-up loses its urgency.** With text removed, nothing says "missed yesterday, fix it today or the words leave your count". | The tag on that card reads **"Fix today"** instead of "Recommended". Still one small tag. |
| 2 ⚑ | **Days kept has no home.** The streak card isn't in the new Today. | Show it in the slim line above the carousel: "Today · 1 of 3 done · Day 5". The full week view moves to Progress. |
| 3 ⚑ | **"When you lie down" and "When you rise" have no home.** | They become cards in the carousel at their times: evening and next morning, tagged "Before sleep" and "This morning". They don't count toward the day's goal. |
| 4 ⚑ | **Coming back after a break.** The "catching up over about 4 days" message has no place. | The slim line says "Catching up · about 4 days". The cards are review cards as usual. |
| 5 | **The current-unit card** (path through the course) and the "Try again" / "Review" keep cards leave Today. | The unit path stays on each course page. Keep cards become review cards. The review picker stays reachable from Progress. |
| 6 | **Families share one plan.** `household.plan` holds one focus course for everyone. | Each member gets their own carousel from their own progress. The focus course stays household-wide for now. A member who hasn't started it gets its Welcome lesson as a card. A per-member focus can come later. |
| 7 | **One card bigger than the goal** (a 5-minute goal with a fix-up and a lesson). | A fix-up is always included. Then cards are added while they fit, always at least one. Never more than 4. |
| 8 | **A review card that empties during the day** (its items were done from Keep going). | It shows as done. |
| 9 | **Which window a review card shows** when the course has several parts. | The part holding most of the due items. Otherwise the current part. |
| 10 | **Lock-ins, Welcome and Welcome back** are their own plan kinds today. | They become card kinds the day planner can choose. The lesson builder already makes each one. |
| 11 | **Midnight.** | A new local day makes a new plan. The banner stays until then. |
| 12 | **Brand-new person, one course.** | One card (the Welcome lesson). The Keep going stack hides until there's a second course. No dots for a single card. |
| 13 | **"Review" on a course with nothing due.** | It still works: the course's weakest items (as the review picker does now). |
| 14 | **Measuring whether it works.** | Log card shown / started / finished / skipped with the plan's id, beside ADR-001's calibration logging. |
| 15 | **Accessibility.** | Carousel cards are a labelled list with keyboard arrows. Dots are buttons. The card shuffle is skipped under reduced motion. |
| 16 | **Rollout.** | The new Today is behind the owner-only (labs) flag first, then everyone. The old Today stays until then. |

## Build phases (joint)

| Phase | Work | Visible change |
|---|---|---|
| **A. New Today** | Reviews from every started course. One forgetting curve. `dayplan.ts` (cards, order, fitting the goal). The `today` record and syncing it. Session seconds. The carousel, Keep going stack, banner and done card. Fix-up tag. Night and rise as cards. Days kept moved. Labs flag. | The new Today, for owner accounts |
| **B. Engine** | ADR-001 steps 1–5: memory per part, rebuild from answers with snapshots, the grading table, fitting a lesson to time, look-alike index, calibration columns. | Smarter cards and lessons; the screens stay the same |
| **C. In memory and settings** | ADR-001 steps 6–7: "in memory" from the model, settings fitted to Katekize's data, brake on new material. | "Strong until about March" on Progress |
| **D. Personal and research** | ADR-001 steps 8–9. | – |

### Phase A, in order

1. **Engine fixes:** reviews from every started course, and one curve. Unit tests.
2. **`dayplan.ts`:** a pure function `planDay({ member progress, started courses, focus, goal, now })` that returns
   cards. Tests: ordering, fitting the goal, fix-up always in, at least one card, at most 4.
3. **The `today` record:** made once per day, completion matching (Decision 3), session seconds, merge across phones.
   Tests.
4. **Today screen:**
   - carousel of `CourseCard` (window, tag, name, Start);
   - done state;
   - "Done for today" card;
   - banner and slim line;
   - Keep going stack (rows, open card with Next lesson and Review);
   - night and rise cards.
5. **Lesson page:** `?card=<id>` starts a card and marks it done when finished. `?course=<id>&kind=lesson|review`
   for Keep going.
6. **Progress:** days-kept week view moved in.
7. **Labs flag, browser tests (Playwright with the fake server), deploy.**
