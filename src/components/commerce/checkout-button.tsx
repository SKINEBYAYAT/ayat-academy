'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutButton({
  courseId,
  slug,
  signedIn,
  alreadyOwned,
}: {
  courseId: string;
  slug: string;
  signedIn: boolean;
  alreadyOwned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (alreadyOwned) {
    return <button className="button" onClick={() => router.push('/learn/' + slug)}>Continue learning</button>;
  }

  return <button className="button" disabled={busy} onClick={() => {
    if (!signedIn) {
      router.push('/login?next=' + encodeURIComponent('/checkout/' + slug));
      return;
    }
    setBusy(true);
    router.push('/checkout/' + slug);
  }}>{busy ? 'Opening…' : 'Enroll now'}</button>;
}
