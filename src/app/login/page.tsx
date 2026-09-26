import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return <AuthShell><AuthForm mode="login" next={params.next ?? ''} /></AuthShell>;
}
