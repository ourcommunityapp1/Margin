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
