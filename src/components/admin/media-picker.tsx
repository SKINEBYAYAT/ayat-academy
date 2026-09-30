'use client';
import { useEffect, useRef, useState } from 'react';

function readableSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPicker({ label, value, onChange, accept, kind = 'image' }: { label: string; value: string; onChange: (value: string) => void; accept: string; kind?: 'image'|'video'|'resource' }) {
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(file?: File) {
    if (!file) return;
    setError('');
    setSelectedName(file.name);
    setSelectedSize(readableSize(file.size));
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
  const isVideo = kind === 'video';

  return <div className={`media-picker ${isVideo ? 'video-upload-card' : ''}`}>
    <span className="field-label">{label}</span>
    {isVideo && <p className="media-note">Choose the lesson video directly from your phone or computer. / اختاري فيديو الدرس مباشرة من الهاتف أو الكمبيوتر.</p>}

    {visual ? <div className="media-preview">
      {kind === 'image' ? <img src={visual} alt="" /> : kind === 'video' ? <video src={visual} controls preload="metadata" /> : <div className="file-preview">{visual.split('/').pop()}</div>}
    </div> : <button className="media-empty media-empty-button" type="button" onClick={() => input.current?.click()}>
      <strong>{isVideo ? 'Upload lesson video / رفع فيديو الدرس' : 'Choose image / اختيار صورة'}</strong>
      <span>{isVideo ? 'MP4, MOV or another browser-supported video file' : 'Tap to choose from your device / اضغطي للاختيار من جهازك'}</span>
    </button>}

    {selectedName && <div className="media-file-meta"><strong>{selectedName}</strong><small>{selectedSize}</small></div>}

    <input ref={input} hidden type="file" accept={accept} onChange={e => choose(e.target.files?.[0])} />
    <div className="actions">
      <button className="button secondary small" type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Uploading… / جارٍ الرفع…' : isVideo ? 'Choose or replace video / اختيار أو تبديل الفيديو' : 'Choose or replace / اختيار أو تبديل'}
      </button>
      {(visual || value) && <button className="button secondary small" type="button" onClick={() => { setPreview(''); setSelectedName(''); setSelectedSize(''); onChange(''); }}>Remove / حذف</button>}
    </div>

    {error && <p className="notice error">{error}</p>}
    {isVideo
      ? <p className="media-note"><strong>Secure video setup:</strong> Mux is being connected for protected course playback. Do not upload final paid-course videos until the Mux upload flow is finished. / يتم تجهيز Mux لتشغيل الفيديوهات المحمية، لذلك لا ترفعي الفيديوهات النهائية المدفوعة قبل اكتمال الربط.</p>
      : <p className="media-note">Choose a clear JPG, PNG or WebP image. / اختاري صورة واضحة.</p>}
  </div>;
}
