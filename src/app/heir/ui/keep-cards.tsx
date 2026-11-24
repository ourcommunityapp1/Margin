'use client';

// Under the day's lesson: what needs your attention to keep words in your memory. "Try again" for what went wrong
// yesterday (put it right by the end of today), then "Review" for everything coming due. Only when something is waiting.

import Link from 'next/link';
import { dayLabel, useKeep } from './keep';
import { itemLabel } from '@/heir/content';
import { arrowSvg } from './arrow';

export function KeepCards() {
  const k = useKeep();
  if (!k || (k.tryAgain.length === 0 && k.review.length === 0)) return null;
  const again = k.tryAgain;
  const reviewWords = k.review.reduce((n, h) => n + h.words, 0);
  const soonest = k.review[0]?.state.state === 'review' ? k.review[0].state.deadline : null;
  return (
    <>
      {again.length > 0 && (
        <section className="hr-card hr-keep-card" aria-label="Try again">
          <span className="hr-label" style={{ color: '#e8b867' }}>Try again</span>
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            {again.length === 1 ? <>You missed <b>{itemLabel(again[0].item)}</b> yesterday.</> : <>You missed {again.length} yesterday.</>} Get {again.length === 1 ? 'it' : 'them'} right today to keep {again.reduce((n, h) => n + h.words, 0)} words in your memory.
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
