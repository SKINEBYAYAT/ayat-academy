'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="home"><span className="eyebrow">A moment of patience</span><h1>We couldn’t load your space.</h1><p>The service may be temporarily unavailable or awaiting configuration. Please try again shortly.</p><button className="button" onClick={reset}>Try again</button></section>;
}
