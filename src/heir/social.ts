// Small pure helpers for the friends screens: the same username rule the database enforces (so mistakes show before
// asking it), place and date wording, and the line under a friend's name. Tested without a database.

export const USERNAME_RULE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const RESERVED = ['admin', 'administrator', 'katekize', 'heir', 'support', 'help', 'staff', 'official', 'moderator', 'mod', 'root', 'system', 'null', 'undefined', 'anonymous', 'everyone', 'me', 'you'];

/** Why a username can't be used, or null if it looks fine (the database makes the final call, including "taken"). */
export function usernameProblem(name: string): string | null {
  const n = name.trim();
  if (!USERNAME_RULE.test(n)) return 'Use 3 to 20 letters, numbers or underscores, starting with a letter.';
  if (RESERVED.includes(n.toLowerCase())) return 'That name is reserved.';
  return null;
}

/** "Franklin, TN"; either part alone; or empty. */
export const place = (city?: string | null, region?: string | null) => [city?.trim(), region?.trim()].filter(Boolean).join(', ');

/** "Mar 2026". */
export function sinceLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** "12-day streak", or when it was last kept. */
export function streakLine(streak: number, lastDay: string | null | undefined, today: string): string {
  if (streak > 0) return `${streak}-day streak`;
  if (!lastDay) return 'No lessons yet';
  const days = Math.round((Date.parse(today) - Date.parse(lastDay)) / 86_400_000);
  return days <= 1 ? 'Last lesson yesterday' : `Last lesson ${days} days ago`;
}

/** "38 friends", "1 friend". */
export const friendsCount = (n: number) => `${n} ${n === 1 ? 'friend' : 'friends'}`;
