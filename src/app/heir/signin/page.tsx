import { SignIn } from '../ui/signin';

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const next = typeof q.next === 'string' && q.next.startsWith('/heir') ? q.next : '/heir';
  return <SignIn next={next} />;
}
