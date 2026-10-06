'use client';

import { useState, type FormEvent } from 'react';

type Question = { _id: string; question: string; options: string[]; correctIndex: number; published: boolean };
export function ExamBuilder({ courseId, initialEnabled, initialPassPercent, initialRetakeDays, initialQuestions }: { courseId: string; initialEnabled: boolean; initialPassPercent: number; initialRetakeDays: number; initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [passPercent, setPassPercent] = useState(initialPassPercent);
  const [retakeDays, setRetakeDays] = useState(initialRetakeDays);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');

  async function send(payload: unknown) {
    const r = await fetch('/api/admin/courses/' + courseId + '/exam', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const b = await r.json(); if (!r.ok) throw new Error(b.error ?? 'Unable to save.'); return b;
  }
  async function saveSettings() { try { await send({ action: 'settings', enabled, passPercent, retakeDays }); setMessage('Exam settings saved.'); setError(''); } catch(e){ setError(e instanceof Error ? e.message : 'Unable to save.'); } }
  async function addQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const options = [0,1,2,3].map(i => String(f.get('option'+i) ?? '').trim()).filter(Boolean);
    const correctIndex = Number(f.get('correctIndex') ?? 0);
    try { const b=await send({ action:'create', question:String(f.get('question')??''), options, correctIndex, published:true }); setQuestions(v=>[...v,b.question]); e.currentTarget.reset(); setMessage('Question added.'); setError(''); } catch(err){ setError(err instanceof Error ? err.message : 'Unable to save.'); }
  }
  async function remove(id:string){ if(!confirm('Delete this exam question?')) return; try{await send({action:'delete',id});setQuestions(v=>v.filter(q=>q._id!==id));}catch(e){setError(e instanceof Error?e.message:'Unable to delete.');}}

  return <div className="builder">
    <section className="panel"><span className="eyebrow">Final exam settings</span><h2>QCM exam</h2>
      <div className="admin-form-grid">
        <label className="checkbox"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /><span>Enable final exam</span></label>
        <label className="field">Passing score %<input type="number" min="1" max="100" value={passPercent} onChange={e=>setPassPercent(Number(e.target.value))}/></label>
        <label className="field">Retake wait (days)<input type="number" min="0" max="365" value={retakeDays} onChange={e=>setRetakeDays(Number(e.target.value))}/></label>
      </div><button className="button" type="button" onClick={saveSettings}>Save exam settings</button>
    </section>
    <form className="panel course-form" onSubmit={addQuestion}><span className="eyebrow">Question bank</span><h2>Add QCM question</h2>
      <label className="field">Question<textarea name="question" required rows={3}/></label>
      {[0,1,2,3].map(i=><label className="field" key={i}>Answer {i+1}<input name={'option'+i} required={i<2}/></label>)}
      <label className="field">Correct answer<select name="correctIndex" defaultValue="0">{[0,1,2,3].map(i=><option key={i} value={i}>Answer {i+1}</option>)}</select></label>
      <button className="button">Add question</button>
    </form>
    {error && <p className="error-text">{error}</p>}{message && <p className="save-state">{message}</p>}
    <section className="panel"><h2>Questions ({questions.length})</h2>{questions.length===0?<p>No questions yet.</p>:questions.map((q,i)=><div className="builder-row lesson-row" key={q._id}><div className="builder-copy"><strong>{i+1}. {q.question}</strong><small>Correct: {q.options[q.correctIndex]}</small></div><button className="danger-link" onClick={()=>remove(q._id)}>Delete</button></div>)}</section>
  </div>;
}
