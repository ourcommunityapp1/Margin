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
8. Stones (unchanged content), Understanding (labs accounts only), Your windows (every window lights up when seen, tap to open), community preview, Awards.

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
