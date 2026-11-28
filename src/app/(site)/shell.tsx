import Link from 'next/link';

// Shared pieces of the public pages: the header, footer, breadcrumbs and structured data.

export const SITE = 'https://katekize.com';

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export function SiteHeader() {
  return (
    <header className="kz-head">
      <Link href="/" className="kz-brand" aria-label="Katekize home">
        <span className="kz-mark" aria-hidden="true" />
        <span>Katekize</span>
      </Link>
      <Link href="/heir" className="kz-btn small kz-open">Open the app</Link>
      <nav className="kz-nav" aria-label="Site">
        <Link href="/westminster-shorter-catechism">Catechism</Link>
        <Link href="/guides">Guides</Link>
      </nav>
    </header>
  );
}

export function SiteFooter({ notice }: { notice?: string }) {
  return (
    <footer className="kz-foot">
      {notice && <p>{notice}</p>}
      <p>The Westminster Shorter and Larger Catechisms (1647), the Apostles’ Creed and the Nicene Creed are in the public domain. Scripture in the Katekize app is the NASB, used by permission of The Lockman Foundation.</p>
      <div className="row">
        <Link href="/westminster-shorter-catechism">Westminster Shorter Catechism</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/memorize/psalm-23">Memorize Psalm 23</Link>
        <Link href="/memorize/the-lords-prayer">Memorize the Lord’s Prayer</Link>
        <Link href="/about">About Katekize</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="mailto:hello@katekize.com">Contact</a>
        <Link href="/heir/about">Photo credits</Link>
        <Link href="/heir">Open the app</Link>
      </div>
    </footer>
  );
}

export function Crumbs({ trail }: { trail: { name: string; href?: string }[] }) {
  return (
    <nav className="kz-crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((t, i) => (
          <li key={t.name}>{t.href && i < trail.length - 1 ? <Link href={t.href}>{t.name}</Link> : <span aria-current={i === trail.length - 1 ? 'page' : undefined}>{t.name}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

export const breadcrumbLd = (trail: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: `${SITE}${t.href}` })),
});
