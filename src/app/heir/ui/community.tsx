'use client';

// The community leaderboard: the full board (with the move shown as it happens) and the preview at the top of Progress.
// The database decides who is on the board and in what order; these screens show it.

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { cloud, getBoard, getBoardStatus, markBoardSeen, getProfile } from './cloud';
import { arrow, gapsAfter, movement, ordinal, previewRows, rowSub, slots, topTenNote, type Board, type BoardRow, type Period } from '@/heir/board';

const COLORS = ['#9ad1d4', '#ffd6a5', '#c3b1e1', '#b5e48c', '#ffadad', '#a0c4ff', '#caffbf', '#fdffb6', '#ffc6ff'];
const colorFor = (s: string) => COLORS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
const fmt = (n: number) => n.toLocaleString('en-US');

function Avatar({ name }: { name: string }) {
  return <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: colorFor(name), color: '#11161c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flex: 'none' }}>{name[0]}</span>;
}

const ROW_H = 58;
const GAP_H = 22;

function RowBody({ r, note }: { r: BoardRow; note?: string }) {
  const sub = r.is_me ? (note ?? '') : rowSub(r);
  const move = r.is_me ? movement(r) : 0;
  return (
    <>
      <span className="hr-lb-rank">{r.place}</span>
      <Avatar name={r.name} />
      <span className="hr-lb-name">
        <b>{r.is_me ? 'You' : r.name}</b>
        {(sub || move !== 0) && (
          <span>
            {move !== 0 && <i className={`hr-lb-move ${move > 0 ? 'up' : 'dn'}`}>{arrow(move)}</i>}
            {move !== 0 && sub ? ' ' : ''}{sub}
          </span>
        )}
      </span>
      <span className="hr-lb-words">{fmt(r.words)}</span>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- the full board

function Rows({ rows, animate, note }: { rows: BoardRow[]; animate: boolean; note: string }) {
  const { start, end } = slots(rows);
  const gaps = gapsAfter(rows);
  const order = [...rows].sort((a, b) => a.idx - b.idx);
  const [phase, setPhase] = useState<'start' | 'end'>(animate ? 'start' : 'end');
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (phase === 'end') return;
    if (reduce) { Promise.resolve().then(() => setPhase('end')); return; }
    const t = setTimeout(() => setPhase('end'), 700);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const gapBefore = (slot: number) => [...gaps].filter((g) => g < slot).length;
  const y = (r: BoardRow) => phase === 'end' ? end[r.username] * ROW_H + gapBefore(end[r.username]) * GAP_H : start[r.username] * ROW_H;
  const height = order.length * ROW_H + gaps.size * GAP_H;
  const moving = (r: BoardRow) => phase === 'start' && start[r.username] !== end[r.username] && r.is_me;
  return (
    <ol className="hr-lb" style={{ height }} aria-label="Community leaderboard">
      {rows.map((r) => (
        <li key={r.username} className={`hr-lb-row${r.is_me ? ' me' : ''}${moving(r) ? ' moving' : ''}`} style={{ transform: `translateY(${y(r)}px)`, height: ROW_H - 4 }}>
          {r.relation === 'friend' || r.relation === 'fof'
            ? <Link href={`/heir/u?name=${encodeURIComponent(r.username)}`} className="hr-lb-link"><RowBody r={r} /></Link>
            : <div className="hr-lb-link"><RowBody r={r} note={note} /></div>}
        </li>
      ))}
      {phase === 'end' && [...gaps].map((g) => <li key={`gap${g}`} className="hr-lb-gap" aria-hidden="true" style={{ transform: `translateY(${(g + 1) * ROW_H + [...gaps].filter((x) => x < g).length * GAP_H}px)`, height: GAP_H }}>···</li>)}
    </ol>
  );
}

export function CommunityScreen() {
  const { ready, accounts, email, boardSeen } = useHeir();
  const [period, setPeriod] = useState<Period>('all');
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [noProfile, setNoProfile] = useState(false);
  const [explain, setExplain] = useState(false);
  // The move is shown when the board first opens; switching between This month and All time just swaps the rows.
  const [animateMove, setAnimateMove] = useState(true);
  const pick = (p: Period) => { if (p === period) return; setAnimateMove(false); setPeriod(p); };
  const [status, setStatus] = useState<{ entered_top10: boolean; left_top10: boolean; moved: number; place: number | null; total: number } | null>(null);

  const load = useCallback((p: Period) => {
    const db = cloud();
    if (!db) return;
    setError('');
    Promise.all([getBoard(db, p), p === 'all' ? getBoardStatus(db) : Promise.resolve(null)])
      .then(([b, s]) => { setBoard(b); setStatus(s); return markBoardSeen(db, p).then(() => { boardSeen(); }); })
      .catch((e: Error) => { if (/profile/i.test(e.message)) setNoProfile(true); else setError('Couldn’t load the board. Check your connection.'); });
  }, [boardSeen]);
  useEffect(() => {
    if (!ready || !accounts || !email) return;
    const db = cloud();
    if (!db) return;
    getProfile(db).then((p) => { if (!p) setNoProfile(true); else Promise.resolve().then(() => load(period)); }).catch(() => load(period));
  }, [ready, accounts, email, period, load]);

  if (!ready) return <main className="hr-page" aria-busy="true" />;
  if (!accounts || !email) return <main className="hr-page bare"><section className="hr-card" style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 12 }}><p className="serif" style={{ margin: 0, fontSize: 24 }}>Sign in to see your community.</p><Link className="hr-btn" href="/heir/signin?next=%2Fheir%2Fcommunity">Sign in</Link></section></main>;

  const note = status ? topTenNote(status as never) : '';
  return (
    <>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir/progress" /></div>
        <h1 className="serif" style={{ margin: '0 4px', fontSize: 32, fontWeight: 500 }}>Community</h1>
        {noProfile ? (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>Make a profile to join your community’s board.</p>
            <Link className="hr-btn" href="/heir/profile">Make my profile</Link>
          </section>
        ) : (
          <>
            <div className="hr-seg" role="tablist" aria-label="Period" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button type="button" role="tab" aria-selected={period === 'month'} className={period === 'month' ? 'on' : ''} onClick={() => pick('month')}>This month</button>
              <button type="button" role="tab" aria-selected={period === 'all'} className={period === 'all' ? 'on' : ''} onClick={() => pick('all')}>All time</button>
            </div>
            <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--muted)' }}>
              {period === 'all' ? 'Words in memory' : 'Words added to memory this month'}{board ? ` · ${board.total} ${board.total === 1 ? 'person' : 'people'} in your community` : ''} · <button type="button" onClick={() => setExplain(true)} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', font: 'inherit', cursor: 'pointer' }}>How it’s counted</button>
            </p>
            {error && <p role="alert" style={{ margin: '0 4px', color: 'var(--miss)' }}>{error}</p>}
            {board && board.total <= 1 ? (
              <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, lineHeight: 1.5 }}>It’s just you so far. Add friends to see how you compare. Their friends join your board too.</p>
                <Link className="hr-btn" href="/heir/friends">Find friends</Link>
              </section>
            ) : board ? (
              <section className="hr-card" style={{ padding: '10px 12px', opacity: board.period === period ? 1 : 0.55, transition: 'opacity 150ms' }} aria-busy={board.period !== period}>
                <Rows key={board.period} rows={board.rows} animate={animateMove} note={note} />
              </section>
            ) : <p style={{ margin: '0 4px', color: 'var(--muted)' }}>Loading…</p>}
          </>
        )}
      </main>
      {explain && (
        <div className="hr-sheet-wrap" role="dialog" aria-modal="true" aria-label="How it’s counted" onClick={() => setExplain(false)}>
          <div className="hr-sheet-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>How it’s counted</h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>A word counts once you’ve typed or said its verse or answer from memory, with no hints, on a later day than you first learned it.</p>
            <p style={{ margin: 0, lineHeight: 1.5 }}><b>All time:</b> every word that counts now. <b>This month:</b> the words added since the 1st.</p>
            <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--muted)', fontSize: 14 }}>Your community is you, your friends, and their friends. The arrow shows how many places you’ve moved since you last looked. Children’s progress is never on the board.</p>
            <button type="button" className="hr-btn" onClick={() => setExplain(false)}>Got it</button>
          </div>
        </div>
      )}
      <Tabs />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------- the preview on Progress


