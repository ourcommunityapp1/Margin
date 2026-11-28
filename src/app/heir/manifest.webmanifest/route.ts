// Katekize's web app manifest: lets it be installed to the home screen as its own app (the K icon, no browser bar).
export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    name: 'Katekize',
    short_name: 'Katekize',
    description: 'Scripture, catechisms and creeds, learned together and kept for life.',
    id: '/heir',
    start_url: '/heir',
    scope: '/heir',
    lang: 'en',
    dir: 'ltr',
    display: 'standalone',
    orientation: 'portrait',
    categories: ['education', 'lifestyle'],
    // The icon's own ground, so the start-up screen matches it; the app bar takes the app's ink.
    background_color: '#313232',
    theme_color: '#11161c',
    icons: [
      { src: '/heir/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/heir/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/heir/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, { headers: { 'content-type': 'application/manifest+json' } });
}
