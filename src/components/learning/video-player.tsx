'use client';

import { createElement, useEffect, useRef } from 'react';

type MuxElement = HTMLElement & {
  tokens?: { playback?: string };
  currentTime?: number;
};

export function VideoPlayer({
  src,
  playbackId,
  playbackToken,
  courseId,
  lessonId,
  initialPosition = 0,
}: {
  src?: string;
  playbackId?: string;
  playbackToken?: string;
  courseId: string;
  lessonId: string;
  initialPosition?: number;
}) {
  const lastSaved = useRef(initialPosition);
  const muxRef = useRef<MuxElement | null>(null);

  async function save(position: number) {
    await fetch('/api/learning/courses/' + courseId + '/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentLessonId: lessonId, videoPositionSeconds: Math.max(0, Math.floor(position)) }),
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    if (!playbackId || !playbackToken) return;

    const id = 'mux-player-script';
    if (!document.getElementById(id)) {
      const script = document.createElement('script');
      script.id = id;
      script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player';
      script.async = true;
      document.head.appendChild(script);
    }

    const player = muxRef.current;
    if (!player) return;
    player.tokens = { playback: playbackToken };

    const onLoaded = () => {
      if (initialPosition > 0 && typeof player.currentTime === 'number') player.currentTime = initialPosition;
    };
    const onTime = () => {
      const current = Math.floor(Number(player.currentTime ?? 0));
      if (current - lastSaved.current >= 15) {
        lastSaved.current = current;
        void save(current);
      }
    };
    const onPause = () => {
      const current = Math.floor(Number(player.currentTime ?? 0));
      if (current !== lastSaved.current) {
        lastSaved.current = current;
        void save(current);
      }
    };

    player.addEventListener('loadedmetadata', onLoaded);
    player.addEventListener('timeupdate', onTime);
    player.addEventListener('pause', onPause);
    return () => {
      player.removeEventListener('loadedmetadata', onLoaded);
      player.removeEventListener('timeupdate', onTime);
      player.removeEventListener('pause', onPause);
    };
  }, [playbackId, playbackToken, initialPosition]);

  if (playbackId && playbackToken) {
    return createElement('mux-player', {
      ref: muxRef,
      'playback-id': playbackId,
      controls: true,
      class: 'course-video mux-course-video',
      style: { width: '100%', aspectRatio: '16 / 9', display: 'block', background: '#111' },
    });
  }

  if (!src) return null;

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
