'use client';

import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

type Mode = 'register' | 'login' | 'verify' | 'forgot' | 'reset';
function subscribeHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => { window.removeEventListener('hashchange', callback); window.removeEventListener('popstate', callback); };
}
const readHash = () => window.location.hash;
const serverHash = () => '';
const copy: Record<Mode, { title: string; intro: string; submit: string }> = {
  register: { title: 'Begin your journey.', intro: 'Create your account and make room for something beautiful: a deeper understanding of skin.', submit: 'Create my account' },
  login: { title: 'Welcome back.', intro: 'A little more knowledge. A little more confidence. Sign in to your learning space.', submit: 'Sign in' },
  verify: { title: 'A little reassurance.', intro: 'If your request is eligible, a six-digit security code will arrive by email. Enter it below within 10 minutes. Check your spam folder, too.', submit: 'Verify & continue' },
  forgot: { title: 'Let’s get you back.', intro: 'Enter your email address. If you have an account, we’ll send you a secure password reset link.', submit: 'Send reset link' },
  reset: { title: 'A fresh start.', intro: 'Choose a strong, unique password. Updating it will sign you out on all your devices.', submit: 'Save new password' },
};

export function AuthForm({ mode, next = '' }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const hashParams = new URLSearchParams(hash.slice(1));
  const token = hashParams.get(mode === 'verify' ? 'challenge' : 'token') ?? '';
  const hashNext = hashParams.get('next') ?? '';
  const safeNext = (mode === 'verify' ? hashNext : next).startsWith('/') && !(mode === 'verify' ? hashNext : next).startsWith('//') && !(mode === 'verify' ? hashNext : next).startsWith('/admin') ? (mode === 'verify' ? hashNext : next) : '';
  const [cooldown, setCooldown] = useState(60);
  const [done, setDone] = useState(false);
  // Fragments never reach server access logs or Referer headers.
  const tokenError = !done && ['verify', 'reset'].includes(mode) && !/^[A-Za-z0-9_-]{43}$/.test(token)
    ? (mode === 'verify' ? 'Please sign in or register to request a security code.' : 'Open the complete reset link from your email, or request a new one.') : '';
  useEffect(() => {
    if (mode !== 'verify' || cooldown <= 0) return;
    const timeout = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [mode, cooldown]);

  async function request(action: string, data: Record<string, unknown>) {
    const response = await fetch(`/api/auth/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Please try again.');
    return result;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form.entries());
    if (mode === 'verify') { data.challenge = token; data.trustDevice = form.get('trustDevice') === 'on'; }
    if (mode === 'reset') data.token = token;
    try {
      const result = await request(mode, data);
      if (result.challenge) router.push(`/verify#challenge=${encodeURIComponent(result.challenge)}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ''}`);
      else if (result.redirect) { router.replace(result.redirect === '/dashboard' && safeNext ? safeNext : result.redirect); router.refresh(); }
      else { setMessage(result.message); if (mode === 'reset') { setDone(true); window.history.replaceState(null, '', '/reset-password'); } }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(''); setMessage('');
    try { const result = await request('resend', { challenge: token }); setMessage(result.message); setCooldown(60); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to resend.'); }
    finally { setBusy(false); }
  }
  const content = copy[mode];
  return <><span className="eyebrow">Your learning, beautifully personal</span><h1>{content.title}</h1><p className="intro">{content.intro}</p><form onSubmit={submit} className="auth-form">
    {(error || tokenError) && <div role="alert" className="notice error">{error || tokenError}</div>}
    {message && <div role="status" className="notice">{message}</div>}
    {!done && <>
      {mode === 'register' && <label className="field">Full name<input name="fullName" autoComplete="name" placeholder="Your full name" required minLength={2} maxLength={100} /></label>}
      {['register', 'login', 'forgot'].includes(mode) && <label className="field">Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>}
      {['register', 'login', 'reset'].includes(mode) && <label className="field">{mode === 'reset' ? 'New password' : 'Password'}<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Your password' : 'At least 12 characters'} required minLength={mode === 'login' ? 1 : 12} maxLength={72} />{mode !== 'login' && <small>Use 12 or more characters. A unique passphrase works well.</small>}</label>}
      {['register', 'reset'].includes(mode) && <label className="field">Confirm password<input name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Enter your password again" required minLength={12} maxLength={72} /></label>}
      {mode === 'login' && <div className="form-row"><span>Make yourself at home.</span><Link className="text-link" href="/forgot-password">Forgot password?</Link></div>}
      {mode === 'verify' && <><label className="field">Security code<input className="code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" required /></label><label className="checkbox"><input name="trustDevice" type="checkbox" /><span>Trust this personal device for 30 days.<br />Administrators verify at every sign-in.</span></label></>}
      <button className="button" type="submit" disabled={busy || (['verify', 'reset'].includes(mode) && !/^[A-Za-z0-9_-]{43}$/.test(token))}>{busy ? 'Please wait…' : content.submit}<ArrowRight size={16} aria-hidden="true" /></button>
    </>}
  </form>
  {mode === 'verify' && <p className="form-foot">Didn’t receive a code? <button className="resend" onClick={resend} disabled={busy || cooldown > 0 || !token}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</button><br /><Link className="text-link" href="/login">Start again with a new sign-in</Link></p>}
  {mode === 'register' && <p className="form-foot">Already have an account? <Link className="text-link" href="/login">Sign in</Link></p>}
  {mode === 'login' && <p className="form-foot">New to the academy? <Link className="text-link" href="/register">Create an account</Link></p>}
  {['forgot', 'reset'].includes(mode) && <p className="form-foot"><Link className="text-link" href={mode === 'reset' && !done ? '/forgot-password' : '/login'}>{mode === 'reset' && !done ? 'Request a new reset link' : 'Back to sign in'}</Link></p>}
  </>;
}
