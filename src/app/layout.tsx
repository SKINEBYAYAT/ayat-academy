import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Ayat Academy | The art & science of skincare', template: '%s | Ayat Academy' },
  description: 'Your space to grow in professional skincare. Learn with intention, build your confidence, and care with knowledge.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f5ef' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><Link href="/" className="wordmark" aria-label="Ayat Academy home">ayat<span>ACADEMY</span></Link><nav aria-label="Main navigation"><Link href="/courses">Courses</Link><Link href="/login">Sign in <span aria-hidden="true">↗</span></Link><Link className="button small" href="/register">Join the academy</Link></nav></header>
    <main id="main">{children}</main>
    <footer className="site-footer"><span>AYAT ACADEMY</span><p>Knowledge is the beginning of beautiful care.</p><span>Skincare education, thoughtfully.</span></footer>
  </body></html>;
}
