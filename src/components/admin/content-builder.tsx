'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { MediaPicker } from './media-picker';

type Level = { _id: string; title: string; description?: string; published: boolean; order: number };
type Section = { _id: string; levelId: string; title: string; description?: string; published: boolean; order: number };
type Lesson = { _id: string; levelId: string; sectionId: string; title: string; description?: string; content?: string; videoAssetId?: string; published: boolean; required: boolean; preview: boolean; durationSeconds?: number; order: number };
type State = { levels: Level[]; sections: Section[]; lessons: Lesson[] };

async function request(courseId: string, payload: unknown) {
  const response = await fetch('/api/admin/courses/' + courseId + '/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Unable to save.');
  return result;
}

export function ContentBuilder({ courseId, initial }: { courseId: string; initial: State }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editor, setEditor] = useState<{ type: 'level'|'section'|'lesson'; parent?: string; item?: Level|Section|Lesson } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lessonVideo, setLessonVideo] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const sectionsByLevel = useMemo(() => new Map(state.levels.map(l => [l._id, state.sections.filter(s => String(s.levelId) === l._id).sort((a,b)=>a.order-b.order)])), [state]);
  const lessonsBySection = useMemo(() => new Map(state.sections.map(s => [s._id, state.lessons.filter(l => String(l.sectionId) === s._id).sort((a,b)=>a.order-b.order)])), [state]);

  async function refresh() {
    const response = await fetch('/api/admin/courses/' + courseId + '/content', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Unable to refresh.');
    setState(data);
  }
  async function act(payload: unknown) {
    setBusy(true); setError(''); setMessage('');
    try { const result = await request(courseId, payload); setMessage(result.message ?? 'Saved.'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }
  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return;
    setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const item = editor.item as any;
    try {
      if (editor.type === 'level') {
        const data = { title: form.get('title'), description: form.get('description'), published: form.get('published') === 'on', order: Number(form.get('order') || 0) };
        await request(courseId, item ? { action: 'updateLevel', id: item._id, data } : { action: 'createLevel', data });
      } else if (editor.type === 'section') {
        const levelId = editor.parent ?? String((item as Section).levelId);
        const data = { levelId, title: form.get('title'), description: form.get('description'), published: form.get('published') === 'on', order: Number(form.get('order') || 0) };
        await request(courseId, item ? { action: 'updateSection', id: item._id, data } : { action: 'createSection', data });
      } else {
        const sectionId = editor.parent ?? String((item as Lesson).sectionId);
        const section = state.sections.find(s => s._id === sectionId);
        if (!section) throw new Error('Section not found.');
        const data = { levelId: String(section.levelId), sectionId: section._id, title: form.get('title'), description: form.get('description'), content: form.get('content'), durationSeconds: Number(form.get('durationSeconds') || 0) || null, preview: form.get('preview') === 'on', published: form.get('published') === 'on', required: form.get('required') === 'on', order: Number(form.get('order') || 0), videoAssetId: lessonVideo || (item as Lesson | undefined)?.videoAssetId || '', resources: [] };
        await request(courseId, item ? { action: 'updateLesson', id: item._id, data } : { action: 'createLesson', data });
      }
      setEditor(null); setLessonVideo(''); setMessage('Saved.'); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); }
    finally { setBusy(false); }
  }
  async function move(kind: 'level'|'section'|'lesson', ids: string[], index: number, direction: -1|1) {
    const next = [...ids]; const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    await act({ action: 'reorder', kind, ids: next });
  }

  const levels = [...state.levels].sort((a,b)=>a.order-b.order);
  return <div className="builder">
    <div className="builder-toolbar"><button className="button" onClick={() => setEditor({ type: 'level' })}>+ Add level</button><span className="save-state">{busy ? 'Saving…' : error || message}</span></div>
    {levels.length === 0 && <div className="panel empty-state"><h3>No levels yet.</h3><p>Add the first level to begin structuring this course.</p></div>}
    {levels.map((level, li) => {
      const sections = sectionsByLevel.get(level._id) ?? [];
      return <section className="builder-level" key={level._id}>
        <div className="builder-row level-row">
          <button className="collapse-button" onClick={() => setOpen(v => ({ ...v, [level._id]: !v[level._id] }))}>{open[level._id] ? '−' : '+'}</button>
          <div className="builder-copy"><span className="status-badge">{level.published ? 'Published' : 'Draft'}</span><h2>{level.title}</h2></div>
          <div className="builder-actions"><button onClick={() => move('level', levels.map(x=>x._id), li, -1)}>↑</button><button onClick={() => move('level', levels.map(x=>x._id), li, 1)}>↓</button><button onClick={() => setEditor({ type: 'level', item: level })}>Edit</button><button onClick={() => setEditor({ type: 'section', parent: level._id })}>+ Section</button><button className="danger-link" onClick={() => confirm('Delete this level and all sections and lessons inside it?') && act({ action: 'deleteLevel', id: level._id })}>Delete</button></div>
        </div>
        {open[level._id] && <div className="builder-children">{sections.length === 0 && <p className="builder-empty">No sections in this level.</p>}
          {sections.map((section, si) => {
            const lessons = lessonsBySection.get(section._id) ?? [];
            return <div className="builder-section" key={section._id}>
              <div className="builder-row section-row">
                <button className="collapse-button" onClick={() => setOpen(v => ({ ...v, [section._id]: !v[section._id] }))}>{open[section._id] ? '−' : '+'}</button>
                <div className="builder-copy"><span className="status-badge">{section.published ? 'Published' : 'Draft'}</span><h3>{section.title}</h3></div>
                <div className="builder-actions"><button onClick={() => move('section', sections.map(x=>x._id), si, -1)}>↑</button><button onClick={() => move('section', sections.map(x=>x._id), si, 1)}>↓</button><button onClick={() => setEditor({ type: 'section', item: section })}>Edit</button><button onClick={() => setEditor({ type: 'lesson', parent: section._id })}>+ Lesson</button><button className="danger-link" onClick={() => confirm('Delete this section and every lesson inside it?') && act({ action: 'deleteSection', id: section._id })}>Delete</button></div>
              </div>
              {open[section._id] && <div className="lesson-list">{lessons.length === 0 && <p className="builder-empty">No lessons yet.</p>}
                {lessons.map((lesson, xi) => <div className="builder-row lesson-row" key={lesson._id}>
                  <div className="builder-copy"><span className="lesson-dot">•</span><div><strong>{lesson.title}</strong><small>{lesson.published ? 'Published' : 'Draft'} · {lesson.required ? 'Required' : 'Optional'}{lesson.preview ? ' · Preview' : ''}</small></div></div>
                  <div className="builder-actions"><button onClick={() => move('lesson', lessons.map(x=>x._id), xi, -1)}>↑</button><button onClick={() => move('lesson', lessons.map(x=>x._id), xi, 1)}>↓</button><button onClick={() => setEditor({ type: 'lesson', item: lesson })}>Edit</button><button className="danger-link" onClick={() => confirm('Delete this lesson?') && act({ action: 'deleteLesson', id: lesson._id })}>Delete</button></div>
                </div>)}
              </div>}
            </div>;
          })}
        </div>}
      </section>;
    })}
    {editor && <div className="modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) setEditor(null); }}><div className="admin-modal" role="dialog" aria-modal="true">
      <div className="modal-head"><h2>{editor.item ? 'Edit' : 'Add'} {editor.type}</h2><button aria-label="Close" onClick={() => setEditor(null)}>×</button></div>
      <form className="course-form" onSubmit={saveEditor}>
        <label className="field">Title<input name="title" defaultValue={(editor.item as any)?.title ?? ''} required /></label>
        <label className="field">Description<textarea name="description" defaultValue={(editor.item as any)?.description ?? ''} rows={3} /></label>
        {editor.type === 'lesson' && <><label className="field">Lesson content<RichTextEditor name="content" defaultValue={(editor.item as Lesson)?.content ?? ''} /></label><MediaPicker label="Lesson video" value={lessonVideo || (editor.item as Lesson)?.videoAssetId || ''} onChange={setLessonVideo} accept="video/*" kind="video" /><label className="field">Duration in seconds<input name="durationSeconds" type="number" min="0" defaultValue={(editor.item as Lesson)?.durationSeconds ?? ''} /></label><div className="admin-form-grid three"><label className="checkbox"><input name="preview" type="checkbox" defaultChecked={(editor.item as Lesson)?.preview} /><span>Free preview</span></label><label className="checkbox"><input name="required" type="checkbox" defaultChecked={(editor.item as Lesson)?.required ?? true} /><span>Required</span></label><label className="checkbox"><input name="published" type="checkbox" defaultChecked={(editor.item as Lesson)?.published} /><span>Published</span></label></div></>}
        {editor.type !== 'lesson' && <label className="checkbox"><input name="published" type="checkbox" defaultChecked={(editor.item as Level|Section)?.published} /><span>Published</span></label>}
        <label className="field">Order<input name="order" type="number" min="0" defaultValue={(editor.item as any)?.order ?? 0} /></label>
        <div className="actions"><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button className="button secondary" type="button" onClick={() => setEditor(null)}>Cancel</button></div>
      </form>
    </div></div>}
  </div>;
}
