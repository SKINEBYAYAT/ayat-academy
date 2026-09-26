'use client';
import { useRef, useState } from 'react';

export type LessonResourceDraft = { title: string; privateAssetId: string };

export function ResourcePicker({ resources, onChange }: { resources: LessonResourceDraft[]; onChange: (resources: LessonResourceDraft[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', 'resource');
      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Resource upload failed.');
      onChange([...resources, { title: file.name.replace(/\.[^.]+$/, ''), privateAssetId: result.media.assetId }]);
      if (input.current) input.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resource upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function rename(index: number, title: string) {
    onChange(resources.map((resource, i) => i === index ? { ...resource, title } : resource));
  }

  function remove(index: number) {
    onChange(resources.filter((_, i) => i !== index));
  }

  return <div className="resource-picker">
    <div className="resource-head"><span className="field-label">Lesson resources</span><button className="button secondary small" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : '+ Add file'}</button></div>
    <input ref={input} hidden type="file" accept=".pdf,.docx,image/*" onChange={e => upload(e.target.files?.[0])} />
    {resources.length === 0 ? <p className="media-note">No resources attached.</p> : <div className="resource-list">{resources.map((resource, index) => <div className="resource-row" key={resource.privateAssetId + index}>
      <input aria-label="Resource title" value={resource.title} maxLength={160} onChange={e => rename(index, e.target.value)} />
      <button type="button" className="danger-link" onClick={() => remove(index)}>Remove</button>
    </div>)}</div>}
    {error && <p className="notice error">{error}</p>}
  </div>;
}
