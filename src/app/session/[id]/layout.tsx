import type { Metadata } from 'next';

// An old demo screen, not a public page: keep it out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
