'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Question = { id: string; question: string; options: string[] };
type ExamData = { passPercent: number; retakeDays: number; passed: boolean; nextAttemptAt: string | null; questions: Question[] };

export function QcmExam({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ passed: boolean; scorePercent: number; passPercent: number; nextAttemptAt: string | null; certificateId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch('/api/learning/courses/' + courseId + '/exam', { cache: 'no-store' }).then(async r => {
    const body = await r.json(); if (!r.ok) throw new Error(body.error ?? 'Unable to load exam.'); setData(body);
  }).catch(e => setError(e.message)); }, [courseId]);

  async function submit() {
    if (!data || busy) return;
    if (Object.keys(answers).length !== data.questions.length) { setError('Answer every question before submitting.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/learning/courses/' + courseId + '/exam', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: data.questions.map(q => ({ questionId: q.id, selectedIndex: answers[q.id] })) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to submit exam.');
      setResult(body);
      if (body.passed && body.certificateId) setTimeout(() => router.push('/certificate/' + body.certificateId + '?completed=1'), 1800);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit exam.'); } finally { setBusy(false); }
  }

  if (error && !data) return <div className="panel"><p className="error-text">{error}</p></div>;
  if (!data) return <div className="panel"><p>Loading exam…</p></div>;
  if (data.passed && !result) return <div className="panel"><h2>Exam passed</h2><p>You have already passed this final exam.</p></div>;
  const locked = data.nextAttemptAt && new Date(data.nextAttemptAt) > new Date();
  if (locked && !result) return <div className="panel"><h2>Retake locked</h2><p>Your next attempt is available on {new Date(data.nextAttemptAt!).toLocaleDateString()}.</p></div>;

  return <div className="exam-shell">
    <div className="panel"><span className="eyebrow">Final exam</span><h2>QCM · Choose one answer</h2><p>You need {data.passPercent}% to pass. If you fail, the next attempt opens after {data.retakeDays} days.</p></div>
    {result ? <div className="panel"><h2>{result.passed ? 'Passed ✓' : 'Not passed yet'}</h2><p>Your score: <strong>{result.scorePercent}%</strong> · Required: {result.passPercent}%.</p>{!result.passed && result.nextAttemptAt && <p>Study the course again. Your next attempt opens on {new Date(result.nextAttemptAt).toLocaleDateString()}.</p>}</div> :
      <>
        {data.questions.map((q, qi) => <section className="panel" key={q.id}><h3>{qi + 1}. {q.question}</h3><div className="exam-options">{q.options.map((option, oi) => <label className="checkbox" key={oi}><input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers(v => ({ ...v, [q.id]: oi }))} /><span>{option}</span></label>)}</div></section>)}
        {error && <p className="error-text">{error}</p>}
        <button className="button" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit final exam'}</button>
      </>}
  </div>;
}
