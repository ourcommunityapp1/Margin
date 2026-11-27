# ADR-005: make the five levels the real levels (plan, not yet built)

Status: **plan, awaiting the owner's two decisions below.** ADR-004 shipped the five names as a display-only mapping over the six internal stones. That is a stopgap. This plan makes five levels the only levels, in the engine, the saved data, the server and both apps, so there is one scale and nobody has to translate.

## Why not stay with the mapping

- Two scales (six inside, five shown) means every future change has to remember the fold; the finish screen already needed a special rule.
- Friends' numbers, awards ("First Amethyst"), keeping windows and the Dart app all still speak six stones.
- "Expert" is currently three different engine levels. The Mac app would need the same fold in Dart.

## The new scale

Stored `levels[itemId]`: **0** none yet, **1** Familiar, **2** Recalled, **3** Memorized, **4** Proficient, **5** Expert. (Gem names: Stone, Bronze, Silver, Gold, Diamond.)

| New | Name | Rule (engine) | Comes from old |
|---|---|---|---|
| 1 | Familiar | Recited in full, unaided, at its lesson (what `recited()` is today) | "Recited", which was level 0 |
| 2 | Recalled | Recalled unaided on a later day (whole answer, or light recall at 0.5+) | Amethyst (1) |
| 3 | Memorized | Recalled on 3 different days, with variety | Topaz (2) |
| 4 | Proficient | Recalled after a gap of 3 weeks or more (0.7+ evidence) | Carnelian (3) |
| 5 | Expert | **Decision A below** | Emerald / Sapphire / Diamond (4, 5, 6) |

Grading, FSRS, light-recall weights and grace feedback are untouched. Only the ladder's top and the numbering change.

## Decisions for the owner (my recommendations first)

**A. What earns Expert?**
1. *Recommended:* the old Emerald rule: known 6 months, every full recall in that time right, one after a 2-month gap. It matches "effortlessly and accurately, even after extended periods without practice" and is reachable within a year.
2. The old Diamond rule (known 3 years, recalled after a year away). Honest to the word "Expert", but nobody reaches it for years, so the top gem would sit empty on everyone's Progress.
Sapphire and Diamond disappear either way (nothing is lost: anyone who held them is Expert).

**B. Awards.** Keep the award ids (so nobody loses one) and rename: First Amethyst → First Recalled, First Topaz → First Memorized, First Carnelian → First Proficient, First Emerald → First Expert; "…memorized" course awards keep meaning "every question at Memorized". They are hidden on Progress for now anyway.

## Work, in order

1. **Engine (`src/heir/levels.ts`)** — rewrite `LEVELS` to five entries and `levelFromLog` to return 0 to 5 (Familiar is the first step: `recited()` true gives 1). Drop Sapphire and Diamond rules. Update `nextStep`, `needsRefresh`, `settle`, `earnedLevels`, `countsFor`, `shelf`, award rules. `tiers.ts` becomes a thin look-up of the same five (names, gems); `tierOf` goes away.
2. **Everything that reads a level number.** Audit (all of them check `> 0` / `>= 1` today and each must be re-read against the new meaning of 1):
   - `measures.ts` (words "in memory" must stay "Recalled or above", i.e. `>= 2`, not `>= 1`);
   - `memory-history.ts`, `keep.ts` (`heldItems` filter, and `windowDays(level)` is keyed to the old scale: re-key it so Recalled/Memorized/Proficient/Expert keep the windows Amethyst/Topaz/Carnelian/Emerald have now, and Familiar has none);
   - `progress.ts` (`clampDue` guard), `stats.ts` (friends' counts), `statsjob.ts`, `recover.ts`, `item-stats.ts`;
   - UI: Progress, item page, course rows, finish screen, social, linked, how, plan, katekize.
3. **Migration of saved progress** (the risky part, because progress lives in localStorage, Supabase and two apps, and merges take the larger number):
   - Add `levelScale: 2` to the progress record. A record without it is the old scale.
   - One pure `migrateLevels(p)`: old 1→2, 2→3, 3→4, 4/5/6→5; old 0 stays 0, then `earnedLevels` raises anything recited to 1. Idempotent and covered by a test with every old value.
   - `mergeProgress` normalises either side to the new scale **before** taking the max, so an old device syncing later cannot push a Topaz back in as a "level 2" and be misread. Old-scale writers are migrated on read, never trusted as new.
   - Applied in `pullProgress` (local and remote) and in the server stats job.
4. **Server (Supabase).** `heir_stats.stones` is `integer[6]` with a check. New migration: change to 5 entries (collapse old 4–6 into the last), update `heir_stats_put` default and check, rewrite existing rows. Friends' profiles then show five. Ship the SQL **before** the web build that sends five-entry arrays, and keep the function accepting 6 for one release so the old Mac build does not error.
5. **Fixtures and Dart.** Regenerate `fixtures/engine/*.json` (TZ America/Chicago); the Mac session ports `levels.dart`, `keep.dart` (window re-key), `stats.dart`, `progress.dart` merge + migration, `stone.dart` (five drawn gems), and runs `flutter test`. Nothing ships to the App Store until the fixtures pass in Dart, since a mismatch would change what people see as their level.
6. **Cleanup.** Delete the six stone photos and the stone credits on About, `STAGES`, `tiers.ts`'s fold; update ADR-001/003 wording and the course "memorized" awards.

## Tests that must exist before deploy

- every old level 0 to 6 migrates as the table says; running it twice changes nothing;
- merge of an old-scale and a new-scale record equals the merge of two new-scale records;
- an item with old Topaz shows Memorized, is still due the same day, and its keeping window is unchanged;
- words-in-memory and friends' totals before and after migration are identical for a real exported record (use the owner's account: Supabase read-only compare);
- Expert rule (per Decision A) with the existing 6-month and 2-month fixtures.

## Rollout

Branch, migrate and verify on the owner's own record first (dry run: print before/after counts, no write), then Supabase migration, then web deploy, then the Mac build. Levels never go down, and the migration only maps up or across, so it is safe to re-run.

## Risks

- Anyone on an old app build after the server moves: covered by the migrate-on-read and by the SQL accepting six entries for one release.
- Words-in-memory silently jumping because `>= 1` changed meaning: caught by the before/after count test above.
- Keeping windows shifting: caught by the `windowDays` re-key test.
