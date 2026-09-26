'use client';
import { useEffect, useRef, useState } from 'react';

export function MediaPicker({ label, value, onChange, accept }: { label: string; value: string; onChange: (value: string) => void; accept: string }) {
  const [preview, setPreview] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  function choose(file?: File) {
    if (!file) return;
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }
  const visual = preview || value;
  return <div className="media-picker">
    <span className="field-label">{label}</span>
    {visual ? <div className="media-preview">
      {accept.startsWith('image') ? <img src={visual} alt="" /> : <div className="file-preview">{visual.split('/').pop()}</div>}
    </div> : <div className="media-empty">No file selected</div>}
    <input ref={input} hidden type="file" accept={accept} onChange={e => choose(e.target.files?.[0])} />
    <div className="actions">
      <button className="button secondary small" type="button" onClick={() => input.current?.click()}>Choose file</button>
      {(visual || value) && <button className="button secondary small" type="button" onClick={() => { setPreview(''); onChange(''); }}>Remove</button>}
    </div>
    {preview && <p className="media-note">Preview selected. Cloud storage is not configured yet, so this file will not be uploaded when you save. The storage adapter will be connected before production.</p>}
  </div>;
}
