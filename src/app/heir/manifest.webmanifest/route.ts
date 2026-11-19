// Heir's own web app manifest, so it can be added to the home screen as its own app.
export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    name: 'Heir',
    short_name: 'Heir',
    description: 'Scripture, catechisms and creeds, learned together and kept for life.',
    id: '/heir',
    start_url: '/heir',
    scope: '/heir',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#DCD4C3',
    theme_color: '#DCD4C3',
    icons: [
      { src: '/heir/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/heir/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/heir/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, { headers: { 'content-type': 'application/manifest+json' } });
}
