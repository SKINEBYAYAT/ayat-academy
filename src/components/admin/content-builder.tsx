'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { MediaPicker } from './media-picker';
import { ResourcePicker, type LessonResourceDraft } from './resource-picker';

type Level = { _id: string; title: string; description?: string; published: boolean; order: number };
type Section = { _id: string; levelId: string; title: string; description?: string; published: boolean; order: number };
type Lesson = {
  _id: string; levelId: string; sectionId: string; title: string; description?: string;
  content?: string; videoAssetId?: string; resources?: LessonResourceDraft[];
  published: boolean; required: boolean; preview: boolean; durationSeconds?: number; order: number;
};
type BuilderItem = Level | Section | Lesson;
type State = { levels: Level[]; sections: Section[]; lessons: Lesson[] };
type Editor = { type: 'level' | 'section' | 'lesson'; parent?: string; item?: BuilderItem };

async function request(courseId: string, payload: unknown) {
  const response = await fetch('/api/admin/courses/' + courseId + '/content', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Unable to save.');
  return result;
}

const typeLabel = (type: Editor['type']) =>
  type === 'level' ? 'Level / مستوى' : type === 'section' ? 'Section / قسم' : 'Lesson / درس';

export function ContentBuilder({ courseId, initial }: { courseId: string; initial: State }) {
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
    ])), [state],
  );
  const lessonsBySection = useMemo(
    () => new Map(state.sections.map(section => [
      section._id,
      state.lessons.filter(lesson => String(lesson.sectionId) === section._id).sort((a, b) => a.order - b.order),
    ])), [state],
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
    setError(''); setMessage('');
  }

  function closeEditor() { setEditor(null); setLessonVideo(''); setLessonResources([]); }

  async function refresh() {
    const response = await fetch('/api/admin/courses/' + courseId + '/content', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Unable to refresh.');
    setState(data);
  }

  async function act(payload: unknown) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request(courseId, payload);
      setMessage(result.message ?? 'Saved / تم الحفظ');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);

    try {
      if (editor.type === 'level') {
        const data = {
          title: form.get('title'), description: form.get('description'),
          published: form.get('published') === 'on', order: Number(form.get('order') || 0),
        };
        await request(courseId, editor.item ? { action: 'updateLevel', id: editor.item._id, data } : { action: 'createLevel', data });
      } else if (editor.type === 'section') {
        const item = editor.item as Section | undefined;
        const levelId = editor.parent ?? String(item?.levelId ?? '');
        const data = {
          levelId, title: form.get('title'), description: form.get('description'),
          published: form.get('published') === 'on', order: Number(form.get('order') || 0),
        };
        await request(courseId, item ? { action: 'updateSection', id: item._id, data } : { action: 'createSection', data });
      } else {
        const item = editor.item as Lesson | undefined;
        const sectionId = editor.parent ?? String(item?.sectionId ?? '');
        const section = state.sections.find(candidate => candidate._id === sectionId);
        if (!section) throw new Error('Section not found.');

        const resources = lessonResources
          .map(resource => ({ title: resource.title.trim(), privateAssetId: resource.privateAssetId }))
          .filter(resource => resource.title && resource.privateAssetId);
        const durationMinutes = Number(form.get('durationMinutes') || 0);

        const data = {
          levelId: String(section.levelId), sectionId: section._id,
          title: form.get('title'), description: form.get('description'), content: form.get('content'),
          durationSeconds: durationMinutes > 0 ? Math.round(durationMinutes * 60) : null,
          preview: form.get('preview') === 'on', published: form.get('published') === 'on',
          required: form.get('required') === 'on', order: Number(form.get('order') || 0),
          videoAssetId: lessonVideo, resources,
        };
        await request(courseId, item ? { action: 'updateLesson', id: item._id, data } : { action: 'createLesson', data });
      }

      closeEditor(); setMessage('Saved / تم الحفظ'); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }

  async function move(kind: 'level' | 'section' | 'lesson', ids: string[], index: number, direction: -1 | 1) {
    const next = [...ids], other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    await act({ action: 'reorder', kind, ids: next });
  }

  const levels = [...state.levels].sort((a, b) => a.order - b.order);

  return <div className="builder">
    <div className="panel admin-builder-guide">
      <span className="eyebrow">Course structure / هيكل الدورة</span>
      <h3>Level → Section → Lesson</h3>
      <p>Start with a level, add sections inside it, then add lessons with videos and resources. / ابدئي بالمستوى، ثم أضيفي الأقسام داخله، وبعدها الدروس والفيديوهات والملفات.</p>
    </div>

    <div className="builder-toolbar">
      <button className="button" onClick={() => openEditor({ type: 'level' })}>+ Add level / إضافة مستوى</button>
      <span className={error ? 'save-state error-text' : 'save-state'}>{busy ? 'Saving… / جارٍ الحفظ…' : error || message}</span>
    </div>

    {levels.length === 0 && <div className="panel empty-state">
      <h3>No levels yet / لا يوجد مستويات بعد</h3>
      <p>Add the first level to start building the course. / أضيفي أول مستوى لبدء بناء الدورة.</p>
    </div>}

    {levels.map((level, levelIndex) => {
      const sections = sectionsByLevel.get(level._id) ?? [];
      return <section className="builder-level" key={level._id}>
        <div className="builder-row level-row">
          <button className="collapse-button" onClick={() => setOpen(v => ({ ...v, [level._id]: !v[level._id] }))}>{open[level._id] ? '−' : '+'}</button>
          <div className="builder-copy"><span className="status-badge">{level.published ? 'Published / منشور' : 'Draft / مسودة'}</span><h2>{level.title}</h2></div>
          <div className="builder-actions">
            <button title="Move up / تحريك للأعلى" disabled={levelIndex === 0} onClick={() => move('level', levels.map(i => i._id), levelIndex, -1)}>↑</button>
            <button title="Move down / تحريك للأسفل" disabled={levelIndex === levels.length - 1} onClick={() => move('level', levels.map(i => i._id), levelIndex, 1)}>↓</button>
            <button onClick={() => openEditor({ type: 'level', item: level })}>Edit / تعديل</button>
            <button onClick={() => openEditor({ type: 'section', parent: level._id })}>+ Section / قسم</button>
            <button className="danger-link" onClick={() => confirm('Delete this level and everything inside it? / حذف هذا المستوى وكل ما بداخله؟') && act({ action: 'deleteLevel', id: level._id })}>Delete / حذف</button>
          </div>
        </div>

        {open[level._id] && <div className="builder-children">
          {sections.length === 0 && <p className="builder-empty">No sections yet / لا يوجد أقسام بعد</p>}
          {sections.map((section, sectionIndex) => {
            const lessons = lessonsBySection.get(section._id) ?? [];
            return <div className="builder-section" key={section._id}>
              <div className="builder-row section-row">
                <button className="collapse-button" onClick={() => setOpen(v => ({ ...v, [section._id]: !v[section._id] }))}>{open[section._id] ? '−' : '+'}</button>
                <div className="builder-copy"><span className="status-badge">{section.published ? 'Published / منشور' : 'Draft / مسودة'}</span><h3>{section.title}</h3></div>
                <div className="builder-actions">
                  <button disabled={sectionIndex === 0} onClick={() => move('section', sections.map(i => i._id), sectionIndex, -1)}>↑</button>
                  <button disabled={sectionIndex === sections.length - 1} onClick={() => move('section', sections.map(i => i._id), sectionIndex, 1)}>↓</button>
                  <button onClick={() => openEditor({ type: 'section', item: section })}>Edit / تعديل</button>
                  <button onClick={() => openEditor({ type: 'lesson', parent: section._id })}>+ Lesson / درس</button>
                  <button className="danger-link" onClick={() => confirm('Delete this section and all lessons inside it? / حذف هذا القسم وكل الدروس داخله؟') && act({ action: 'deleteSection', id: section._id })}>Delete / حذف</button>
                </div>
              </div>

              {open[section._id] && <div className="lesson-list">
                {lessons.length === 0 && <p className="builder-empty">No lessons yet / لا يوجد دروس بعد</p>}
                {lessons.map((lesson, lessonIndex) => <div className="builder-row lesson-row" key={lesson._id}>
                  <div className="builder-copy"><span className="lesson-dot">•</span><div>
                    <strong>{lesson.title}</strong>
                    <small>{lesson.published ? 'Published / منشور' : 'Draft / مسودة'} · {lesson.required ? 'Required / إلزامي' : 'Optional / اختياري'}{lesson.preview ? ' · Free preview / معاينة مجانية' : ''}{lesson.resources?.length ? ' · ' + lesson.resources.length + ' resources / ملفات' : ''}</small>
                  </div></div>
                  <div className="builder-actions">
                    <button disabled={lessonIndex === 0} onClick={() => move('lesson', lessons.map(i => i._id), lessonIndex, -1)}>↑</button>
                    <button disabled={lessonIndex === lessons.length - 1} onClick={() => move('lesson', lessons.map(i => i._id), lessonIndex, 1)}>↓</button>
                    <button onClick={() => openEditor({ type: 'lesson', item: lesson })}>Edit / تعديل</button>
                    <button className="danger-link" onClick={() => confirm('Delete this lesson? / حذف هذا الدرس؟') && act({ action: 'deleteLesson', id: lesson._id })}>Delete / حذف</button>
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
        <div className="modal-head"><h2>{editor.item ? 'Edit / تعديل' : 'Add / إضافة'} {typeLabel(editor.type)}</h2><button aria-label="Close" onClick={closeEditor}>×</button></div>
        <form className="course-form" onSubmit={saveEditor}>
          <label className="field">Title / العنوان
            <input name="title" defaultValue={editor.item?.title ?? ''} required />
          </label>
          <label className="field">Description / الوصف
            <textarea name="description" defaultValue={editor.item?.description ?? ''} rows={3} />
          </label>

          {editor.type === 'lesson' && <>
            <div className="panel lesson-admin-section">
              <span className="eyebrow">Lesson material / محتوى الدرس</span>
              <label className="field">Written lesson content / المحتوى المكتوب
                <RichTextEditor name="content" defaultValue={(editor.item as Lesson | undefined)?.content ?? ''} />
              </label>
              <MediaPicker label="Lesson video / فيديو الدرس" value={lessonVideo} onChange={setLessonVideo} accept="video/*" kind="video" />
              <ResourcePicker resources={lessonResources} onChange={setLessonResources} />
              <label className="field">Video duration (minutes) / مدة الفيديو بالدقائق
                <input name="durationMinutes" type="number" min="0" step="0.1" defaultValue={(editor.item as Lesson | undefined)?.durationSeconds ? ((editor.item as Lesson).durationSeconds! / 60).toFixed(1) : ''} />
                <small>Example: 12.5 means 12 minutes 30 seconds. / مثال: 12.5 يعني 12 دقيقة و30 ثانية.</small>
              </label>
            </div>

            <div className="panel lesson-admin-section">
              <span className="eyebrow">Lesson access / إعدادات الدرس</span>
              <div className="admin-form-grid three">
                <label className="checkbox"><input name="preview" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.preview} /><span>Free preview / معاينة مجانية</span></label>
                <label className="checkbox"><input name="required" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.required ?? true} /><span>Required / إلزامي</span></label>
                <label className="checkbox"><input name="published" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.published} /><span>Published / منشور</span></label>
              </div>
            </div>
          </>}

          {editor.type !== 'lesson' && <label className="checkbox"><input name="published" type="checkbox" defaultChecked={editor.item?.published} /><span>Published / منشور</span></label>}

          <label className="field">Order / الترتيب
            <input name="order" type="number" min="0" defaultValue={editor.item?.order ?? 0} />
            <small>Lower numbers appear first. / الرقم الأصغر يظهر أولاً.</small>
          </label>
          <div className="actions">
            <button className="button" disabled={busy}>{busy ? 'Saving… / جارٍ الحفظ…' : 'Save / حفظ'}</button>
            <button className="button secondary" type="button" onClick={closeEditor}>Cancel / إلغاء</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}
