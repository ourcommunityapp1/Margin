// The scale a question's level is stored on, and how saved progress from the earlier six-stone scale moves onto it (ADR-005).
// Port of src/heir/level-scale.ts. No imports: both progress.dart and levels.dart use it.
//
//   scale 2 (now):   0 none · 1 Familiar · 2 Recalled · 3 Memorized · 4 Proficient · 5 Expert
//   scale 1 (before): 0 none · 1 Amethyst · 2 Topaz · 3 Carnelian · 4 Emerald · 5 Sapphire · 6 Diamond

const levelScaleNow = 2;

/// One stored level from the earlier scale, on the current one. Nothing goes down.
int migrateLevel(int old) => old <= 0 ? 0 : (old + 1 > 5 ? 5 : old + 1);

/// Levels on the current scale: a record already on scale 2 is left as it is.
Map<String, int> levelsOnCurrentScale(Map<String, int> levels, int? scale) =>
    (scale ?? 1) >= levelScaleNow ? levels : {for (final e in levels.entries) e.key: migrateLevel(e.value)};
