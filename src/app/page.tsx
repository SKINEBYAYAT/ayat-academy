import Link from 'next/link';
export default function Home() {
  return <section className="home"><span className="eyebrow">Welcome to Ayat Academy</span><h1>Beautiful care begins<br />with understanding.</h1><p>A dedicated space for professional skincare education. Explore structured courses, learn at your pace, and continue exactly where you left off.</p><div className="actions"><Link className="button" href="/courses">Explore courses ↗</Link><Link className="button secondary" href="/login">Welcome back</Link></div></section>;
}
