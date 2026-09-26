'use client';

import { useRef } from 'react';

export function VideoPlayer({
  src,
  courseId,
  lessonId,
  initialPosition = 0,
}: {
  src: string;
  courseId: string;
  lessonId: string;
  initialPosition?: number;
}) {
  const lastSaved = useRef(initialPosition);

  async function save(position: number) {
    await fetch('/api/learning/courses/' + courseId + '/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentLessonId: lessonId, videoPositionSeconds: Math.max(0, Math.floor(position)) }),
      keepalive: true,
    }).catch(() => {});
  }

  return <video
    className="course-video"
    controls
    preload="metadata"
    src={src}
    onLoadedMetadata={event => {
      if (initialPosition > 0 && event.currentTarget.duration > initialPosition) {
        event.currentTarget.currentTime = initialPosition;
      }
    }}
    onTimeUpdate={event => {
      const current = Math.floor(event.currentTarget.currentTime);
      if (current - lastSaved.current >= 15) {
        lastSaved.current = current;
        void save(current);
      }
    }}
    onPause={event => {
      const current = Math.floor(event.currentTarget.currentTime);
      if (current !== lastSaved.current) {
        lastSaved.current = current;
        void save(current);
      }
    }}
  />;
}
