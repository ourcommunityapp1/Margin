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
