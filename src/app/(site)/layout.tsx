import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './site.css';

// The public pages of katekize.com (the front door and, later, a page for each catechism question and guide).
// They are server-rendered, so the full text is in the HTML for search engines and AI answer engines. The app itself
// lives under /heir.
const serif = Source_Serif_4({ subsets: ['latin'], axes: ['opsz'], variable: '--font-source-serif', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://katekize.com'),
  manifest: '/heir/manifest.webmanifest',
  icons: { icon: [{ url: '/heir/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/heir/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/heir/apple-touch-icon.png' },
};

// Unlike the phone app, public pages let people zoom.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`kz ${serif.variable} ${inter.variable}`}>{children}</div>;
}
