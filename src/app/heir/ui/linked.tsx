'use client';

// Linked accounts: see the other person's family and progress (view only), link someone new, or unlink.

import { useCallback, useEffect, useState } from 'react';
import { useHeir } from './provider';
import { cloud, createInvite, loadLinked, unlinkAccount, type LinkedAccount } from './cloud';
import { allItems, courseFor } from '@/heir/content';
import { countsFor, daysKept } from '@/heir/levels';
import { localDay } from '@/heir/progress';

export function LinkedAccounts() {
  const { now } = useHeir();
  const [linked, setLinked] = useState<LinkedAccount[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    const db = cloud();
    if (!db) return;
    loadLinked(db).then((l) => { setLinked(l); setFailed(false); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const make = async () => {
    const db = cloud();
    if (!db) return;
    setBusy(true); setMessage('');
    try { setLink(`${window.location.origin}/heir/join?code=${await createInvite(db)}`); } catch { setMessage('Couldn’t make an invite. Check your connection and try again.'); }
    setBusy(false);
  };
  const send = async () => {
    try { if (navigator.share) { await navigator.share({ title: 'Link our Heir accounts', text: 'Link our Heir accounts:', url: link }); return; } } catch { /* cancelled: fall through to copying */ }
    try { await navigator.clipboard.writeText(link); setMessage('Link copied.'); } catch { /* the link is shown, so it can be copied by hand */ }
  };
  const unlink = async (ownerId: string) => {
    const db = cloud();
    if (!db) return;
    try { await unlinkAccount(db, ownerId); setConfirm(null); load(); } catch { setMessage('Couldn’t unlink. Try again.'); }
  };

  const today = localDay(now);
  return (
    <>
      {(linked ?? []).map((a) => (
        <section key={a.ownerId} className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Linked account">
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Linked account · view only</span>
            {a.plan && courseFor(a.plan.course) && <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{courseFor(a.plan.course)!.title}</span>}
          </span>
          {a.members.length === 0 && <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Hasn’t set up a family yet.</p>}
          {a.members.map((m) => {
            const p = a.progress[m.id];
            const c = p ? countsFor(allItems(), p) : null;
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{m.name}</span>
                {p ? (
                  <>
                    <span style={{ fontSize: 15 }}>{daysKept(p.days, today)} {daysKept(p.days, today) === 1 ? 'day' : 'days'} kept · {p.lessons} {p.lessons === 1 ? 'lesson' : 'lessons'} · {p.units.length} learned</span>
                    {c && <span style={{ fontSize: 14, color: 'var(--muted)' }}>Know {c.know} · Memorized {c.memorized} · Mastered {c.mastered} · Long-term {c.longTerm}</span>}
                  </>
                ) : <span style={{ fontSize: 15, color: 'var(--muted)' }}>No lessons yet.</span>}
              </div>
            );
          })}
          {confirm === a.ownerId ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setConfirm(null)}>Keep the link</button>
              <button type="button" className="hr-btn" style={{ background: 'var(--miss)', color: 'var(--card)' }} onClick={() => unlink(a.ownerId)}>Unlink</button>
            </div>
          ) : (
            <button type="button" className="hr-tag" style={{ alignSelf: 'flex-start', border: 0, cursor: 'pointer', fontSize: 14, padding: '7px 12px' }} onClick={() => setConfirm(a.ownerId)}>Unlink</button>
          )}
          {confirm === a.ownerId && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Unlinking only stops you seeing each other. Nobody’s progress or account is deleted.</p>}
        </section>
      ))}

      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="hr-label">Link a spouse’s account</span>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>Each of you keeps your own account, progress and course. Once linked, you can see each other’s progress here, view only: neither can change or delete the other’s. The link works once, for a week.</p>
        {link ? (
          <>
            <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 13 }} />
            <button type="button" className="hr-btn" onClick={send}>Send the link</button>
          </>
        ) : (
          <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={make} disabled={busy}>{busy ? 'Making a link…' : 'Make an invite link'}</button>
        )}
        {message && <p role="status" style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{message}</p>}
        {failed && <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--miss)' }}>Couldn’t load linked accounts. Check your connection.</p>}
      </section>
    </>
  );
}
