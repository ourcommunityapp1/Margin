// Deep Think's own web app manifest, so it can be added to the home screen as its own app
// (the listening app keeps the one at the site root).
export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    name: 'Deep Think',
    short_name: 'Deep Think',
    description: 'A private place to think out loud.',
    id: '/think',
    start_url: '/think',
    scope: '/think',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F5F0',
    theme_color: '#F7F5F0',
    icons: [
      { src: '/think-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/think-icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/think-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, { headers: { 'content-type': 'application/manifest+json' } });
}
