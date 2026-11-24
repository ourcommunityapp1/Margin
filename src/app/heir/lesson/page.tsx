import { LessonRunner } from '../ui/lesson';

export default async function LessonPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const item = typeof q.item === 'string' ? q.item : undefined;
  const ids = typeof q.items === 'string' ? q.items.split(',').filter((s) => /^[A-Za-z0-9._#-]{1,40}$/.test(s)).slice(0, 40) : [];
  const mode = q.mode === 'keep' && ids.length ? 'keep' : q.mode === 'item' && item ? 'item' : q.mode === 'review' ? 'review' : q.mode === 'rise' ? 'rise' : q.mode === 'night' ? 'night' : q.mode === 'extra' ? 'extra' : 'lesson';
  // A lesson or review for a course other than the household's chosen one (from Today's cards or Keep going), and the
  // card on Today it was started from.
  const course = typeof q.course === 'string' && /^[a-z0-9-]{1,40}$/.test(q.course) ? q.course : undefined;
  const card = typeof q.card === 'string' && /^[0-9-]{10}:(lesson|review|fix):[a-z0-9-]{1,40}$/.test(q.card) ? q.card : undefined;
  // Before sleep the screen stays dark, whatever the hour: less light, easier sleep.
  if (mode === 'night') return <div className="hr hr-dark-shell" data-time="night" data-theme="dark"><LessonRunner mode="night" courseId={course} /></div>;
  return <LessonRunner mode={mode} itemId={item} itemIds={ids} courseId={course} cardId={card} />;
}
