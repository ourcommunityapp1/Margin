import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Back, Tabs } from '../../ui/tabs';
import { collections, getCollection } from '@/heir/content';

export function generateStaticParams() {
  return collections.map((c) => ({ id: c.id }));
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCollection(id);
  if (!c) notFound();
  return (
    <>
      <main className="hr-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Back href="/heir/memorize" />
        </div>
        <h1 className="serif" style={{ margin: '0 4px', fontSize: 30, fontWeight: 500, lineHeight: 1.15 }}>{c.title}</h1>
        <section className="hr-card" style={{ padding: '4px 22px' }}>
          {c.items.map((i) => (
            <Link key={i.id} href={`/heir/item/${i.id}`} className="hr-row" style={{ minHeight: 64, alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}>
              <span style={{ width: 28, flex: 'none', color: 'var(--muted)', fontWeight: 600 }}>{i.number}</span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{i.prompt}</span>
            </Link>
          ))}
        </section>
        <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--ink)' }}>{c.source}</p>
      </main>
      <Tabs />
    </>
  );
}
