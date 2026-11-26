# Katekize: progress you can see and enjoy (plan)

Agreed in outline; layouts are being chosen from low-fi mockups before anything is built.

## Principles
- One question per area: how much do I carry in memory? where am I in each course? what of the Bible do I know?
- Glass and stone, not charts: windows lit pane by pane, the foundation stones, light passing through.
- Overview first, detail on tap.
- Honest numbers: "learned" (lesson done) and "in memory" (a stone earned: it survived a night's sleep) stay apart.
- Calm delight: no confetti, streak guilt or badges for their own sake.

## Progress tab
1. Words in your memory: one big number, "of N learned" under it, and a ladder of light (Learned → Know →
   Memorized → Mastered → Long-term) filled in each stone's colour. "This week" line.
2. Your windows: every course begun, lit as on Today, with "8 of 107"; tap opens the course's progress page.
3. Your Bible: every verse known across courses (counted once), by book, on a 66-book shelf. (Under review.)
4. Stones (existing), with "Closest next" tappable.
5. Days kept (existing calendar), plus best run and this year's count. Sundays stay rest days.

## Measures (one definition each, used everywhere)
- Words learned: words of every part with a finished lesson, on your track.
- Words in memory: words of items at Amethyst or above. Memorized / mastered / long-term: Topaz / Carnelian / Emerald+.
- Verses known: distinct verses across courses (Psalm 23:1 once); a passage counts each verse.
- Course progress: items learned of the course's own total, and how many have a stone.

## Milestones (words in memory)
10, 25, 50, 75, 100, 150, 250, 500, 750, 1,000 (more later). Each shown once, with a line putting it in
context, then kept in a Milestones list.

## Course progress page
Larger interactive window (tap a lit pane to see what lit it); a pane map, one pane per item, grouped by the
course's parts; items learned and words in memory; time left at the current pace; next lesson.

## Moments (rare)
Panes lit at the end of a lesson; a stone earned; a milestone; a part's window filled; optional Sunday recap.

## To do: build out the Westminster Larger Catechism (all 196 questions)
- [ ] Text of all 196 answers from the 1648 text (public domain), spelling handled as for the Shorter Catechism
      (rules shown to the owner before any change); a script checks the text against the source.
- [ ] Measure its size (answers are much longer than the Shorter's) and split long answers into parts so each
      lesson stays 5-10 minutes.
- [ ] Three parts with a window each: Q1-5 (God and Scripture), Q6-90 (what we believe), Q91-196 (our duty).
- [ ] Proof texts with every answer (for related verses and Diamond).
- [ ] A meaning question for each answer, marked not yet reviewed; build in batches of 20-30 questions.

## Order
1 Measures as tested code · 2 Words + windows (mockup first) · 3 Bible (mockup first) · 4 Course progress page
(mockup first) · 5 Moments · Larger Catechism in parallel.

## To do: lesson screens (reported 2026-11-23)
- [x] **Multiple choice: the selected answer looks wrong.** The selected option is shown in yellow/amber (the
      "select" colour), which reads as a warning. Fix: a neutral selected state (outline + slightly lighter fill);
      right = green with a tick, wrong = muted red with the right answer shown in green.
- [x] **Two buttons at once after Check.** The feedback sheet's Continue appears while the card's Check is still
      visible. Fix: one fixed button area at the bottom of every lesson screen; Check turns into Continue in the same
      place (the sheet shows only the feedback text), so there is only ever one primary button.
- [x] **Put the phrases in order: placed vs. not placed is unclear, and the layout jumps.** Fix: placed tiles leave a
      dashed, empty slot in the bank (so nothing reflows); the answer area has fixed rows that fill top to bottom;
      placed tiles in the answer are solid, bank tiles outlined; tapping a placed tile sends it back to its own slot.
- [x] **Keep the context when learning a later phrase.** When practising part 2+ of a verse or answer, show
      everything before it (the verse or answer up to where this part starts) above the exercise, quieter, so the
      phrase is learned in its place, not on its own. Applies to every exercise kind (order, blanks, letters, say,
      type); long lead-ins fade from the top.

## Stages (research-based, Nov 2026)

Two separate tracks. Stones measure memory only; understanding is its own track. Stones earned under the
earlier rules are kept (levels never go down); the new rules apply from now on.

**Memory ladder.** Every stone needs unaided recall: the whole thing typed or said, right, with no hints.
Gaps count from the item's previous session of any kind, so they measure time truly away.

| Stage | Stone | Rule |
|---|---|---|
| Recited | — | Every part typed in full with no hints at its lesson |
| Remembered | Amethyst | Unaided on a later day (after a night's sleep) |
| Memorized | Topaz | Unaided on 3 different days |
| Lasting | Carnelian | Unaided after 3+ weeks away |
| Long-term | Emerald | Known 6 months; every full recall in a 6-month span right (2+), one after 2+ months away |
| Enduring | Sapphire | Known a year; unaided after 6+ months away |
| Lifelong | Diamond | Known 3 years; unaided after a year away |

Basis: delayed unaided recall is the standard test of long-term retention; spacing and successive relearning
(Cepeda et al. 2008; Rawson & Dunlosky) keep it; Bahrick (1984) found that what survives the first 3–6 years
stays for decades, so Diamond asks for recall after a year away, three years on.

**Understanding.** Learned (answered what it means) → Understood (explained in your own words, self-checked
against the notes; `explained` in progress) → Mastered (also every related verse recalled from memory).
Only items with meaning notes have this track. Self-explanation (Chi) is the basis: understanding shows in
explaining, not in recognizing a right answer.

**Status: labs only.** The understanding track (the "In your own words" card, the Understanding section on
Progress, the Mastered wording on related verses) shows only to the accounts in `src/heir/labs.ts`.

**To do: understanding, taught and assessed by AI, inside the lessons.**
- [ ] Bake understanding into the normal lesson plan, not a separate card: a step in the lesson flow, spaced
      like recall (e.g. after an item is Remembered, then again later).
- [ ] An AI model asks the learner to explain in their own words, assesses the answer against the text, the
      meaning notes and the proof texts, and gives specific feedback.
- [ ] When the answer misses something, the model teaches: asks a follow-up, points to the words in the text or a
      related verse, and has them try again. Not self-graded.
- [ ] Levels come from the model's assessment (Learned → Understood → Mastered), recorded with what was asked and
      the verdict, so it can be reviewed; keep it separate from the memory stones.
- [ ] Theologically careful: the model judges against the catechism's own answer and Scripture, never invents
      doctrine, and quotes Scripture only from the verse service (exact text).
- [ ] Children's track: simpler questions, encouraging feedback.
- [ ] Server route for the model (key kept server-side), rate limits, and a fallback when offline.

## To do: find sunrise and night photos we can credit (requested 2026-11-26)

Today's "When you rise" and "When you lie down" circles will show real photographs, not emoji (mockup: https://claude.ai/artifact/LVxYQkiMggQhZTBUxRfYKS).

- **The nine photos the owner liked** (bright sunrises and colourful night scenes) are from Unsplash, so they can ship (Unsplash's licence
  allows free use without credit; credit is polite). Record each photographer and link when known, and add them to the About page.
- **Plus** photos we can credit: Unsplash, Pexels or Wikimedia Commons, free to use. Keep a list of photographer, link and
  licence for each, and put the credits on the About page next to the stained-glass window credits (a test already fails if a window is not credited).
- **Wanted:** clear sunrises (the sun visible, warm colour) and night or dusk scenes (stars, northern lights, a lit town at dusk). Reformation
  churches (Grossmünster, St Giles', Geneva's St Pierre) are nice but not required. A short looping clip would be a bonus.
- Photos found so far with licences are in the mockups (Wikimedia Commons, CC BY-SA or CC BY): Grossmünster, St Giles', St Pierre, and sunrises
  of Edinburgh and Lake Zurich. Credit lines are listed at the bottom of those mockup pages.
- Size: small copies (about 600 px, 50 to 100 KB each) so the app stays light; the circle is 180 px.

## To do: explore Today by course, with the person choosing their focus course(s) (requested 2026-11-25)

Mockups first, then decide. The aim: nobody ever chooses *which verse* to learn next; they choose only *which course(s)*, and
Today shows where they are and what is left, today and tonight.

- **Focus courses.** Today's plan has one focus course (`household.plan.course`): its lesson, plus reviews from the other started
  courses. Explore letting a person pick one to three focus courses, each with its own recommended lesson (and review) card, and the
  daily goal shared between them. Keep old app versions working: add an optional `plan.focus: string[]`, keep `plan.course`.
- **A day in three beats:** morning recall (if any), today's cards, tonight's recall (shown in the plan, not only as an evening
  banner), so "what do I have to do today, and tonight" is answered at a glance.
- **Decided 2026-11-26: every lesson and every review is one course,** with that course's window. A lesson is one new verse or
  question; a review holds several from that one course. Two courses due means two review rows. The memory engine decides how
  many rows and how long each is. Direction: calm rows (window, course, one line), a quiet *This evening* divider, the review's
  questions in a sheet on tap, and after a lesson that lights glass a pop-up of the window lighting with one sentence.
  Mockups: https://claude.ai/artifact/KbS4qrgYEVKHdhnB3S8wFj
- **Say what each card will do** in one short line (which lesson, which verses, about how long); no walls of text.
- **The window as the scoreboard:** "7 of 12 verses · lesson 4 of 9", and what today's work added, using what the planner already
  works out (`project`, `courseStats`, `daysKept`).
- **How far along, in total:** days kept, lessons, words in memory, windows lit, a finish-line date at the person's pace.
- Needs an engine change if focus courses are added (`planDay` and its fixtures, the Dart port, both Today screens).

## To do: everything you know, and how strong (requested 2026-11-24)

Mockup first, then build.

- **Entry point.** A link on Progress, e.g. "Everything you've learned", opens a new page.
- **The list.**
  - Every verse, catechism answer and creed section you've ever learned, across all courses.
  - Each shows its strength now (the same number reviews use), its stone, and when it was last practiced.
- **Filter:** by course, by kind (Scripture, catechism, creed), and by strength band (strong, holding, needs a look).
- **Sort:** weakest first (the default), strongest first, longest since practiced, or course order.
- **Tap an item:** its page, with strength over time and a "Practice this" button.
- **Common mistakes (data visualization).**
  - Per item: the words most often missed or swapped, highlighted in the text.
  - Across items: which verses or answers trip people up most, and where in the text (start, middle, joins between
    parts).
  - It depends on recording which words were missed (below). It can also show patterns across everyone, never
    anyone's answers.
- **Needs (both now recorded, since 2026-11-24, so history is building):**
  1. **Missed-word positions:** `heir_answers.missed`, the 0-based positions of the words missed or shown in the part's
     text (typed, said, fill-in-the-blank and first-letters answers). Never what was typed.
  2. **Card events:** `heir_events`, one row per card per event (shown, started, finished with its seconds). A card
     that was shown but never finished was skipped.

## To do: a weekly rhythm, light steps, and grace in feedback (requested 2026-11-26)

Planned in **ADR-003** (`docs/memory/ADR-003-weekly-rhythm-and-grace.md`), with the guard rails it must not break. Not built yet.
