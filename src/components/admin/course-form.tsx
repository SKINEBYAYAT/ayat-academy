'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MediaPicker } from './media-picker';

type CourseDraft = {
  title?: string; slug?: string; shortDescription?: string; description?: string;
  thumbnail?: string; coverImage?: string; priceMinor?: number; salePriceMinor?: number | null;
  currency?: string; published?: boolean; featured?: boolean; requirements?: string[];
  learningOutcomes?: string[]; instructorName?: string; instructorBio?: string;
  estimatedMinutes?: number | null; certificateEnabled?: boolean; waitlistEnabled?: boolean; enrollmentOpen?: boolean; launchAt?: string | Date | null; order?: number;
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function CourseForm({ initial, courseId }: { initial?: CourseDraft; courseId?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<'en'|'ar'>('en');
  const t = (en: string, ar: string) => lang === 'ar' ? ar : en;
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
      certificateEnabled: true, waitlistEnabled: form.get('waitlistEnabled') === 'on', enrollmentOpen: form.get('enrollmentOpen') === 'on',
      launchAt: String(form.get('launchAt') || '').trim() ? new Date(String(form.get('launchAt'))).toISOString() : null, order: Number(form.get('order') || 0),
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

  return <form className="course-form" onSubmit={submit} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <div className="admin-language-row"><button type="button" className="button secondary small" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>{lang === 'en' ? 'العربية' : 'English'}</button></div>
    {error && <div className="notice error" role="alert">{error}</div>}

    <div className="panel admin-form-section">
      <span className="eyebrow">{t('Basic information','المعلومات الأساسية')}</span>
      <div className="admin-form-grid">
        <label className="field">{t('Course title','اسم الدورة')}
          <input value={title} onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} required maxLength={160} />
          <small>{t('The public course name students will see.','اسم الدورة الذي سيظهر للطلاب.')}</small>
        </label>
        <label className="field">{t('Course URL','رابط الدورة')}
          <input value={slug} onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          <small>{courseUrl} · {t('English letters, numbers and hyphens only.','أحرف إنجليزية وأرقام وشرطات فقط.')}</small>
        </label>
      </div>
      <label className="field">{t('Short description','الوصف المختصر')}
        <textarea name="shortDescription" defaultValue={initial?.shortDescription} maxLength={320} rows={3} />
        <small>{t('Short text for course cards.','وصف قصير يظهر في بطاقة الدورة.')}</small>
      </label>
      <label className="field">{t('Full description','الوصف الكامل')}
        <textarea name="description" defaultValue={initial?.description} maxLength={20000} rows={8} />
        <small>{t('Explain the course, who it is for, and what it covers.','اشرحي تفاصيل الدورة ولمن تناسب وماذا تشمل.')}</small>
      </label>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">{t('Course images','صور الدورة')}</span>
      <p className="media-note">{t('Thumbnail = small card image. Cover = large image inside the course page.','الصورة المصغرة للبطاقات، وصورة الغلاف تظهر داخل صفحة الدورة.')}</p>
      <div className="admin-form-grid">
        <MediaPicker label={t('Thumbnail','الصورة المصغرة')} language={lang} value={thumbnail} onChange={setThumbnail} accept="image/*" />
        <MediaPicker label={t('Cover image','صورة الغلاف')} language={lang} value={coverImage} onChange={setCoverImage} accept="image/*" />
      </div>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">{t('Course price & instructor','سعر الدورة والمدرّبة')}</span>
      <p className="media-note">{t(
        'This price is for the entire course. One purchase unlocks every published level, section and lesson inside this course. Students never pay again for content inside the same course.',
        'هذا السعر للدورة كاملة. عملية شراء واحدة تفتح كل المستويات والأقسام والدروس المنشورة داخل هذه الدورة، ولا يدفع الطالب مرة أخرى على محتوى داخل نفس الدورة.'
      )}</p>
      <div className="admin-form-grid three">
        <label className="field">{t('Full course price (USD)','سعر الدورة كاملة بالدولار')}<input name="price" type="number" step="0.01" min="0" defaultValue={((initial?.priceMinor ?? 0) / 100).toFixed(2)} /></label>
        <label className="field">{t('Sale price — optional','سعر التخفيض — اختياري')}<input name="salePrice" type="number" step="0.01" min="0" defaultValue={initial?.salePriceMinor != null ? (initial.salePriceMinor / 100).toFixed(2) : ''} /></label>
        <label className="field">{t('Currency','العملة')}<input name="currency" defaultValue={initial?.currency ?? 'USD'} maxLength={3} /></label>
      </div>
      <div className="admin-form-grid">
        <label className="field">{t('Instructor name','اسم المدرّبة')}<input name="instructorName" defaultValue={initial?.instructorName} maxLength={120} /></label>
        <label className="field">{t('Estimated duration (minutes)','مدة الدورة بالدقائق')}<input name="estimatedMinutes" type="number" min="0" defaultValue={initial?.estimatedMinutes ?? ''} /></label>
      </div>
      <label className="field">{t('Instructor bio','نبذة عن المدرّبة')}<textarea name="instructorBio" defaultValue={initial?.instructorBio} rows={5} /></label>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">{t('Student information','معلومات الطالب')}</span>
      <div className="admin-form-grid">
        <label className="field">{t('Requirements — one per line','المتطلبات — كل متطلب بسطر')}
          <textarea name="requirements" defaultValue={(initial?.requirements ?? []).join('\n')} rows={5} />
        </label>
        <label className="field">{t('What students will learn — one per line','ماذا سيتعلم الطالب — كل نقطة بسطر')}
          <textarea name="learningOutcomes" defaultValue={(initial?.learningOutcomes ?? []).join('\n')} rows={5} />
        </label>
      </div>
    </div>

    <div className="panel admin-form-section">
      <span className="eyebrow">{t('Visibility & certificate','الظهور والشهادة')}</span>
      <p className="media-note">{t(
        'A certificate is automatically issued to every student who completes all published lessons in this course.',
        'يتم إصدار شهادة تلقائياً لكل طالب يُكمل جميع الدروس المنشورة في هذه الدورة.'
      )}</p>
      <div className="admin-form-grid">
        <label className="checkbox"><input name="published" type="checkbox" defaultChecked={initial?.published} /><span>{t('Published','منشورة')}</span></label>
        <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={initial?.featured} /><span>{t('Featured','مميزة')}</span></label>
        <label className="checkbox"><input name="enrollmentOpen" type="checkbox" defaultChecked={initial?.enrollmentOpen ?? true} /><span>{t('Enrollment open','التسجيل مفتوح')}</span></label>
        <label className="checkbox"><input name="waitlistEnabled" type="checkbox" defaultChecked={initial?.waitlistEnabled} /><span>{t('Enable pre-launch waitlist','تفعيل قائمة الانتظار قبل الإطلاق')}</span></label>
      </div>
      <label className="field">{t('Scheduled launch — optional','موعد الإطلاق — اختياري')}<input name="launchAt" type="datetime-local" defaultValue={initial?.launchAt ? new Date(initial.launchAt).toISOString().slice(0,16) : ''} /><small>{t('Used for pre-launch planning. Enrollment remains controlled by the Enrollment open switch.','يُستخدم للتخطيط قبل الإطلاق. فتح التسجيل يبقى تحت تحكم زر التسجيل مفتوح.')}</small></label>
      <label className="field small-field">{t('Display order','ترتيب الظهور')}
        <input name="order" type="number" min="0" defaultValue={initial?.order ?? 0} />
        <small>{t('0 appears first, then 1, 2, 3…','الرقم الأصغر يظهر أولاً.')}</small>
      </label>
    </div>

    <div className="actions">
      <button className="button" disabled={busy}>{busy ? t('Saving…','جارٍ الحفظ…') : courseId ? t('Save & continue','حفظ ومتابعة') : t('Create course','إنشاء الدورة')}</button>
      <button className="button secondary" type="button" onClick={() => router.push('/admin/courses')}>{t('Cancel','إلغاء')}</button>
    </div>
  </form>;
}
