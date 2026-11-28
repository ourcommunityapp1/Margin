import { InviteScreen } from '../ui/invite';

export default async function InvitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const code = typeof q.code === 'string' && /^[0-9a-f]{32}$/.test(q.code) ? q.code : '';
  return <InviteScreen code={code} />;
}
