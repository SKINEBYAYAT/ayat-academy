import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { AuthForm } from '@/components/auth-form';
export const metadata: Metadata = { title: 'Create your account' };
export default function Page() { return <AuthShell><AuthForm mode="register" /></AuthShell>; }
