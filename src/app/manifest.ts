import type { MetadataRoute } from 'next';

// Lets the phone app be added to the home screen and open full screen, like an installed app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Margin',
    short_name: 'Margin',
    description: 'Scripture with the commentators beside it: listen, read, and ask.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#121011',
    theme_color: '#121011',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
