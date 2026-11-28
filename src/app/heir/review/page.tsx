import { Back } from '../ui/tabs';
import { collections } from '@/heir/content';

// Everything Heir will teach, laid out for the owner to check before it goes live.
export default function Review() {
  return (
    <main className="hr-page bare">
      <div style={{ marginTop: 8 }}><Back href="/heir" /></div>
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500 }}>Review the content</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
          Each item below is a draft. Check the exact words, the pieces, the meaning questions (the right answer is marked) and the connected verses.
          Send changes in the chat by item, for example “Q4: change the answer for ‘infinite’ to …”, or say “approve Q1–3”.
        </p>
      </section>
      {collections.map((c) => (
        <section key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="serif" style={{ margin: '12px 4px 0', fontSize: 24, fontWeight: 600 }}>{c.title}</h2>
          {c.items.map((i) => (
            <article key={i.id} className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700 }}>{c.unit === 'Question' ? `Q${i.number}` : c.unit === 'Verse' || c.unit === 'Commandment' ? i.prompt : `Section ${i.number}`}</span>
                <span className="hr-tag">{i.reviewed ? 'Approved' : 'Not yet reviewed'}</span>
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--muted)' }}>{i.prompt}</p>
              <p className="serif" style={{ margin: 0, fontSize: 20, lineHeight: 1.45 }}>{i.text}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
                {(['adult', 'child'] as const).map((t) => (
                  <div key={t}>
                    <span className="hr-label">{t === 'adult' ? 'Adult pieces' : 'Child pieces'}</span>
                    <ol style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 15, lineHeight: 1.5 }}>{i.chunks[t].map((x, k) => <li key={k}>{x}</li>)}</ol>
                  </div>
                ))}
              </div>
              {i.meaning.map((m, k) => (
                <div key={k} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 15, lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{m.question}</p>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><b>{m.answer}</b> (correct)</li>
                    {m.distractors.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>After answering: {m.explain}</p>
                </div>
              ))}
              <p style={{ margin: 0, borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 15 }}><span className="hr-label">Connected: </span>{i.connected.join(' · ')}</p>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
