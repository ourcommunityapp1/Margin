import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { HeirProvider } from './ui/provider';
import './heir.css';

// Source Serif 4 for Scripture and headings, Inter for the interface.
const serif = Source_Serif_4({ subsets: ['latin'], axes: ['opsz'], variable: '--font-source-serif', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Heir',
  description: 'Scripture, catechisms and creeds, learned together and kept for life.',
  manifest: '/heir/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Heir', statusBarStyle: 'default' },
  icons: { icon: '/heir/icon-192.png', apple: '/heir/apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#DCD4C3',
};

export default function HeirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${serif.variable} ${inter.variable}`}>
      <HeirProvider>{children}</HeirProvider>
    </div>
  );
}
