'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useHeir } from './provider';

const TABS = [
  { href: '/heir', label: 'Today', icon: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></> },
  { href: '/heir/courses', label: 'Courses', icon: <path d="M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 0-2 2zM21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 1 2 2z" /> },
  { href: '/heir/progress', label: 'Progress', icon: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M12 13v4M8 20h8M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3" /></> },
];

const FRIENDS_TAB = { href: '/heir/friends', label: 'Friends', icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.6" /><path d="M15.6 14.3A4.6 4.6 0 0 1 21 18.6" /></> };

export function Tabs() {
  const path = usePathname();
  const { accounts, email, boardAlert } = useHeir();
  const tabs = accounts && email ? [...TABS, FRIENDS_TAB] : TABS;
  const current = (href: string) => (href === '/heir' ? path === '/heir' : path.startsWith(href) || (href === '/heir/friends' && (path.startsWith('/heir/u') || path.startsWith('/heir/profile'))));
  return (
    <nav className="hr-tabs" aria-label="Main">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current(t.href) ? 'page' : undefined}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
          {t.label}
          {t.href === '/heir/progress' && boardAlert && <span className="hr-dot" role="img" aria-label="Your place on the leaderboard changed" />}
        </Link>
      ))}
    </nav>
  );
}

export function Back({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="hr-back" aria-label={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </Link>
  );
}
