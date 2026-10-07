'use client';
import {useEffect} from 'react';
export function CourseViewTracker({courseId}:{courseId:string}){useEffect(()=>{const q=new URLSearchParams(location.search);const payload={courseId,event:'course_view',source:q.get('utm_source')||undefined,medium:q.get('utm_medium')||undefined,campaign:q.get('utm_campaign')||undefined,content:q.get('utm_content')||undefined,term:q.get('utm_term')||undefined};fetch('/api/analytics/funnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});},[courseId]);return null;}
