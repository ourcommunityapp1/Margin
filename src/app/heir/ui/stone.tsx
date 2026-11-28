// A question's level as a small gem: Stone, Bronze, Silver, Gold or Diamond (see src/heir/tiers.ts).
// Nothing yet is a dashed outline; an overdue item's gem fades until its next good review.

import { tierOf } from '@/heir/tiers';

export function Stone({ level, size = 28, dim = false, label }: { level: number; size?: number; dim?: boolean; label?: string }) {
  const tier = tierOf(level);
  const radius = Math.round(size * 0.3);
  const name = label ?? (tier ? `${tier.stone}, ${tier.name}${dim ? ', needs a refresh' : ''}` : 'Not yet earned');
  if (!tier) return <span className="hr-stone empty" role="img" aria-label={name} style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <span className="hr-stone gem" data-dim={dim} data-tier={tier.id} role="img" aria-label={name}
      style={{ width: size, height: size, borderRadius: radius, ['--gem' as string]: tier.color, ['--gem-edge' as string]: tier.edge }} />
  );
}
