import Link from 'next/link';

export default function NotFound() {
  return <section className="not-found-page">
    <span className="eyebrow">Ayat Academy</span>
    <h1>We couldn’t find that page.</h1>
    <p>The page may have moved, or the course may no longer be published.</p>
    <div className="actions">
      <Link className="button" href="/courses">Browse courses</Link>
      <Link className="button secondary" href="/">Go home</Link>
    </div>
  </section>;
}
