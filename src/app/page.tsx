import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Professional skincare education',
  description: 'Build professional skincare knowledge with structured online courses, guided lessons, progress tracking, and completion certificates.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return <>
    <section className="home home-hero">
      <span className="eyebrow">Professional skincare education</span>
      <h1>Beautiful care begins<br />with understanding.</h1>
      <p>Learn professional skincare through structured courses, practical lessons, and a learning experience designed to keep your progress clear.</p>
      <div className="actions">
        <Link className="button" href="/courses">Explore courses ↗</Link>
        <Link className="button secondary" href="/login">Continue learning</Link>
      </div>
    </section>

    <section className="home-value" aria-label="Why Ayat Academy">
      <article><span className="home-value-number">01</span><h2>Structured learning</h2><p>Courses are organized into levels, sections, and lessons so students always know what comes next.</p></article>
      <article><span className="home-value-number">02</span><h2>Learn at your pace</h2><p>Your progress and last lesson are remembered, making it easy to leave and continue later.</p></article>
      <article><span className="home-value-number">03</span><h2>Completion certificates</h2><p>Eligible courses can issue a verifiable certificate after all required lessons are completed.</p></article>
    </section>

    <section className="home-cta">
      <span className="eyebrow">Start learning</span>
      <h2>Explore the academy.</h2>
      <p>Choose a published course and see its curriculum, outcomes, requirements, and instructor information before enrolling.</p>
      <Link className="button" href="/courses">View all courses</Link>
    </section>
  </>;
}
