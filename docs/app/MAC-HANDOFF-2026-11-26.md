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
