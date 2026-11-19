'use client';

import Link from 'next/link';
import { useHeir } from '../ui/provider';

export default function Welcome() {
  const { accounts, email } = useHeir();
  return (
    <main className="hr-page bare" style={{ alignItems: 'center' }}>
      <span className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: 0.5, marginTop: 40 }}>Heir</span>
      <section className="hr-card" style={{ marginTop: 'auto', width: '100%', boxSizing: 'border-box', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <p className="serif" style={{ margin: 0, fontSize: 30, lineHeight: 1.18 }}>
          <span style={{ fontWeight: 600 }}>Remember.</span> <span style={{ color: 'var(--muted)' }}>Scripture, catechisms and creeds, learned together and kept for life.</span>
        </p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>“and if children, then heirs—heirs of God and fellow heirs with Christ.” Romans 8:17</p>
        <Link className="hr-btn" href="/heir/start">Get started</Link>
        {accounts && !email && (
          <Link href="/heir/signin?next=%2Fheir" style={{ alignSelf: 'center', fontSize: 15, color: 'var(--ink)', marginTop: -8, padding: 6 }}>Already set up? Sign in</Link>
        )}
      </section>
    </main>
  );
}
