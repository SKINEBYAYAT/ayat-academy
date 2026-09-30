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
            <summary aria-label="Open account menu"><span className="menu-icon" aria-hidden="true">☰</span><span className="menu-label">Menu</span></summary>
            <div className="account-menu-panel">
              <span className="account-menu-name">{user.fullName}</span>
              <Link href="/dashboard">Dashboard</Link>
              {user.role === 'admin' && <Link href="/admin">Administration</Link>}
              <LogoutButton />
            </div>
          </details>
        </> : <>
          <Link href="/login">Sign in <span aria-hidden="true">↗</span></Link>
          <Link className="button small" href="/register">Join the academy</Link>
        </>}
      </nav>
    </header>
    <main id="main">{children}</main>
    <footer className="site-footer"><span>AYAT ACADEMY</span><p>Knowledge is the beginning of beautiful care.</p><span>Skincare education, thoughtfully.</span></footer>
    <PwaRegister />
  </body></html>;
}
