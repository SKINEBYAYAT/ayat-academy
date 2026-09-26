'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProgressControls({
  courseId,
  lessonId,
  completed,
}: {
  courseId: string;
  lessonId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(completed);
  const [busy, setBusy] = useState(false);

  async function patch(body: object) {
    const response = await fetch('/api/learning/courses/' + courseId + '/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to save progress.');
    return result;
  }

  useEffect(() => {
    void patch({ currentLessonId: lessonId }).catch(() => {});
  }, [courseId, lessonId]);

  async function markComplete() {
    if (done || busy) return;
    setBusy(true);
    try {
      await patch({ currentLessonId: lessonId, completedLessonId: lessonId });
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <div className="lesson-progress-controls">
    <button className={done ? 'button secondary lesson-complete done' : 'button lesson-complete'} disabled={busy || done} onClick={markComplete}>
      {done ? '✓ Completed' : busy ? 'Saving…' : 'Mark complete'}
    </button>
  </div>;
}
