# ADR-004: five levels, and a simpler Progress tab (2026-11-27)

Owner's call: simplify Progress, and replace the seven stones with five plain levels.

## The five levels (what people see)

| Level | Stone | Means |
|---|---|---|
| Familiar | Stone | Recognize it. |
| Recalled | Bronze | Bring it to mind. |
| Memorized | Silver | Recite it accurately. |
| Proficient | Gold | Recall it fluently and reliably. |
| Expert | Diamond | Recall it effortlessly and accurately, even after extended periods without practice. |

## Mapping (display only: `src/heir/tiers.ts`)

The engine is untouched. `p.levels` still holds the six internal stones (never go down), awards, fixtures and keep rules are the same.

- engine 0 (recited or practised) shows as Familiar; engine 1 = Recalled; 2 = Memorized; 3 = Proficient; 4, 5 and 6 = Expert.
- The finish screen only announces a move to a **new** tier (Emerald to Sapphire is not news; both are Expert).
- Friends' profiles show tiers Bronze to Diamond (Diamond sums engine 4 to 6).
- Gems are drawn (gradients), not the old photos. Stone/Bronze/Silver/Gold/Diamond colours are in `tiers.ts`.

## Progress tab, now

Title, ring row, words arc (button "Review N soon" / "Bring N back" kept, the two sentences removed), This week, Growing, Levels (5 rows: gem, name, count at that level, share bar, link "What the levels mean"), Your windows.

Hidden for now (code removed from the page; easy to restore from git): how a word gets into memory, keeping rows, days kept card, month calendar, Understanding, Awards, "Closest next".

Also changed to the five levels: question page, course rows, lesson finish screen, How it works, Plan screen, friends' profiles, linked accounts, katekize.com landing.

## For the Mac session

Port `tiers.ts` as a pure mapping (`tierOf(level, started)`), draw five gems, and apply the same hidden sections and finish-screen rule. No engine or fixture change.
