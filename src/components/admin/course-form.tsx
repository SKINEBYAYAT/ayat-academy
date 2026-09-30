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

    <div className="panel admin-form-section">
      <span className="eyebrow">Basic information / المعلومات الأساسية</span>
      <div className="admin-form-grid">
        <label className="field">Course title / اسم الدورة
          <input value={title} onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required maxLength={160} />
          <small>The public course name students will see. / اسم الدورة الذي سيظهر للطلاب.</small>
        </label>
        <label className="field">Course URL / رابط الدورة
          <input value={slug} onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          <small>{courseUrl} · English letters, numbers and hyphens only. / أحرف إنجليزية وأرقام وشرطات فقط.</small>
        </label>
      </div>
      <label className="field">Short description / الوصف المختصر
        <textarea name="shortDescription" defaultValue={initial?.shortDescription} maxLength={320} rows={3} />
        <small>Short text for course cards. / وصف قصير يظهر في بطاقة الدورة.</small>
      </label>
      <label className="field">Full description / الوصف الكامل
        <textarea name="description" defaultValue={initial?.description} maxLength={20000} rows={8} />
        <small>Explain the course, who it is for, and what it covers. / اشرحي تفاصيل الدورة ولمن تناسب وماذا تشمل.</small>
      </label>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">Course images / صور الدورة</span>
      <p className="media-note">Thumbnail = small card image. Cover = large image inside the course page. / الصورة المصغرة للبطاقات، وصورة الغلاف تظهر داخل صفحة الدورة.</p>
      <div className="admin-form-grid">
        <MediaPicker label="Thumbnail / الصورة المصغرة" value={thumbnail} onChange={setThumbnail} accept="image/*" />
        <MediaPicker label="Cover image / صورة الغلاف" value={coverImage} onChange={setCoverImage} accept="image/*" />
      </div>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">Price & instructor / السعر والمدرّبة</span>
      <div className="admin-form-grid three">
        <label className="field">Price (USD) / السعر بالدولار<input name="price" type="number" step="0.01" min="0" defaultValue={((initial?.priceMinor ?? 0) / 100).toFixed(2)} /></label>
        <label className="field">Sale price — optional / سعر التخفيض — اختياري<input name="salePrice" type="number" step="0.01" min="0" defaultValue={initial?.salePriceMinor != null ? (initial.salePriceMinor / 100).toFixed(2) : ''} /></label>
        <label className="field">Currency / العملة<input name="currency" defaultValue={initial?.currency ?? 'USD'} maxLength={3} /></label>
      </div>
      <div className="admin-form-grid">
        <label className="field">Instructor name / اسم المدرّبة<input name="instructorName" defaultValue={initial?.instructorName} maxLength={120} /></label>
        <label className="field">Estimated duration (minutes) / مدة الدورة بالدقائق<input name="estimatedMinutes" type="number" min="0" defaultValue={initial?.estimatedMinutes ?? ''} /></label>
      </div>
      <label className="field">Instructor bio / نبذة عن المدرّبة<textarea name="instructorBio" defaultValue={initial?.instructorBio} rows={5} /></label>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">Student information / معلومات الطالب</span>
      <div className="admin-form-grid">
        <label className="field">Requirements — one per line / المتطلبات — كل متطلب بسطر
          <textarea name="requirements" defaultValue={(initial?.requirements ?? []).join('\n')} rows={5} />
        </label>
        <label className="field">What students will learn — one per line / ماذا سيتعلم الطالب — كل نقطة بسطر
          <textarea name="learningOutcomes" defaultValue={(initial?.learningOutcomes ?? []).join('\n')} rows={5} />
        </label>
      </div>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">Visibility & certificate / الظهور والشهادة</span>
      <div className="admin-form-grid three">
        <label className="checkbox"><input name="published" type="checkbox" defaultChecked={initial?.published} /><span>Published / منشورة</span></label>
        <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={initial?.featured} /><span>Featured / مميزة</span></label>
        <label className="checkbox"><input name="certificateEnabled" type="checkbox" defaultChecked={initial?.certificateEnabled} /><span>Certificate enabled / تفعيل الشهادة</span></label>
      </div>
      <label className="field small-field">Display order / ترتيب الظهور
        <input name="order" type="number" min="0" defaultValue={initial?.order ?? 0} />
        <small>0 appears first, then 1, 2, 3… / الرقم الأصغر يظهر أولاً.</small>
      </label>
    </div>

    <div className="actions">
      <button className="button" disabled={busy}>{busy ? 'Saving… / جارٍ الحفظ…' : courseId ? 'Save & continue / حفظ ومتابعة' : 'Create course / إنشاء الدورة'}</button>
      <button className="button secondary" type="button" onClick={() => router.push('/admin/courses')}>Cancel / إلغاء</button>
    </div>
  </form>;
}
