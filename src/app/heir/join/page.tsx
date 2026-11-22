import { JoinScreen } from '../ui/join';

export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const code = typeof q.code === 'string' && /^[0-9a-f]{32}$/.test(q.code) ? q.code : '';
  return <JoinScreen code={code} />;
}
