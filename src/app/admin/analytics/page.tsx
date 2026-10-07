import type {Metadata} from 'next';
import {requirePageUser} from '@/lib/auth/session';
import {Course} from '@/lib/db/models/courses';
import {CourseReview,CourseWaitlist,FunnelEvent} from '@/lib/db/models/growth';
export const metadata:Metadata={title:'Growth analytics'};
export const dynamic='force-dynamic';
export default async function AnalyticsPage(){
 await requirePageUser(true);
 const [events,reviews,waitlist]=await Promise.all([
  FunnelEvent.aggregate([{$group:{_id:{courseId:'$courseId',event:'$event'},count:{$sum:1}}}]),
  CourseReview.countDocuments({removedAt:{$exists:false}}),
  CourseWaitlist.countDocuments(),
 ]);
 const ids=[...new Set(events.map(x=>String(x._id.courseId)))];
 const courses=await Course.find({_id:{$in:ids}}).select('title').lean();const names=new Map(courses.map(c=>[String(c._id),c.title]));
 const rows=new Map<string,Record<string,number|string>>();
 for(const x of events){const id=String(x._id.courseId);if(!rows.has(id))rows.set(id,{course:id,title:names.get(id)||'Course',course_view:0,preview_view:0,checkout_started:0,purchase:0,waitlist_joined:0});rows.get(id)![x._id.event]=x.count;}
 return <section className="admin-page"><div className="admin-page-head"><div><span className="eyebrow">Growth</span><h1>Funnel analytics</h1><p>Measure the path from attention to enrollment using real first-party events.</p></div></div>
 <div className="admin-metric-grid"><div className="panel stat"><span className="eyebrow">Verified reviews</span><strong>{reviews}</strong></div><div className="panel stat"><span className="eyebrow">Waitlist</span><strong>{waitlist}</strong></div></div>
 <div className="panel"><h2>Course funnels</h2>{rows.size===0?<p>No funnel activity yet.</p>:<div style={{overflowX:'auto'}}><table><thead><tr><th>Course</th><th>Views</th><th>Preview</th><th>Checkout</th><th>Purchases</th><th>Waitlist</th></tr></thead><tbody>{[...rows.values()].map(r=><tr key={String(r.course)}><td>{r.title}</td><td>{r.course_view}</td><td>{r.preview_view}</td><td>{r.checkout_started}</td><td>{r.purchase}</td><td>{r.waitlist_joined}</td></tr>)}</tbody></table></div>}</div></section>;
}
