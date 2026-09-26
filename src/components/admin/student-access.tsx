'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StudentAccess({
  userId,
  courses,
  activeCourseIds,
}: {
  userId: string;
  courses: Array<{ id: string; title: string; published: boolean }>;
  activeCourseIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function change(courseId: string, action: 'grant' | 'revoke') {
    setBusy(courseId);
    setMessage('');
    try {
      const response = await fetch('/api/admin/students/' + userId + '/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to update access.');
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update access.');
    } finally {
      setBusy('');
    }
  }

  return <div className="student-access-list">
    {courses.map(course => {
      const active = activeCourseIds.includes(course.id);
      return <div className="student-access-row" key={course.id}>
        <div><strong>{course.title}</strong><small>{course.published ? 'Published' : 'Draft'}</small></div>
        <button
          type="button"
          disabled={busy === course.id}
          className={active ? 'button secondary small' : 'button small'}
          onClick={() => change(course.id, active ? 'revoke' : 'grant')}
        >
          {busy === course.id ? 'Saving…' : active ? 'Revoke' : 'Grant access'}
        </button>
      </div>;
    })}
    {message && <p className="form-foot">{message}</p>}
  </div>;
}
