# ADR-003: A weekly rhythm, light steps, and grace in feedback

Status: **built on the website** (Nov 27, 2026); the engine is ported to Dart and the app screens are still to do (see docs/app/CHANGES-2026-11-25.md). See "Owner's corrections" below, which override the first draft. Amends ADR-001 (Decision 5, cue fading) and ADR-002 (Decision 5 and "After first use").
Mockup of a week: https://claude.ai/artifact/KzCidu6f6R525MEym1Li5d

## Why

The owner, after using the new Today for a day:
- Most of the work was typing whole verses and answers. That is the hardest kind of step, and it came even at 65% strength.
- Typing a whole verse or catechism answer should be used **intentionally and transparently**, so a person knows before they start whether they
  have the energy for it.
- "When you rise" and "When you lie down" should be **light**: fill in the blanks, put the phrases in order, first letters. Light steps are easy
  enough that a person can do more of them.
- Three things pull against each other: **time** (Today should take about 6–8 minutes), **effort** (how hard the steps are) and **new versus
  kept** (learning something new versus keeping what is already learned).
- Today's job is to give **structure and early confidence** that you're making progress. In any week a person should keep up with what they've
  learned, learn a little that's new, and strengthen what's shaky.
- **Consistent repetition across the week**, on different days, beats long sessions.
- **More grace.** Getting the main words and ideas (about 70–80% or more) is good. A perfect answer, especially a whole answer typed from memory,
  deserves a real celebration. About 50–75% gets "Good job, we'll strengthen this". Under that: "No problem, you're still learning".

The owner's answers to the follow-up questions: about 7 minutes a day, and people can always do more; whole-answer typing at check-ins,
otherwise minimal; about three to five new pieces a week ("probably").

## Research it rests on

- **Successive relearning** (Rawson & Dunlosky): practise retrieval until you get it right once in a session, then relearn the same way on
  several later days, spaced further apart. It beats both cramming and a single round of retrieval for long-term retention, at little extra time.
  The app already does both halves: a miss comes back once at the end of the session, and FSRS spaces the later days.
