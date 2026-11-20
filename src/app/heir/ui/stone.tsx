// A question's level, shown as a close-up of the real stone in a rounded square.
// Level 0 is a dashed outline; an overdue item's stone fades until its next good review.

import { levelInfo } from '@/heir/levels';

export function Stone({ level, size = 28, dim = false, label }: { level: number; size?: number; dim?: boolean; label?: string }) {
  const info = levelInfo(level);
  const radius = Math.round(size * 0.27);
  const name = label ?? (info ? `${info.name}${dim ? ', needs a refresh' : ''}` : 'Not yet earned');
  if (!info) return <span className="hr-stone empty" role="img" aria-label={name} style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <span className="hr-stone" data-dim={dim} role="img" aria-label={name} style={{ width: size, height: size, borderRadius: radius }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/heir/stones/${info.id}.jpg`} alt="" width={size} height={size} />
    </span>
  );
}
