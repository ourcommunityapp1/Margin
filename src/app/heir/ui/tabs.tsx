'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/heir', label: 'Today', icon: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></> },
  { href: '/heir/courses', label: 'Courses', icon: <path d="M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 0-2 2zM21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 1 2 2z" /> },
  { href: '/heir/progress', label: 'Progress', icon: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M12 13v4M8 20h8M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3" /></> },
];

export function Tabs() {
  const path = usePathname();
  const current = (href: string) => (href === '/heir' ? path === '/heir' : path.startsWith(href));
  return (
    <nav className="hr-tabs" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current(t.href) ? 'page' : undefined}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
          {t.label}
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
