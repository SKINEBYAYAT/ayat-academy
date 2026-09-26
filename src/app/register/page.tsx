import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Create your account' };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return <AuthShell><AuthForm mode="register" next={params.next ?? ''} /></AuthShell>;
}
