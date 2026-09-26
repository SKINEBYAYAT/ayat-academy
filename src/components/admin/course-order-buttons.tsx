'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CourseOrderButtons({ ids, index }: { ids: string[]; index: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function move(direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= ids.length || busy) return;
    const next = [...ids];
    [next[index], next[other]] = [next[other], next[index]];
    setBusy(true);
    try {
      const response = await fetch('/api/admin/courses/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <div className="course-order-buttons" aria-label="Course order">
    <button type="button" disabled={busy || index === 0} onClick={() => move(-1)} title="Move course up">↑</button>
    <button type="button" disabled={busy || index === ids.length - 1} onClick={() => move(1)} title="Move course down">↓</button>
  </div>;
}
