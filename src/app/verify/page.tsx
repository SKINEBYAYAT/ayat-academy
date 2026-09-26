import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { AuthForm } from '@/components/auth-form';
export const metadata: Metadata = { title: 'Verify your sign-in' };
export default function Page() { return <AuthShell><AuthForm mode="verify" /></AuthShell>; }