export function CommunityPreview() {
  const { ready, accounts, email, board: status, boardAlert } = useHeir();
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready || !accounts || !email) return;
    const db = cloud();
    if (!db) return;
    getProfile(db).then((p) => {
      setHasProfile(!!p);
      if (p) return getBoard(db, 'all').then(setBoard);
    }).catch(() => setBoard(null));
  }, [ready, accounts, email, status?.place]);

  if (!accounts || !email || hasProfile === null) return null;
  if (!hasProfile) {
    return (
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Community">
        <span className="hr-label">Community</span>
        <p style={{ margin: 0, lineHeight: 1.5 }}>Memorize alongside friends. Make a profile to see how you compare.</p>
        <Link href="/heir/profile" className="hr-btn">Make my profile</Link>
      </section>
    );
  }
  if (board === undefined || board === null) return null;
  const rows = previewRows(board);
  const myMove = status && boardAlert && status.moved !== 0 ? status.moved : 0;
  return (
    <section className={`hr-card hr-lb-card${boardAlert ? ' alert' : ''}`} aria-label="Community">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="hr-label">Community</span>
        {myMove !== 0 ? <span className="hr-lb-pill">{arrow(myMove)}</span> : status && topTenNote(status) ? <span className="hr-lb-pill">{topTenNote(status)}</span> : null}
      </div>
      {board.total <= 1 ? (
        <>
          <ol className="hr-lb-static"><li className="hr-lb-row me"><div className="hr-lb-link"><RowBody r={board.rows[0] ?? { place: 1, prev_place: null, idx: 1, username: 'me', relation: 'me', words: 0, name: 'You', is_me: true, friends_since: null, via: null }} note="Just you so far" /></div></li></ol>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>Add friends to race them here. Their friends join your board too.</p>
          <Link href="/heir/friends" className="hr-btn">Find friends</Link>
        </>
      ) : (
        <>
          <ol className="hr-lb-static">
            {rows.flatMap((r, i) => [
              ...(i === 3 && r.idx > 4 ? [<li key="gap" className="hr-lb-gap-static" aria-hidden="true">···</li>] : []),
              <li key={r.username} className={`hr-lb-row${r.is_me ? ' me' : ''}`}>
                <div className="hr-lb-link"><RowBody r={r} note={r.is_me ? ordinalNote(board) : undefined} /></div>
              </li>,
            ])}
          </ol>
          <Link href="/heir/community" className="hr-btn">View leaderboard</Link>
        </>
      )}
    </section>
  );
}

const ordinalNote = (b: Board) => (b.my_place ? `${ordinal(b.my_place)} of ${b.total}` : '');
