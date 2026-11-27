'use client';

// "You": everything about the person on this phone in one place, opened from their initial on Today.

import { DEFAULT_GOAL } from '@/heir/planner';
import Link from 'next/link';
import { useState } from 'react';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { activeMember } from '@/heir/household';
import { courseFor } from '@/heir/content';
import { InstallApp } from './install';

function Row({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="hr-row" style={{ minHeight: 64, gap: 12 }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>{sub}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--muted)', flex: 'none' }}><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  );
}

export function YouScreen() {
  const { ready, household, accounts, email, sync, signOut, updateProgress } = useHeir();
  const [armed, setArmed] = useState(false);
  const [cleared, setCleared] = useState(false);
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const course = courseFor(household.plan?.course);
  const others = household.members.length - 1;
  const erase = () => {
    const id = household.activeMemberId;
    if (id) updateProgress((p) => { const next = { ...p }; delete next[id]; return next; });
    setArmed(false); setCleared(true);
  };

  return (
    <>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir" /></div>
        {me && (
          <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px' }}>
            <span style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 22, flex: 'none' }}>{me.name[0]}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <h1 className="serif" style={{ margin: 0, fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}>{me.name}</h1>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>{me.track === 'child' ? 'Child track' : 'Adult track'}{accounts ? (email ? ' · signed in' : ' · not signed in') : ''}</span>
            </span>
          </header>
        )}
        <section className="hr-card" style={{ padding: '4px 20px' }} aria-label="Settings">
          {accounts && email && <Row href="/heir/profile" title="Your profile" sub="Name, username, city, who can find you" />}
          <Row href="/heir/plan" title="Course and daily goal" sub={course ? `${course.title} · ${household.plan?.minutes ?? DEFAULT_GOAL} min a day` : 'Choose a course'} />
          <Row href="/heir/family" title="Family" sub={others > 0 ? `You and ${others} more on this phone` : 'Just you · add someone'} />
          {accounts && email && <Row href="/heir/linked" title="Linked accounts" sub="See a family member’s progress, view only" />}
          {accounts && !email && <Row href="/heir/signin" title="Sign in" sub="Keep your progress on every phone" />}
          <Row href="/heir/how" title="How it works" sub="Stones, grading and spaced review" />
          <Row href="/heir/about" title="About Katekize" sub="Sources and credits" />
        </section>
        <InstallApp />
        {accounts && email && (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center', overflowWrap: 'anywhere' }}>
            Signed in as {email}{sync === 'offline' ? ' · couldn’t reach the server; changes are kept on this phone' : ''}
          </p>
        )}
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts && email && <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={signOut}>Sign out</button>}
          {me && (cleared ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{me.name}’s progress is cleared. The next lesson starts from the welcome.</p>
          ) : armed ? (
            <>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>Clear {me.name}’s lessons, stones, days kept and awards on this phone, and begin again from the welcome lesson?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setArmed(false)}>Keep it</button>
                <button type="button" className="hr-btn" style={{ background: 'var(--miss)', color: 'var(--card)' }} onClick={erase}>Erase progress</button>
              </div>
            </>
          ) : (
            <button type="button" className="hr-btn" style={{ background: 'transparent', color: 'var(--miss)' }} onClick={() => setArmed(true)}>Start over</button>
          ))}
        </section>
      </main>
      <Tabs />
    </>
  );
}
