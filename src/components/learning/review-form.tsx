'use client';
import {useState,type FormEvent} from 'react';

export function ReviewForm({courseId}:{courseId:string}){
 const [rating,setRating]=useState(5),[comment,setComment]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
  const response=await fetch('/api/courses/'+courseId+'/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to submit review.');
  setMessage('Thank you. Your verified review is now published.');setComment('');
 }catch(err){setMessage(err instanceof Error?err.message:'Unable to submit review.');}finally{setBusy(false);}}
 return <form className="panel" onSubmit={submit}><h2>Review this course</h2><p>Available after you complete the course. Your name, rating and comment are public.</p>
  <label>Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
  <label>Your review<textarea value={comment} onChange={e=>setComment(e.target.value)} required maxLength={3000} placeholder="Share what you learned and your experience." /></label>
  <button className="button small" disabled={busy}>{busy?'Publishing…':'Publish verified review'}</button>{message&&<p>{message}</p>}
 </form>;
}
