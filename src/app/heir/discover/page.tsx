'use client';

// Discover: search every verse, answer and course by words, a reference or a title. Later: by topic.

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Back, Tabs } from '../ui/tabs';
import { useHeir } from '../ui/provider';
import { allItems, courses, getCollection, itemLabel } from '@/heir/content';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export default function Discover() {
  const { ready } = useHeir();
  const [q, setQ] = useState('');
  const items = useMemo(() => allItems().map((i) => ({ i, hay: norm(`${i.prompt} ${i.text} ${itemLabel(i)}`) })), []);
  const term = norm(q);
  const hits = useMemo(() => {
    if (term.length < 2) return { courses: [], items: [] };
    const words = term.split(' ');
    const matchAll = (hay: string) => words.every((w) => hay.includes(w));
    return {
      courses: courses.filter((c) => matchAll(norm(`${c.title} ${c.blurb}`))).slice(0, 6),
      items: items.filter((x) => matchAll(x.hay)).slice(0, 30).map((x) => x.i),
    };
  }, [term, items]);
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  return (
    <>
      <main className="hr-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Back href="/heir/courses" label="Learn" />
          <h1 className="serif" style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Discover</h1>
        </div>
        <input id="discover-search" type="search" autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="A word, a reference, a title" aria-label="Search verses, answers and courses"
          value={q} onChange={(e) => setQ(e.target.value)} className="hr-discover-input" />
        {term.length < 2 && <p style={{ margin: '0 4px', color: 'var(--muted)', fontSize: 15, lineHeight: 1.5 }}>Try “shepherd”, “John 3”, “peace” or “Lord’s Prayer”. Searching by topic is coming.</p>}
        {term.length >= 2 && hits.courses.length === 0 && hits.items.length === 0 && <p style={{ margin: '0 4px', color: 'var(--muted)', fontSize: 15 }}>Nothing found for “{q.trim()}”.</p>}
        {hits.courses.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="hr-label">Courses</span>
            {hits.courses.map((c) => <Link key={c.id} href={`/heir/courses/${c.id}`} className="hr-row"><span><b>{c.title}</b></span><span style={{ color: 'var(--muted)', fontSize: 13 }}>{c.short}</span></Link>)}
          </section>
        )}
        {hits.items.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="hr-label">Verses and answers</span>
            {hits.items.map((i) => (
              <Link key={i.id} href={`/heir/item/${i.id}`} className="hr-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4, padding: '12px 0' }}>
                <b>{itemLabel(i)} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>· {getCollection(i.collection)?.title}</span></b>
                <span style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.text}</span>
              </Link>
            ))}
          </section>
        )}
      </main>
      <Tabs />
    </>
  );
}
