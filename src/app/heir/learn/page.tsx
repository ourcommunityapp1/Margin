import { Tabs } from '../ui/tabs';

export default function Learn() {
  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Learn</h1>
        <section className="hr-card" style={{ marginTop: 'auto' }}>
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2 }}>
            <span style={{ fontWeight: 600 }}>Coming later.</span> <span style={{ color: 'var(--muted)' }}>Short videos and articles that explain the catechism and creeds, each linked to what you’re memorizing.</span>
          </p>
        </section>
      </main>
      <Tabs />
    </>
  );
}
