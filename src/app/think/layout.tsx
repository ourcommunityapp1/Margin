import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import { ThinkProvider } from './ui/provider';
import './think.css';

// Newsreader for the user's words, Inter for the interface.
const newsreader = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['opsz'], variable: '--font-newsreader', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Deep Think',
  description: 'A private place to think out loud.',
  manifest: '/think/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Deep Think', statusBarStyle: 'default' },
  icons: { icon: '/think-icon-192.png', apple: '/think-apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F7F5F0',
};

export default function ThinkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${newsreader.variable} ${inter.variable} dt`}>
      <ThinkProvider>{children}</ThinkProvider>
    </div>
  );
}
