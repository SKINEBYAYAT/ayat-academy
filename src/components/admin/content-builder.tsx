'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { MediaPicker } from './media-picker';
import { ResourcePicker, type LessonResourceDraft } from './resource-picker';

type Level = { _id: string; title: string; description?: string; published: boolean; order: number };
type Section = { _id: string; levelId: string; title: string; description?: string; published: boolean; order: number };
type Lesson = {
  _id: string;
  levelId: string;
  sectionId: string;
  title: string;
  description?: string;
  content?: string;
  videoAssetId?: string;
  resources?: LessonResourceDraft[];
  published: boolean;
  preview: boolean;
  durationSeconds?: number;
  order: number;
};
type BuilderItem = Level | Section | Lesson;
type State = { levels: Level[]; sections: Section[]; lessons: Lesson[] };
type Editor = { type: 'level' | 'section' | 'lesson'; parent?: string; item?: BuilderItem };

async function request(courseId: string, payload: unknown) {
  const response = await fetch('/api/admin/courses/' + courseId + '/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Unable to save.');
  return result;
}

export function ContentBuilder({ courseId, initial }: { courseId: string; initial: State }) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = (en: string, ar: string) => lang === 'ar' ? ar : en;
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [lessonVideo, setLessonVideo] = useState('');
  const [lessonResources, setLessonResources] = useState<LessonResourceDraft[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sectionsByLevel = useMemo(
    () => new Map(state.levels.map(level => [
      level._id,
      state.sections.filter(section => String(section.levelId) === level._id).sort((a, b) => a.order - b.order),
    ])),
    [state],
  );

  const lessonsBySection = useMemo(
    () => new Map(state.sections.map(section => [
      section._id,
      state.lessons.filter(lesson => String(lesson.sectionId) === section._id).sort((a, b) => a.order - b.order),
    ])),
    [state],
  );

  function openEditor(next: Editor) {
    setEditor(next);
    if (next.type === 'lesson') {
      const lesson = next.item as Lesson | undefined;
      setLessonVideo(lesson?.videoAssetId ?? '');
      setLessonResources(lesson?.resources ?? []);
    } else {
      setLessonVideo('');
      setLessonResources([]);
    }
    setError('');
    setMessage('');
  }

  function closeEditor() {
    setEditor(null);
    setLessonVideo('');
    setLessonResources([]);
  }

  async function refresh() {
    const response = await fetch('/api/admin/courses/' + courseId + '/content', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Unable to refresh.');
    setState(data);
  }

  async function act(payload: unknown) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request(courseId, payload);
      setMessage(result.message ?? t('Saved.', 'تم الحفظ.'));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Unable to save.', 'تعذر الحفظ.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;

    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);

    try {
      if (editor.type === 'level') {
        const data = {
          title: form.get('title'),
          description: form.get('description'),
          published: form.get('published') === 'on',
          order: Number(form.get('order') || 0),
        };
        await request(courseId, editor.item
          ? { action: 'updateLevel', id: editor.item._id, data }
          : { action: 'createLevel', data });
      } else if (editor.type === 'section') {
        const item = editor.item as Section | undefined;
        const levelId = editor.parent ?? String(item?.levelId ?? '');
        const data = {
          levelId,
          title: form.get('title'),
          description: form.get('description'),
          published: form.get('published') === 'on',
          order: Number(form.get('order') || 0),
        };
        await request(courseId, item
          ? { action: 'updateSection', id: item._id, data }
          : { action: 'createSection', data });
      } else {
        const item = editor.item as Lesson | undefined;
        const sectionId = editor.parent ?? String(item?.sectionId ?? '');
        const section = state.sections.find(candidate => candidate._id === sectionId);
        if (!section) throw new Error(t('Section not found.', 'القسم غير موجود.'));

        const resources = lessonResources
          .map(resource => ({ title: resource.title.trim(), privateAssetId: resource.privateAssetId }))
          .filter(resource => resource.title && resource.privateAssetId);
        const durationMinutes = Number(form.get('durationMinutes') || 0);

        const data = {
          levelId: String(section.levelId),
          sectionId: section._id,
          title: form.get('title'),
          description: form.get('description'),
          content: form.get('content'),
          durationSeconds: durationMinutes > 0 ? Math.round(durationMinutes * 60) : null,
          preview: form.get('preview') === 'on',
          published: form.get('published') === 'on',
          order: Number(form.get('order') || 0),
          videoAssetId: lessonVideo,
          resources,
        };
        await request(courseId, item
          ? { action: 'updateLesson', id: item._id, data }
          : { action: 'createLesson', data });
      }

      closeEditor();
      setMessage(t('Saved.', 'تم الحفظ.'));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Unable to save.', 'تعذر الحفظ.'));
    } finally {
      setBusy(false);
    }
  }

  async function move(kind: 'level' | 'section' | 'lesson', ids: string[], index: number, direction: -1 | 1) {
    const next = [...ids];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    await act({ action: 'reorder', kind, ids: next });
  }

  const levels = [...state.levels].sort((a, b) => a.order - b.order);

  return <div className="builder" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <div className="admin-language-row">
      <button type="button" className="button secondary small" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
        {lang === 'en' ? 'العربية' : 'English'}
      </button>
    </div>

    <div className="panel admin-builder-guide">
      <span className="eyebrow">{t('Course structure', 'هيكل الدورة')}</span>
      <h3>{t('Level → Section → Lesson', 'مستوى ← قسم ← درس')}</h3>
      <p>{t(
        'Start with a level, add sections inside it, then add lessons with videos and resources. All published content here is included in the course purchase automatically.',
        'ابدئي بالمستوى، ثم أضيفي الأقسام داخله، وبعدها الدروس والفيديوهات والملفات. كل المحتوى المنشور هنا يكون مشمولاً تلقائياً عند شراء الدورة.',
      )}</p>
    </div>

    <div className="builder-toolbar">
      <button className="button" onClick={() => openEditor({ type: 'level' })}>{t('+ Add level', '+ إضافة مستوى')}</button>
      <span className={error ? 'save-state error-text' : 'save-state'}>{busy ? t('Saving…', 'جارٍ الحفظ…') : error || message}</span>
    </div>

    {levels.length === 0 && <div className="panel empty-state">
      <h3>{t('No levels yet', 'لا يوجد مستويات بعد')}</h3>
      <p>{t('Add the first level to start building the course.', 'أضيفي أول مستوى لبدء بناء الدورة.')}</p>
    </div>}

    {levels.map((level, levelIndex) => {
      const sections = sectionsByLevel.get(level._id) ?? [];
      return <section className="builder-level" key={level._id}>
        <div className="builder-row level-row">
          <button className="collapse-button" onClick={() => setOpen(v => ({ ...v, [level._id]: !v[level._id] }))}>{open[level._id] ? '−' : '+'}</button>
          <div className="builder-copy">
            <span className="status-badge">{level.published ? t('Published', 'منشور') : t('Draft', 'مسودة')}</span>
            <h2>{level.title}</h2>
          </div>
          <div className="builder-actions">
            <button aria-label={t('Move up', 'تحريك للأعلى')} disabled={levelIndex === 0} onClick={() => move('level', levels.map(i => i._id), levelIndex, -1)}><span className="reorder-icon reorder-up" aria-hidden="true" /></button>
            <button aria-label={t('Move down', 'تحريك للأسفل')} disabled={levelIndex === levels.length - 1} onClick={() => move('level', levels.map(i => i._id), levelIndex, 1)}><span className="reorder-icon reorder-down" aria-hidden="true" /></button>
            <button onClick={() => openEditor({ type: 'level', item: level })}>{t('Edit', 'تعديل')}</button>
            <button onClick={() => openEditor({ type: 'section', parent: level._id })}>{t('+ Section', '+ قسم')}</button>
            <button className="danger-link" onClick={() => confirm(t('Delete this level and everything inside it?', 'حذف هذا المستوى وكل ما بداخله؟')) && act({ action: 'deleteLevel', id: level._id })}>{t('Delete', 'حذف')}</button>
          </div>
        </div>

        {open[level._id] && <div className="builder-children">
          {sections.length === 0 && <p className="builder-empty">{t('No sections yet', 'لا يوجد أقسام بعد')}</p>}
          {sections.map((section, sectionIndex) => {
            const lessons = lessonsBySection.get(section._id) ?? [];
            return <div className="builder-section" key={section._id}>
              <div className="builder-row section-row">
                <button className="collapse-button" onClick={() => setOpen(v => ({ ...v, [section._id]: !v[section._id] }))}>{open[section._id] ? '−' : '+'}</button>
                <div className="builder-copy">
                  <span className="status-badge">{section.published ? t('Published', 'منشور') : t('Draft', 'مسودة')}</span>
                  <h3>{section.title}</h3>
                </div>
                <div className="builder-actions">
                  <button aria-label={t('Move up', 'تحريك للأعلى')} disabled={sectionIndex === 0} onClick={() => move('section', sections.map(i => i._id), sectionIndex, -1)}><span className="reorder-icon reorder-up" aria-hidden="true" /></button>
                  <button aria-label={t('Move down', 'تحريك للأسفل')} disabled={sectionIndex === sections.length - 1} onClick={() => move('section', sections.map(i => i._id), sectionIndex, 1)}><span className="reorder-icon reorder-down" aria-hidden="true" /></button>
                  <button onClick={() => openEditor({ type: 'section', item: section })}>{t('Edit', 'تعديل')}</button>
                  <button onClick={() => openEditor({ type: 'lesson', parent: section._id })}>{t('+ Lesson', '+ درس')}</button>
                  <button className="danger-link" onClick={() => confirm(t('Delete this section and all lessons inside it?', 'حذف هذا القسم وكل الدروس داخله؟')) && act({ action: 'deleteSection', id: section._id })}>{t('Delete', 'حذف')}</button>
                </div>
              </div>

              {open[section._id] && <div className="lesson-list">
                {lessons.length === 0 && <p className="builder-empty">{t('No lessons yet', 'لا يوجد دروس بعد')}</p>}
                {lessons.map((lesson, lessonIndex) => <div className="builder-row lesson-row" key={lesson._id}>
                  <div className="builder-copy">
                    <span className="lesson-dot">•</span>
                    <div>
                      <strong>{lesson.title}</strong>
                      <small>
                        {lesson.published ? t('Published', 'منشور') : t('Draft', 'مسودة')}
                        {lesson.preview ? ' · ' + t('Free preview', 'معاينة مجانية') : ''}
                        {lesson.resources?.length ? ' · ' + lesson.resources.length + ' ' + t('resources', 'ملفات') : ''}
                      </small>
                    </div>
                  </div>
                  <div className="builder-actions">
                    <button aria-label={t('Move up', 'تحريك للأعلى')} disabled={lessonIndex === 0} onClick={() => move('lesson', lessons.map(i => i._id), lessonIndex, -1)}><span className="reorder-icon reorder-up" aria-hidden="true" /></button>
                    <button aria-label={t('Move down', 'تحريك للأسفل')} disabled={lessonIndex === lessons.length - 1} onClick={() => move('lesson', lessons.map(i => i._id), lessonIndex, 1)}><span className="reorder-icon reorder-down" aria-hidden="true" /></button>
                    <button onClick={() => openEditor({ type: 'lesson', item: lesson })}>{t('Edit', 'تعديل')}</button>
                    <button className="danger-link" onClick={() => confirm(t('Delete this lesson?', 'حذف هذا الدرس؟')) && act({ action: 'deleteLesson', id: lesson._id })}>{t('Delete', 'حذف')}</button>
                  </div>
                </div>)}
              </div>}
            </div>;
          })}
        </div>}
      </section>;
    })}

    {editor && <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) closeEditor(); }}>
      <div className="admin-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>
            {editor.item ? t('Edit', 'تعديل') : t('Add', 'إضافة')} {editor.type === 'level' ? t('Level', 'مستوى') : editor.type === 'section' ? t('Section', 'قسم') : t('Lesson', 'درس')}
          </h2>
          <button aria-label={t('Close', 'إغلاق')} onClick={closeEditor}>×</button>
        </div>

        <form className="course-form" onSubmit={saveEditor}>
          <label className="field">{t('Title', 'العنوان')}
            <input name="title" defaultValue={editor.item?.title ?? ''} required />
          </label>
          <label className="field">{t('Description', 'الوصف')}
            <textarea name="description" defaultValue={editor.item?.description ?? ''} rows={3} />
          </label>

          {editor.type === 'lesson' && <>
            <div className="panel lesson-admin-section">
              <span className="eyebrow">{t('Lesson material', 'محتوى الدرس')}</span>
              <label className="field">{t('Written lesson content', 'المحتوى المكتوب')}
                <RichTextEditor name="content" defaultValue={(editor.item as Lesson | undefined)?.content ?? ''} language={lang} />
              </label>
              <MediaPicker label={t('Lesson video', 'فيديو الدرس')} language={lang} value={lessonVideo} onChange={setLessonVideo} accept="video/*" kind="video" />
              <ResourcePicker resources={lessonResources} onChange={setLessonResources} language={lang} />
              <label className="field">{t('Video duration (minutes)', 'مدة الفيديو بالدقائق')}
                <input name="durationMinutes" type="number" min="0" step="0.1" defaultValue={(editor.item as Lesson | undefined)?.durationSeconds ? ((editor.item as Lesson).durationSeconds! / 60).toFixed(1) : ''} />
                <small>{t('Example: 12.5 means 12 minutes 30 seconds.', 'مثال: 12.5 يعني 12 دقيقة و30 ثانية.')}</small>
              </label>
            </div>

            <div className="panel lesson-admin-section">
              <span className="eyebrow">{t('Lesson access', 'إعدادات الدرس')}</span>
              <div className="admin-form-grid">
                <label className="checkbox"><input name="preview" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.preview} /><span>{t('Free preview', 'معاينة مجانية')}</span></label>
                <label className="checkbox"><input name="published" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.published} /><span>{t('Published', 'منشور')}</span></label>
              </div>
            </div>
          </>}

          {editor.type !== 'lesson' && <label className="checkbox"><input name="published" type="checkbox" defaultChecked={editor.item?.published} /><span>{t('Published', 'منشور')}</span></label>}

          <label className="field">{t('Order', 'الترتيب')}
            <input name="order" type="number" min="0" defaultValue={editor.item?.order ?? 0} />
            <small>{t('Lower numbers appear first.', 'الرقم الأصغر يظهر أولاً.')}</small>
          </label>

          <div className="actions">
            <button className="button" disabled={busy}>{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save', 'حفظ')}</button>
            <button className="button secondary" type="button" onClick={closeEditor}>{t('Cancel', 'إلغاء')}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}
