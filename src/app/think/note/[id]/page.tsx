import { NoteScreen } from '../../ui/note-screen';

// One note: talking, typing, or at rest. In Next 16 route params arrive as a promise.
export default async function NotePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const folder = typeof q.folder === 'string' ? q.folder : null;
  return <NoteScreen key={id} id={id} fresh={q.new === '1'} folder={folder} />;
}
