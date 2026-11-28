import { PersonScreen } from '../ui/social';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const name = typeof q.name === 'string' && /^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(q.name) ? q.name : '';
  return <PersonScreen name={name} />;
}
