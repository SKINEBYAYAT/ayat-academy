'use client';
import { useEffect, useRef, useState } from 'react';

export function MediaPicker({ label, value, onChange, accept, kind = 'image' }: { label: string; value: string; onChange: (value: string) => void; accept: string; kind?: 'image'|'video'|'resource' }) {
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(file?: File) {
    if (!file) return;
    setError('');
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const body = new FormData(); body.set('file', file); body.set('kind', kind);
      const response = await fetch('/api/admin/media', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Upload failed.');
      onChange(result.media.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }

  const visual = preview || value;
  return <div className="media-picker">
    <span className="field-label">{label}</span>
    {visual ? <div className="media-preview">
      {kind === 'image' ? <img src={visual} alt="" /> : kind === 'video' ? <video src={visual} controls preload="metadata" /> : <div className="file-preview">{visual.split('/').pop()}</div>}
    </div> : <div className="media-empty">No file selected</div>}
    <input ref={input} hidden type="file" accept={accept} onChange={e => choose(e.target.files?.[0])} />
    <div className="actions">
      <button className="button secondary small" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : 'Choose file'}</button>
      {(visual || value) && <button className="button secondary small" type="button" onClick={() => { setPreview(''); onChange(''); }}>Remove</button>}
    </div>
    {error && <p className="notice error">{error}</p>}
    <p className="media-note">Local development uploads work now. Production requires a cloud media provider; large course videos should use private/signed playback.</p>
  </div>;
}
