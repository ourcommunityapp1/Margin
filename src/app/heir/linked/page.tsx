'use client';

import { useHeir } from '../ui/provider';
import { Back, Tabs } from '../ui/tabs';
import { LinkedAccounts } from '../ui/linked';

export default function LinkedPage() {
  const { ready, accounts, email } = useHeir();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  return (
    <>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir/you" /></div>
        {accounts && email ? <LinkedAccounts /> : <p style={{ margin: 0, color: 'var(--muted)' }}>Sign in to link accounts.</p>}
      </main>
      <Tabs />
    </>
  );
}