- **Retrieval practice** (for example "Optimizing Schedules of Retrieval Practice for Durable and Efficient Learning", 2011, and "Practicing
  Retrieval Facilitates Learning", 2021): effortful recall strengthens memory more than re-reading, but its value per minute falls once an
  item is recalled reliably. So the expensive kind of recall should be spent where it proves or repairs something, not everywhere.
- **Cued recall** (first letters, blanks, order) is real retrieval with support. It builds and repairs memory cheaply. It is weaker evidence
  that something is *stored*, which is why the model rates it "Hard" at best (ADR-001 Decision 4).

## Owner's corrections (Nov 27), which override the first draft below

- **85% is the target.** Today does not spend extra effort on precision beyond that: an item at 85% or more is good enough and gets at most a quick
  light touch.
- **No whole-answer typing because an item is "due" when it is already at 75% or more.** Typing the whole answer is much harder and adds little when
  recall is already good enough. So the "check-in" of Decision 2 is **dropped**: reviews are light at every strength.
- Whole recall stays only where it proves or protects something: a **fix** (G5), a **lock-in**, a **new lesson's one closing recall** (G4), and
  **"Test myself"** when the person chooses it. That makes the daily cap of Decision 4 unnecessary for reviews.
- **What this means for stones:** stones need unaided whole recall on later days (G4). With reviews light, stones rise through lock-ins, fixes and
  "Test myself". A gentle, optional invitation on Today ("Q4 is ready for Amethyst: type it from memory, 1 min, if you like") is proposed as the
  next step, so stones keep moving without making anyone type by default.

### Built (Nov 27)
- **Reviews are light** (`ladder` in `src/heir/lesson.ts` and `mobile/lib/engine/lesson.dart`): under 75% fill in the blanks (or match) then first
  letters; 75–85% first letters; 85% and over one quick touch (tap the wrong word or fill in the blanks). Never the whole answer. With no model
  chance, also light. Fixtures regenerated: only `buildReview` and `buildRise` cases changed (104 each).
- **"When you rise" is light** (`buildRise`): one step per question, fill in the blanks and putting the phrases in order in turn, then a verse.
- **Feedback bands** (`src/heir/feedback.ts`, test `feedback.test.ts`; `lesson.tsx`, `steps.tsx`, `heir.css`): Perfect (gold; a whole answer from memory
  gets a bigger, glowing pill), Correct (green), "Good. We'll strengthen this." (soft green), "Good job. We'll strengthen this." (warm), "No problem,
  you're still learning." (calm blue). Main words count fully, small words a quarter. The strict `ok`/`correct` is unchanged; a test proves a band
  never turns a miss into a pass. A miss still comes back once at the end ("It'll come back once more at the end.").
- **Effort said up front** (`today.tsx`): the big card shows "Light", "Ends with one full answer", "✎ Type it from memory" (fix) or "✎ Lock it in";
  rows with a full answer show "✎" before their minutes.

### Amendment to G4 (owner, Nov 27): light recall earns the first three stones
"Light should light up with consistent recall on a variety of steps." Reviews are light, so the first three stones can now also be earned by
**consistent recall across a variety of light steps**, weighed by how much each shows. Whole recall still counts in full, and **Emerald, Sapphire and
Diamond (six months and longer) still need whole recall**; "Recited" still needs the lesson's typed answer. Nothing else changed: keeping rules,
fixes and the strict grade are untouched.

| Step | Weight | Standard |
|---|---|---|
| Whole answer (type or say) | 1 | as before: right, no hints |
| First letters | 0.9 | right, or within the allowance (a slip or two), no hints |
| Fill in the blanks | 0.75 | right, or within the allowance, no hints |
| What comes next | 0.6 | **right the first time** (easy) |
| Put the phrases in order, tap the wrong word | 0.5 | **right the first time** (easy) |
| Match the question | 0.4 | **right the first time** (easy) |

- A session shows the weights of the distinct kinds answered right, at most 1. A kind missed first and put right in the same session counts half.
- **Remembered:** a later day (than the lesson) with at least 0.5. **Memorized:** three days (the lesson day counts) with at least 0.5 each, and two or more
  kinds of step among the light days unless a later day was a whole answer. **Lasting:** after a gap of three weeks, with at least 0.7 (so an easy step alone
  is not enough).
- **A miss starts the light count again:** a session in which a light kind was never answered right cancels the light days before it; whole answers always count.
- Code: `src/heir/levels.ts` (`LIGHT_WEIGHT`, `evidence`, `countingSessions`), ported to `mobile/lib/engine/levels.dart`; tests in `src/heir/test/levels-light.test.ts`;
  fixtures regenerated (only the simulated learners' level-ups changed).

### Also built (Nov 27)
- **Default daily goal 7 minutes** (`DEFAULT_GOAL`; 5, 7, 15 and 25 are offered; anyone with a saved goal keeps it). Today, Courses, Progress, You, Plan and Start use it.
- **About three to five new pieces a week** (`NEW_PER_WEEK = 5` in `dayplan.ts` and `dayplan.dart`): at five new lessons in the last 7 days there is no new lesson today (a review instead, or nothing), joining the existing brake. Test added.
- **Review time estimates** are about half a minute an item (`reviewEst` now `ceil(due × 0.5)`), since reviews are light.
- **The week in one line on Progress** (`src/heir/week.ts`, test `week.test.ts`): learned, kept up, strengthened, days kept (last 7 days). Pure; the app ports it outside the engine folder.
- The "ready for a stone" invitation is dropped: light recall now moves the first stones on its own.

### Next
- Decision 5: a 7-minute default goal (the goal options live in the engine's `GOALS`, so this is an engine and Dart change) and the weekly target of
  about 3–5 new pieces.
- Decision 9: the week line on Progress.
- Review time estimates (`reviewEst`) still assume two steps per item; lighter reviews will finish sooner than the card says until it is adjusted.

---

## What must not change (the guard rails)

These were decided earlier on purpose. The new plan works *around* them. Each one gets a test that fails if it is broken.

| # | Rule | Where it was decided | How this plan keeps it |
|---|---|---|---|
| G1 | **The words of God are never changed.** Scripture, catechism and creed text is exact. | HANDOFF rule 1 | Nothing here touches content. |
| G2 | **A window is never lit more than earned.** | HANDOFF rule 2 | Celebrations use the earned light only. |
| G3 | **The memory grade stays strict.** Good = every word right, unaided. Hard = within the allowance, or any cue (first letters, a hint). Again = above the allowance, or with the answer shown. | ADR-001 Decision 4 | **Grace is in the words on screen, not in the grade.** The `correct` flag in the answer log, the FSRS grade and `p_recall` logging are worked out exactly as now (typed pass 90%, spoken 80%, the allowance). A 75% answer *looks* good to the person; the model still records it as a miss and brings it back sooner. |
| G4 | **Stones are earned only by unaided whole recall** (Recited, then Amethyst and up), computed from the log, and never go down. | PROGRESS_PLAN "Stages" | Untouched. Stones read the strict `correct` flag (G3). The new lesson keeps its one closing whole recall, so "Recited" is earned the same way (see Decision 6). |
| G5 | **"In memory" and the keeping rules.** A missed whole recall must be fixed by the end of the next day; the model's 70% line with 7-day hysteresis; the 30-day launch grace. | ADR-001 Decision 6, keep.ts | Untouched. **Fix cards stay whole recall** and are never pushed past their deadline by the new daily cap (Decision 4). |
| G6 | **Answers are the truth.** Memory is replayed from graded answers; the Dart engine is identical to the TypeScript engine, proved by shared fixtures. | ADR-001 Decision 1, HANDOFF rule 3 | Every engine change here is made in TypeScript first, fixtures regenerated, the Dart port updated, both test suites green. |
| G7 | **The day's plan is made once and kept**: cards are never reordered or removed during the day; a fix found later is added at the end; one course per card. | ADR-002 Decisions 1–2 | Untouched. The new mix decides *which* cards and *which steps*, once, when the day is planned. |
| G8 | **The brake on new material** (reviews filling over 70% of the goal, or a lesson turned into practice at 6 due or under 80% right). | ADR-002 "After first use" | Kept, and joined by the weekly target (Decision 5). Never loosened. |
| G9 | **Successive relearning inside a session**: a missed step comes back once at the end. | lesson.tsx | Kept for every answer that is not a pass by the strict grade (including the "Good job, we'll strengthen this" band). |
| G10 | **The morning and evening recalls** appear every day from 5 am; "When you rise" first while not done; "When you lie down" from 7 pm; neither counts toward the day's goal. | Nov 26 decisions | Untouched; only their steps get lighter (Decision 3). |
| G11 | **Days kept**: Sunday rest and one free day a week; any finished lesson or review keeps the day. | levels.ts | Untouched. |
| G12 | **Voice-typing forgiveness** ("Mann", "principal", plurals); "Good" is never "God", "thee" is never "the". | grade.ts | Untouched. |
| G13 | **Old app versions keep working**: data and API are only added to. | HANDOFF rule 6 | New fields are optional; old plans without them still load. |

---

## Decisions

### 1. Two kinds of step: light and whole

- **Light:** put the phrases in order, fill in the blanks, first letters, what comes next, tap the wrong word, match.
- **Whole:** type or say the whole verse or answer from memory.

Every step is one or the other. Light steps are the default everywhere.

### 2. Where whole recall happens (and only there)

| Moment | Why it's whole | Shown as |
|---|---|---|
| **Check-in**: an item whose scheduled review has come (FSRS due) and whose chance of recall is 75% or more | Proves it is stored, and moves the schedule out (a few days, a week, a couple of weeks, a month and on) | "Check-in · type it from memory" |
| **Fix**: a whole recall that was missed and must be fixed by the end of the next day (G5) | Protects the words in your count | "Fix today · type it from memory" |
| **Lock it in**: the end of a unit | Meant to be hard, says so | as now |
| **A new lesson's one closing recall** of the piece just learned | Earns "Recited" (G4) | "Learn · ends with one full answer" |
| **"Test myself"** on a question's page (today's "Review" button) | The person chose it | as now |

An item due but **under 75%** is not a check-in yet: it gets light **strengthen** steps until it is back above 90%, and its check-in comes on a
later day. That is successive relearning: relearn with support, then prove it on another day.

### 3. The morning and evening recalls are light

- **When you rise:** put the phrases in order, or fill in the blanks (alternating), one step per question. Up to about 6 questions (about a minute).
- **When you lie down:** first letters, one step per question, then a verse to think on (as now).
- Both are graded like any light step (Hard at best), so they strengthen without counting as proof.

### 4. A daily cap on whole recall

- **At most 2 check-ins a day** on the main card, plus the new lesson's one closing recall if there is a lesson.
- Check-ins beyond the cap wait for a later day, **most overdue first**. The schedule has slack; a day or two late costs little.
- **Fix cards are outside the cap** and always come (G5).
- The cap applies to what Today plans. Extra practice and "Test myself" are the person's choice.

### 5. The day is about 7 minutes, balanced over the week

- **About 7 minutes:** "When you rise" (~1), the main card(s) (~5), "When you lie down" (~1). The daily goal stays the one time setting
  (ADR-002 Decision 5). Its default becomes 7 minutes, with 15 and 25 still offered; anyone already on 15 or 25 keeps it. "Extra practice"
  stays for anyone who wants more.
- **The main card mixes three jobs, in this order, until the minutes are used:**
  1. **Keep:** fixes (always), then up to 2 check-ins.
  2. **Strengthen:** items under about 85%, weakest first, light steps.
  3. **Learn:** one small new piece if there's room and the brake allows (G8).
- **The week:** the planner also looks at the last 7 days and aims for about **3 to 5 new pieces a week**. If keeping up fell behind (many check-ins
  waiting), new learning pauses until it catches up. Sunday is rest (G11).
- Cards stay one course each (G7). A day may have a review card for one course and a lesson card for another, as now.

### 6. New lessons stay as they are, with one whole recall at the end

- A new lesson keeps its steps (see it, order it, fill in the blanks, first letters) and **one** closing whole recall of the new piece. This is the
  only whole recall in a lesson, it earns "Recited" (G4), and the card says so before you start.
- Its next whole recall is its first check-in, a few days later.

### 7. Grace in feedback (words and colour only)

The band is worked out from the share of **main words** recalled (small words like "the", "and", "of", "a", "to", "in" count for little). It changes
**only what the person sees**; the grade, `correct`, stones and the schedule are worked out exactly as now (G3).

| Band | Shown | Colour | Comes back at the end of the session? |
|---|---|---|---|
| Perfect (strict pass, no slips) | "Perfect!" — and for a whole answer from memory, a bigger celebration (the window's light, a warm glow) | gold | no |
| Pass by the strict grade (within the allowance) | "Correct!" | green | no |
| About 75% or more of the main words, but not a strict pass | "Good. We'll strengthen this." | soft green | yes (G9) |
| About 50–75% | "Good job. We'll strengthen this." | warm, not red | yes |
| Under 50% | "No problem, you're still learning." | calm grey-blue | yes |

- The missed words are still shown underlined, so the person learns from the answer.
- The Continue button takes the band's colour (no coral "wrong" button any more).
- "Not quite" and "Almost" go away.

### 8. Say the effort before it starts

- Every row on Today says its kind and effort: "Check-in · type it from memory", "Strengthen · fill in the blanks", "Learn · new", "Light".
- The big card shows a small chip: "Light" or "✎ Type it from memory".
- The day line under Today's hero: "About 7 min · 1 full answer" (or "all light").

### 9. The week in one line on Progress

"This week: 4 learned · 5 check-ins kept · 7 strengthened · 6 of 6 days kept", counted from the answer log and the day records (nothing new
is tracked).

---

## Build plan

| Step | What | Where | Tests |
|---|---|---|---|
| 1 | **Feedback bands** (Decision 7): `feedbackBand(text, said)` from main words; strict `ok` and the logged `correct` unchanged | `src/heir/grade.ts` (+ Dart `grade.dart`, fixtures), `lesson.tsx`, `steps.tsx`, `heir.css` | Band thresholds; **the strict grade, `correct` and FSRS grade are identical before and after for every fixture case (G3)** |
| 2 | **Light morning recall** (Decision 3) | `buildRise` in `lesson.ts` (+ Dart, fixtures) | Rise has no whole-recall steps; night unchanged |
| 3 | **Light reviews with check-ins** (Decisions 1–2): the review builder gives one light step per item; strengthen items two light steps; a check-in item one whole recall | `buildReview`, `ladder` in `lesson.ts` (+ Dart, fixtures) | No whole recall below 75%; a check-in is exactly one whole recall; fixes and lock-ins unchanged (G5) |
| 4 | **Daily cap and weekly mix** (Decisions 4–5) | `planDay` / `dayplan.ts`, planner (+ Dart, fixtures) | At most 2 check-ins; fixes always included and never late (G5); brake unchanged (G8); about 3–5 new a week in a 30-day simulation; plan made once (G7) |
| 5 | **Effort labels** (Decision 8) | `today.tsx` | Labels match the steps the lesson builds |
| 6 | **Week line** (Decision 9) | `progress/page.tsx`, a small pure function with a test | Counts from a known log |
| 7 | **Handoff** | `docs/app/` | The Mac session ports steps 1–6 with the same fixtures |

Steps 1 and 2 are small and can ship first. Steps 3 and 4 change the engine and ship together, after a 30-day simulation of a few learners shows:
- the minutes per day stay about 7;
- no item's keep deadline is missed because of the cap;
- words in memory after 30 days are no lower than with today's engine (if they are, the cap or the 75% line is adjusted, not the guard rails).

## Open questions for the owner

1. **Thresholds:** 75% of main words for "Good", 50% for "Good job"? (Proposed.)
2. **Default daily goal 7 minutes**, with 15 and 25 still offered? (Proposed.)
3. **The new lesson's one closing whole recall** stays, because "Recited" depends on it (G4). Removing it would change how stones and "in
   memory" are earned, so it is kept unless the owner says otherwise.
