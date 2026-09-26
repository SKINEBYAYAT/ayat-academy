'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProgressControls({
  courseId,
  lessonId,
  completed,
  initialVideoPosition = 0,
  hasVideo = false,
}: {
  courseId: string;
  lessonId: string;
  completed: boolean;
  initialVideoPosition?: number;
  hasVideo?: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(completed);
  const [busy, setBusy] = useState(false);
  const lastSaved = useRef(initialVideoPosition);

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
    patch({ currentLessonId: lessonId }).catch(() => {});
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

  function bindVideo(element: HTMLVideoElement | null) {
    if (!element || !hasVideo) return;
    if (initialVideoPosition > 0 && element.currentTime < 1) {
      element.currentTime = initialVideoPosition;
    }
    element.ontimeupdate = () => {
      const current = Math.floor(element.currentTime);
      if (current - lastSaved.current >= 15) {
        lastSaved.current = current;
        patch({ currentLessonId: lessonId, videoPositionSeconds: current }).catch(() => {});
      }
    };
    element.onpause = () => {
      const current = Math.floor(element.currentTime);
      if (current !== lastSaved.current) {
        lastSaved.current = current;
        patch({ currentLessonId: lessonId, videoPositionSeconds: current }).catch(() => {});
      }
    };
  }

  return <div className="lesson-progress-controls">
    {hasVideo && <span className="video-bind" data-video-bind ref={() => {
      const video = document.querySelector<HTMLVideoElement>('[data-course-video]');
      if (video) bindVideo(video);
    }} />}
    <button className={done ? 'button secondary lesson-complete done' : 'button lesson-complete'} disabled={busy || done} onClick={markComplete}>
      {done ? '✓ Completed' : busy ? 'Saving…' : 'Mark complete'}
    </button>
  </div>;
}
