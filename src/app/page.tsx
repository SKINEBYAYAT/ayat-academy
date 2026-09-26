import Link from 'next/link';
export default function Home() {
  return <section className="home"><span className="eyebrow">Welcome to Ayat Academy</span><h1>Beautiful care begins<br />with understanding.</h1><p>A dedicated space for your skincare education. Create your account to get ready for your learning journey, or sign in to manage your profile.</p><div className="actions"><Link className="button" href="/register">Begin your journey ↗</Link><Link className="button secondary" href="/login">Welcome back</Link></div></section>;
}
