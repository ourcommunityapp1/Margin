'use client';

// Under the day's lesson: what needs your attention to keep words in your memory. "Try again" for what went wrong
// yesterday or earlier today (put it right by the end of the next day), then "Review" for everything coming due. Only when something is waiting.

import Link from 'next/link';
import { dayLabel, localTz, useKeep } from './keep';
import { missedWhen } from '@/heir/keep';
import { useHeir } from './provider';
import { itemLabel } from '@/heir/content';
import { arrowSvg } from './arrow';

export function KeepCards() {
  const k = useKeep();
  const { now } = useHeir();
  if (!k || (k.tryAgain.length === 0 && k.review.length === 0)) return null;
  const again = k.tryAgain;
  const reviewWords = k.review.reduce((n, h) => n + h.words, 0);
  // Misses on different days can be waiting together: say "today" only when every one of them happened today.
  const when = again.every((h) => h.state.state === 'try-again' && missedWhen(h.state.deadline, now, localTz()) === 'today') ? 'today' : 'yesterday';
  const soonest = k.review[0]?.state.state === 'review' ? k.review[0].state.deadline : null;
  return (
    <>
      {again.length > 0 && (
        <section className="hr-card hr-keep-card" aria-label="Try again">
          <span className="hr-label" style={{ color: '#e8b867' }}>Try again</span>
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            {again.length === 1 ? <>You missed <b>{itemLabel(again[0].item)}</b> {when}.</> : <>You missed {again.length} {when}.</>} Get {again.length === 1 ? 'it' : 'them'} right {when === 'today' ? 'by the end of tomorrow' : 'today'} to keep {again.reduce((n, h) => n + h.words, 0)} words in your memory.
          </p>
          <Link className="hr-golink" href={`/heir/lesson?mode=keep&items=${again.map((h) => encodeURIComponent(h.item.id)).join(',')}`}><span>Try again</span><i>{arrowSvg}</i></Link>
        </section>
      )}
      {k.review.length > 0 && (
        <section className="hr-card hr-keep-card" aria-label="Review">
          <span className="hr-label" style={{ color: '#e8b867' }}>Review</span>
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            {k.review.length} {k.review.length === 1 ? 'verse or answer' : 'verses and answers'} ({reviewWords} words) need a review{soonest ? <> by <b>{dayLabel(soonest)}</b></> : ''} to stay in your memory.
          </p>
          <Link className="hr-golink" href="/heir/keep"><span>Review</span><i>{arrowSvg}</i></Link>
        </section>
      )}
    </>
  );
}
