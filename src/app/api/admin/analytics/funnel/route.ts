import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/auth/session';
import {Course} from '@/lib/db/models/courses';
import {FunnelEvent} from '@/lib/db/models/growth';
import {errorResponse} from '@/lib/http';

export async function GET(){try{await requireUser(true);const grouped=await FunnelEvent.aggregate([
 {$group:{_id:{courseId:'$courseId',event:'$event'},count:{$sum:1}}},
 {$sort:{'_id.courseId':1}}
]);
 const courseIds=[...new Set(grouped.map(row=>String(row._id.courseId)))];const courses=await Course.find({_id:{$in:courseIds}}).select('title slug').lean();
 const names=new Map(courses.map(c=>[String(c._id),{title:c.title,slug:c.slug}]));
 const data=new Map<string,Record<string,unknown>>();
 for(const row of grouped){const id=String(row._id.courseId);if(!data.has(id))data.set(id,{courseId:id,...names.get(id),course_view:0,preview_view:0,checkout_started:0,purchase:0,waitlist_joined:0});(data.get(id) as Record<string,unknown>)[row._id.event]=row.count;}
 return NextResponse.json({courses:[...data.values()]},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
