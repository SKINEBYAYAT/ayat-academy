'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MediaPicker } from './media-picker';

type CourseDraft = {
  title?: string; slug?: string; shortDescription?: string; description?: string;
  thumbnail?: string; coverImage?: string; priceMinor?: number; salePriceMinor?: number | null;
  currency?: string; published?: boolean; featured?: boolean; requirements?: string[];
  learningOutcomes?: string[]; instructorName?: string; instructorBio?: string;
  estimatedMinutes?: number | null; certificateEnabled?: boolean; order?: number;
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function CourseForm({ initial, courseId }: { initial?: CourseDraft; courseId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? '');
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? '');
  const courseUrl = useMemo(() => `/course/${slug || 'your-course'}`, [slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const lines = (name: string) => String(form.get(name) ?? '').split('\n').map(x => x.trim()).filter(Boolean);
    const dollars = (name: string) => {
      const raw = String(form.get(name) ?? '').trim();
      return raw ? Math.round(Number(raw) * 100) : null;
    };
    const payload = {
      title, slug, shortDescription: form.get('shortDescription'), description: form.get('description'),
      thumbnail, coverImage, priceMinor: dollars('price') ?? 0, salePriceMinor: dollars('salePrice'),
      currency: String(form.get('currency') ?? 'USD'), published: form.get('published') === 'on',
      featured: form.get('featured') === 'on', requirements: lines('requirements'),
      learningOutcomes: lines('learningOutcomes'), instructorName: form.get('instructorName'),
      instructorBio: form.get('instructorBio'), estimatedMinutes: Number(form.get('estimatedMinutes') || 0) || null,
      certificateEnabled: form.get('certificateEnabled') === 'on', order: Number(form.get('order') || 0),
    };
    try {
      const response = await fetch(courseId ? `/api/admin/courses/${courseId}` : '/api/admin/courses', {
        method: courseId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save course.');
      const id = courseId ?? result.course.id;
      router.push(`/admin/courses/${id}/content`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save course.'); }
    finally { setBusy(false); }
  }

  return <form className="course-form" onSubmit={submit}>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="admin-form-grid">
      <label className="field">Course title<input value={title} onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required maxLength={160} /></label>
      <label className="field">Course URL<input value={slug} onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /><small>{courseUrl}</small></label>
    </div>
    <label className="field">Short description<textarea name="shortDescription" defaultValue={initial?.shortDescription} maxLength={320} rows={3} /></label>
    <label className="field">Full description<textarea name="description" defaultValue={initial?.description} maxLength={20000} rows={8} /></label>

    <div className="admin-form-grid">
      <MediaPicker label="Thumbnail" value={thumbnail} onChange={setThumbnail} accept="image/*" />
      <MediaPicker label="Cover image" value={coverImage} onChange={setCoverImage} accept="image/*" />
    </div>

    <div className="admin-form-grid three">
      <label className="field">Price (USD)<input name="price" type="number" step="0.01" min="0" defaultValue={((initial?.priceMinor ?? 0) / 100).toFixed(2)} /></label>
      <label className="field">Sale price optional<input name="salePrice" type="number" step="0.01" min="0" defaultValue={initial?.salePriceMinor != null ? (initial.salePriceMinor / 100).toFixed(2) : ''} /></label>
      <label className="field">Currency<input name="currency" defaultValue={initial?.currency ?? 'USD'} maxLength={3} /></label>
    </div>

    <div className="admin-form-grid">
      <label className="field">Instructor name<input name="instructorName" defaultValue={initial?.instructorName} maxLength={120} /></label>
      <label className="field">Estimated duration (minutes)<input name="estimatedMinutes" type="number" min="0" defaultValue={initial?.estimatedMinutes ?? ''} /></label>
    </div>
    <label className="field">Instructor bio<textarea name="instructorBio" defaultValue={initial?.instructorBio} rows={5} /></label>
    <div className="admin-form-grid">
      <label className="field">Requirements — one per line<textarea name="requirements" defaultValue={(initial?.requirements ?? []).join('\n')} rows={5} /></label>
      <label className="field">What students will learn — one per line<textarea name="learningOutcomes" defaultValue={(initial?.learningOutcomes ?? []).join('\n')} rows={5} /></label>
    </div>
    <div className="admin-form-grid three">
      <label className="checkbox"><input name="published" type="checkbox" defaultChecked={initial?.published} /><span>Published</span></label>
      <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={initial?.featured} /><span>Featured</span></label>
      <label className="checkbox"><input name="certificateEnabled" type="checkbox" defaultChecked={initial?.certificateEnabled} /><span>Certificate enabled</span></label>
    </div>
    <label className="field small-field">Display order<input name="order" type="number" min="0" defaultValue={initial?.order ?? 0} /></label>
    <div className="actions">
      <button className="button" disabled={busy}>{busy ? 'Saving…' : courseId ? 'Save & continue' : 'Create course'}</button>
      <button className="button secondary" type="button" onClick={() => router.push('/admin/courses')}>Cancel</button>
    </div>
  </form>;
}
