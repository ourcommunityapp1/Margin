// The five levels people see (ADR-004, ADR-005), by name and gem. Port of src/heir/tiers.ts. Stored level n is tiers[n - 1].
// Nothing here decides how a level is earned.

class Tier {
  final int n;
  final String id, stone, name, means;
  final int color, edge;
  const Tier(this.n, this.id, this.stone, this.name, this.means, this.color, this.edge);
}

const tiers = [
  Tier(1, 'stone', 'Stone', 'Familiar', 'Recognize it.', 0xFFA9A39A, 0xFF7E786F),
  Tier(2, 'bronze', 'Bronze', 'Recalled', 'Bring it to mind.', 0xFFC7814A, 0xFF8F5528),
  Tier(3, 'silver', 'Silver', 'Memorized', 'Recite it accurately.', 0xFFC4CBD2, 0xFF8D969F),
  Tier(4, 'gold', 'Gold', 'Proficient', 'Recall it fluently and reliably.', 0xFFE3B53F, 0xFFA97F14),
  Tier(5, 'diamond', 'Diamond', 'Expert', 'Recall it effortlessly and accurately, even after extended periods without practice.', 0xFF9ED8F0, 0xFF4F9FC4),
];

/// The tier for a stored level (1 to 5), or null when it has none yet.
Tier? tierOf(int level) => level >= 1 ? tiers[(level > 5 ? 5 : level) - 1] : null;

/// The tier's position (0 to 4) for a stored level, or -1 when none.
int tierIndex(int level) => level >= 1 ? (level > 5 ? 5 : level) - 1 : -1;
