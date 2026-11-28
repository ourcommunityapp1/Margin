# Message for the Mac session (Nov 26, 2026)

Paste everything below the line into Claude Code on the Mac.

---

Pull the branch first: `git pull origin claude/sleepy-goldberg-gjg4bh`. The website changed today and the iPhone app needs to match.
Read `docs/app/CHANGES-2026-11-25.md` from the heading "Nov 26 · Today is now one big thing (B4)" to the end: it has the exact
sizes, colours, wording and rules. The website code to copy is `src/app/heir/ui/today.tsx`, `src/app/heir/heir.css` (the `hr-b4-*`,
`hr-pc*`, `hr-strength`, `hr-cstats`, `hr-ring`, `hr-kv` rules), `src/app/heir/ui/photo-circle.tsx`, `src/app/heir/ui/glass/mini.tsx`
(`reveal`), `src/app/heir/ui/course-list.tsx`, `src/app/heir/ui/item.tsx`, `src/heir/photos.ts` and `src/heir/item-stats.ts`.

## 1. Check the engine first (I already changed it)
I added `morningPicks` to `mobile/lib/engine/planner.dart` (same as `src/heir/planner.ts`) and a `morning` field to
`fixtures/engine/journeys.json`, checked in `mobile/test/engine/journey_test.dart`. The cloud has no Flutter, so it is untested in Dart.
Run `cd mobile && TZ=America/Chicago flutter test test/engine` and fix any mismatch **in the Dart only** (the TypeScript is the truth).
Don't edit anything else in `mobile/lib/engine/` or `fixtures/`.

## 2. Today screen (`features/today/`)
Replace the carousel and the night/morning banner with:
- **Background** for the whole screen: dawn gradient (#3a2a26 → #1d1d24 → #11161c) when "When you rise" is the big card, night blue
  (#141d38 → #0d1224 → #0a0e1b) when "When you lie down" is, plain #11161c otherwise.
- **One big card, no box around it.** Which one:
  1. "When you rise" before noon (if not done today);
  2. otherwise the first unfinished lesson / review / fix (window 190 px, lighting up as now);
  3. otherwise "When you rise" if still not done (until 7 pm);
  4. otherwise "When you lie down" from 7 pm to 3 am;
  5. otherwise "Done for today" (window of the course worked on longest, minutes, Extra practice if offered).
  Under it: serif title, one grey line naming what it covers, and a peach pill button (pale blue at night) like
  **"Start review · 4 min"** (normal pill size, minutes after a dot, slightly dimmer). No "Now" label.
- **What-it-covers line:** "Questions 1–4" (three or more in a row become a range), "Questions 1, 2 and 4", "Question 4", a verse's
  reference ("Luke 2:11"), or "Christmas review" for a review of several verses. The two recalls have no course title above them, so they
  name it: "Westminster Shorter Catechism questions 1 and 2". Never "from last night".
- **Photos** for the recalls: 180 px circle, dark 5 px gap, 6 px stone ring #7C7364, soft halo, slow drift and glow (still with reduce motion).
  Copy `public/heir/dawn/*.webp` and `public/heir/dusk/*.webp` into the app's assets; pick one per day with the same hash as `photoFor`
  in `src/heir/photos.ts` (the night one uses salt 7).
- **Rows below, not tappable**, divided by thin lines:
  - first line small caps: "Up next", then "Then"; "This evening" in blue (#a9bde8) for "When you lie down";
  - second line: **Course · references** ("Shorter Catechism · Q4, Q9", at most three then "+N");
  - minutes on the right ("5 min");
  - a 48 px window (or a 40 px photo for the recalls).
- **"When you lie down" is always there from 5 am** (as the "This evening" row), and "When you rise" from 5 am until done or 7 pm.
  Done = a session today with kind `rise` / `night` (or `p.night` this evening). Items: `morningPicks` for the morning; `bedtimePicks`
  for the evening, falling back to `morningPicks` when empty. The lesson runner uses the same for `mode rise` / `mode night`.
- **Done** list at the bottom under a grey "DONE" divider: smaller (36 px window, 30 px photo), dimmed, "Course · references" (the items
  answered in that session, from the answer log), and a peach tick where the minutes were.
- **Remove "Keep going"** from Today.
- **Every small window lights up** when 60% on screen: dark, wait 350 ms, then pane by pane in the same `sweepOrder` as the full window
  (about 2.5 s, each pane fading up over 400 ms), dust after. The final picture must equal the still window exactly.

## 3. Course and question screens
- **Course screen:** three boxes under the course card: learned of total, in memory (keeping rules: kept or review), average strength.
  Each learned question or verse shows its strength % on the right: green #b9e3b0 at 85%+, amber #f0c27a 70–85%, red #f0a08a under 70%,
  and "Today" instead of a number if practised today. The old status goes small under it.
- **Question / verse screen:** a strength ring beside the stone, then Learned, Practised (N times · M right), Last time (· a slip),
  Often missed (a word missed at least twice), Next review. Then **Practice** (a mix of steps, `mode item`) and **Review** (`mode keep`
  with that one item: the whole answer from memory), each with a one-line note. Port `src/heir/item-stats.ts` to Dart outside the engine
  folder (e.g. `lib/state/item_stats.dart`) with a widget test.

## 4. About screen
Add "Sunrise and night photos on Today": the four Wikimedia ones with photographer, licence (CC BY-SA 4.0) and link; the nine Unsplash
ones say "Photographer on Unsplash (name to be added)". The list is in `src/heir/photos.ts`.

## 5. Before pushing
`flutter analyze` clean, `TZ=America/Chicago flutter test` green, screenshots in the simulator at about 6 am, 3 pm and 9 pm, then
commit and push to the same branch (if rejected: fetch and merge, never force-push).

---

# Part 2 (later the same day): the new Progress screen

Paste this as a second message once Part 1 is done (or together with it). The website's Progress screen changed after Part 1 was written.
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

## Also: the community card moves to Friends
Remove `CommunityPreview` from `features/progress/progress_screen.dart` and show it at the top of the Friends screen, above "Friend requests" (hidden while a search is showing).
The small dot on the tab bar that says "your place on the leaderboard changed" moves from the Progress tab to the Friends tab. Nothing else about the card changes.
