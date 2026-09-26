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
  required: boolean;
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
      setMessage(result.message ?? 'Saved.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
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
        if (!section) throw new Error('Section not found.');

        const resources = lessonResources
          .map(resource => ({ title: resource.title.trim(), privateAssetId: resource.privateAssetId }))
          .filter(resource => resource.title && resource.privateAssetId);

        const data = {
          levelId: String(section.levelId),
          sectionId: section._id,
          title: form.get('title'),
          description: form.get('description'),
          content: form.get('content'),
          durationSeconds: Number(form.get('durationSeconds') || 0) || null,
          preview: form.get('preview') === 'on',
          published: form.get('published') === 'on',
          required: form.get('required') === 'on',
          order: Number(form.get('order') || 0),
          videoAssetId: lessonVideo,
          resources,
        };
        await request(courseId, item
          ? { action: 'updateLesson', id: item._id, data }
          : { action: 'createLesson', data });
      }

      closeEditor();
      setMessage('Saved.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
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

  return <div className="builder">
    <div className="builder-toolbar">
      <button className="button" onClick={() => openEditor({ type: 'level' })}>+ Add level</button>
      <span className={error ? 'save-state error-text' : 'save-state'}>{busy ? 'Saving…' : error || message}</span>
    </div>

    {levels.length === 0 && <div className="panel empty-state"><h3>No levels yet.</h3><p>Add the first level to begin structuring this course.</p></div>}

    {levels.map((level, levelIndex) => {
      const sections = sectionsByLevel.get(level._id) ?? [];
      return <section className="builder-level" key={level._id}>
        <div className="builder-row level-row">
          <button className="collapse-button" onClick={() => setOpen(value => ({ ...value, [level._id]: !value[level._id] }))}>{open[level._id] ? '−' : '+'}</button>
          <div className="builder-copy"><span className="status-badge">{level.published ? 'Published' : 'Draft'}</span><h2>{level.title}</h2></div>
          <div className="builder-actions">
            <button disabled={levelIndex === 0} onClick={() => move('level', levels.map(item => item._id), levelIndex, -1)}>↑</button>
            <button disabled={levelIndex === levels.length - 1} onClick={() => move('level', levels.map(item => item._id), levelIndex, 1)}>↓</button>
            <button onClick={() => openEditor({ type: 'level', item: level })}>Edit</button>
            <button onClick={() => openEditor({ type: 'section', parent: level._id })}>+ Section</button>
            <button className="danger-link" onClick={() => confirm('Delete this level and all sections and lessons inside it?') && act({ action: 'deleteLevel', id: level._id })}>Delete</button>
          </div>
        </div>

        {open[level._id] && <div className="builder-children">
          {sections.length === 0 && <p className="builder-empty">No sections in this level.</p>}
          {sections.map((section, sectionIndex) => {
            const lessons = lessonsBySection.get(section._id) ?? [];
            return <div className="builder-section" key={section._id}>
              <div className="builder-row section-row">
                <button className="collapse-button" onClick={() => setOpen(value => ({ ...value, [section._id]: !value[section._id] }))}>{open[section._id] ? '−' : '+'}</button>
                <div className="builder-copy"><span className="status-badge">{section.published ? 'Published' : 'Draft'}</span><h3>{section.title}</h3></div>
                <div className="builder-actions">
                  <button disabled={sectionIndex === 0} onClick={() => move('section', sections.map(item => item._id), sectionIndex, -1)}>↑</button>
                  <button disabled={sectionIndex === sections.length - 1} onClick={() => move('section', sections.map(item => item._id), sectionIndex, 1)}>↓</button>
                  <button onClick={() => openEditor({ type: 'section', item: section })}>Edit</button>
                  <button onClick={() => openEditor({ type: 'lesson', parent: section._id })}>+ Lesson</button>
                  <button className="danger-link" onClick={() => confirm('Delete this section and every lesson inside it?') && act({ action: 'deleteSection', id: section._id })}>Delete</button>
                </div>
              </div>

              {open[section._id] && <div className="lesson-list">
                {lessons.length === 0 && <p className="builder-empty">No lessons yet.</p>}
                {lessons.map((lesson, lessonIndex) => <div className="builder-row lesson-row" key={lesson._id}>
                  <div className="builder-copy"><span className="lesson-dot">•</span><div><strong>{lesson.title}</strong><small>{lesson.published ? 'Published' : 'Draft'} · {lesson.required ? 'Required' : 'Optional'}{lesson.preview ? ' · Preview' : ''}{lesson.resources?.length ? ' · ' + lesson.resources.length + ' resources' : ''}</small></div></div>
                  <div className="builder-actions">
                    <button disabled={lessonIndex === 0} onClick={() => move('lesson', lessons.map(item => item._id), lessonIndex, -1)}>↑</button>
                    <button disabled={lessonIndex === lessons.length - 1} onClick={() => move('lesson', lessons.map(item => item._id), lessonIndex, 1)}>↓</button>
                    <button onClick={() => openEditor({ type: 'lesson', item: lesson })}>Edit</button>
                    <button className="danger-link" onClick={() => confirm('Delete this lesson?') && act({ action: 'deleteLesson', id: lesson._id })}>Delete</button>
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
        <div className="modal-head"><h2>{editor.item ? 'Edit' : 'Add'} {editor.type}</h2><button aria-label="Close" onClick={closeEditor}>×</button></div>
        <form className="course-form" onSubmit={saveEditor}>
          <label className="field">Title<input name="title" defaultValue={editor.item?.title ?? ''} required /></label>
          <label className="field">Description<textarea name="description" defaultValue={editor.item?.description ?? ''} rows={3} /></label>

          {editor.type === 'lesson' && <>
            <label className="field">Lesson content<RichTextEditor name="content" defaultValue={(editor.item as Lesson | undefined)?.content ?? ''} /></label>
            <MediaPicker label="Lesson video" value={lessonVideo} onChange={setLessonVideo} accept="video/*" kind="video" />
            <ResourcePicker resources={lessonResources} onChange={setLessonResources} />
            <label className="field">Duration in seconds<input name="durationSeconds" type="number" min="0" defaultValue={(editor.item as Lesson | undefined)?.durationSeconds ?? ''} /></label>
            <div className="admin-form-grid three">
              <label className="checkbox"><input name="preview" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.preview} /><span>Free preview</span></label>
              <label className="checkbox"><input name="required" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.required ?? true} /><span>Required</span></label>
              <label className="checkbox"><input name="published" type="checkbox" defaultChecked={(editor.item as Lesson | undefined)?.published} /><span>Published</span></label>
            </div>
          </>}

          {editor.type !== 'lesson' && <label className="checkbox"><input name="published" type="checkbox" defaultChecked={editor.item?.published} /><span>Published</span></label>}
          <label className="field">Order<input name="order" type="number" min="0" defaultValue={editor.item?.order ?? 0} /></label>
          <div className="actions"><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button className="button secondary" type="button" onClick={closeEditor}>Cancel</button></div>
        </form>
      </div>
    </div>}
  </div>;
}
