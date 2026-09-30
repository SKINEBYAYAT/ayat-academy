'use client';
import { useEffect, useRef, useState } from 'react';

function readableSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function MediaPicker({ label, value, onChange, accept, kind = 'image', language = 'en' }: { label: string; value: string; onChange: (value: string) => void; accept: string; kind?: 'image'|'video'|'resource'; language?: 'en'|'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  async function uploadMuxVideo(file: File) {
    const create = await fetch('/api/admin/media/mux', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const created = await create.json();
    if (!create.ok) throw new Error(created.error ?? t('Unable to start video upload.', 'تعذر بدء رفع الفيديو.'));

    setStatus(t('Uploading video to secure storage…', 'جارٍ رفع الفيديو إلى التخزين الآمن…'));
    let upload: Response;
    try {
      upload = await fetch(created.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
    } catch {
      throw new Error(t(
        'The browser could not reach Mux upload storage. Please retry once after this deployment finishes.',
        'تعذر على المتصفح الوصول إلى تخزين Mux. حاولي مرة أخرى بعد اكتمال هذا التحديث.',
      ));
    }
    if (!upload.ok) throw new Error(t('Video upload failed with status ' + upload.status + '.', 'فشل رفع الفيديو. رمز الخطأ: ' + upload.status + '.'));

    setStatus(t('Upload complete. Mux is processing the video…', 'اكتمل الرفع. جارٍ معالجة الفيديو…'));
    for (let attempt = 0; attempt < 120; attempt++) {
      await wait(attempt < 10 ? 2000 : 3000);
      const response = await fetch('/api/admin/media/mux?uploadId=' + encodeURIComponent(created.uploadId), { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? t('Unable to process video.', 'تعذرت معالجة الفيديو.'));
      if (result.ready && result.assetRef) {
        onChange(result.assetRef);
        setStatus(t('Video is ready and secured.', 'الفيديو جاهز ومحمي.'));
        return;
      }
      setStatus(t('Processing video…', 'جارٍ معالجة الفيديو…'));
    }
    throw new Error(t('Mux is still processing this video. Please try again in a few minutes.', 'ما زال Mux يعالج الفيديو. حاولي مجدداً بعد بضع دقائق.'));
  }

  async function uploadRegular(file: File) {
    const body = new FormData();
    body.set('file', file);
    body.set('kind', kind);
    const response = await fetch('/api/admin/media', { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? t('Upload failed.', 'فشل الرفع.'));
    onChange(result.media.url);
  }

  async function choose(file?: File) {
    if (!file) return;
    setError('');
    setStatus('');
    setSelectedName(file.name);
    setSelectedSize(readableSize(file.size));
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      if (kind === 'video') await uploadMuxVideo(file);
      else await uploadRegular(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Upload failed.', 'فشل الرفع.'));
    } finally {
      setBusy(false);
    }
  }

  const visual = preview || value;
  const isVideo = kind === 'video';
  const muxReady = isVideo && value.startsWith('mux:');

  return <div className={`media-picker ${isVideo ? 'video-upload-card' : ''}`}>
    <span className="field-label">{label}</span>
    {isVideo && <p className="media-note">{t('Choose the lesson video directly from your phone or computer.','اختاري فيديو الدرس مباشرة من الهاتف أو الكمبيوتر.')}</p>}

    {muxReady && !preview ? <div className="media-empty">
      <strong>{t('Secure video uploaded', 'تم رفع الفيديو بشكل آمن')}</strong>
      <span>{t('The video is stored in Mux and will play only for students with access.', 'الفيديو محفوظ على Mux وسيظهر فقط للطلاب الذين لديهم صلاحية الوصول.')}</span>
    </div> : visual ? <div className="media-preview">
      {kind === 'image' ? <img src={visual} alt="" /> : kind === 'video' ? <video src={visual.startsWith('mux:') ? undefined : visual} controls preload="metadata" /> : <div className="file-preview">{visual.split('/').pop()}</div>}
    </div> : <button className="media-empty media-empty-button" type="button" onClick={() => input.current?.click()}>
      <strong>{isVideo ? t('Upload lesson video','رفع فيديو الدرس') : t('Choose image','اختيار صورة')}</strong>
      <span>{isVideo ? t('MP4, MOV or another browser-supported video file','MP4 أو MOV أو أي صيغة فيديو يدعمها المتصفح') : t('Tap to choose from your device','اضغطي للاختيار من جهازك')}</span>
    </button>}

    {selectedName && <div className="media-file-meta"><strong>{selectedName}</strong><small>{selectedSize}</small></div>}
    {status && <p className="media-note"><strong>{status}</strong></p>}

    <input ref={input} hidden type="file" accept={accept} onChange={e => choose(e.target.files?.[0])} />
    <div className="actions">
      <button className="button secondary small" type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? t('Uploading / processing…','جارٍ الرفع / المعالجة…') : isVideo ? t('Choose or replace video','اختيار أو تبديل الفيديو') : t('Choose or replace','اختيار أو تبديل')}
      </button>
      {(visual || value) && <button className="button secondary small" type="button" disabled={busy} onClick={() => { setPreview(''); setSelectedName(''); setSelectedSize(''); setStatus(''); onChange(''); }}>{t('Remove','حذف')}</button>}
    </div>

    {error && <p className="notice error">{error}</p>}
    {isVideo
      ? <p className="media-note">{t('Videos upload directly to Mux and are saved only after secure processing finishes.','يتم رفع الفيديو مباشرة إلى Mux وحفظه بعد انتهاء المعالجة الآمنة.')}</p>
      : <p className="media-note">{t('Choose any common image from your device. JPG, PNG, WebP, AVIF, GIF, BMP, HEIC and HEIF are accepted up to 12 MB.','اختاري أي صورة شائعة من جهازك. يتم قبول JPG وPNG وWebP وAVIF وGIF وBMP وHEIC وHEIF حتى 12 ميغابايت.')}</p>}
  </div>;
}
