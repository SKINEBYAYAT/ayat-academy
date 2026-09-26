'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CourseActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function request(url: string, method: string, body?: object) {
    setBusy(true); setError('');
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Action failed.');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); } finally { setBusy(false); }
  }
  return <div className="course-actions">
    <a className="button secondary small" href={`/admin/courses/${id}/edit`}>Edit</a>
    <a className="button secondary small" href={`/admin/courses/${id}/content`}>Content</a>
    <button className="button secondary small" disabled={busy} onClick={() => request(`/api/admin/courses/${id}`, 'PATCH', { published: !published })}>{published ? 'Unpublish' : 'Publish'}</button>
    <button className="button secondary small" disabled={busy} onClick={() => request(`/api/admin/courses/${id}/duplicate`, 'POST')}>Duplicate</button>
    <button className="danger-button" disabled={busy} onClick={() => confirm('Delete this course and every level, section, and lesson inside it? This cannot be undone.') && request(`/api/admin/courses/${id}`, 'DELETE')}>Delete</button>
    {error && <span className="inline-error">{error}</span>}
  </div>;
}
