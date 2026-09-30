import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { PwaRegister } from '@/components/pwa-register';
import { LogoutButton } from '@/components/account-actions';
import { currentUser } from '@/lib/auth/session';
import './globals.css';

const siteUrl = process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Ayat Academy | Professional skincare education', template: '%s | Ayat Academy' },
  description: 'Professional skincare education with structured courses, guided lessons, progress tracking, and completion certificates.',
  applicationName: 'Ayat Academy',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Ayat Academy',
    title: 'Ayat Academy | Professional skincare education',
    description: 'Learn professional skincare through structured courses and guided lessons.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ayat Academy | Professional skincare education',
    description: 'Learn professional skincare through structured courses and guided lessons.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/pwa-icon?size=192',
    apple: '/pwa-icon?size=192',
  },
  appleWebApp: {
    capable: true,
    title: 'Ayat Academy',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#294c3e',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Ayat Academy home">ayat<span>ACADEMY</span></Link>
      <nav aria-label="Main navigation">
        <Link href="/courses">Courses</Link>
        {user ? <>
          <Link href="/dashboard">My academy</Link>
          <details className="account-menu">
            <summary aria-label="Open account menu"><span className="menu-icon" aria-hidden="true"><svg className="menu-svg" viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M3 5h14M3 10h14M3 15h14" /></svg></span><span className="menu-label">Menu</span></summary>
            <div className="account-menu-panel">
              <span className="account-menu-name">{user.fullName}</span>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/profile">Your profile</Link>
              <Link href="/certificates">Certificates</Link>
              {user.role === 'admin' && <Link href="/admin">Administration</Link>}
              <LogoutButton />
            </div>
          </details>
        </> : <>
          <Link className="icon-link" href="/login">Sign in <svg className="ui-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none"><path d="M6 4h6v6M12 4 5 11" /></svg></Link>
          <Link className="button small" href="/register">Join the academy</Link>
        </>}
      </nav>
    </header>
    <main id="main">{children}</main>
    <footer className="site-footer"><span>AYAT ACADEMY</span><p>Knowledge is the beginning of beautiful care.</p><span>Skincare education, thoughtfully.</span></footer>
    <PwaRegister />
  </body></html>;
}
