import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth/session';
import {Course} from '@/lib/db/models/courses';
import {CourseWaitlist,FunnelEvent} from '@/lib/db/models/growth';
import {errorResponse,HttpError,readJson,sameOrigin} from '@/lib/http';
const schema=z.object({email:z.string().email(),language:z.enum(['ar','en']).default('ar'),marketingConsent:z.boolean().default(false),source:z.string().max(120).optional(),campaign:z.string().max(120).optional()});
export async function POST(request:Request,{params}:{params:Promise<{courseId:string}>}){
 try{sameOrigin(request);const {courseId}=await params;const course=await Course.findOne({_id:courseId,published:true});if(!course)throw new HttpError(404,'Course not found.'); if(!course.waitlistEnabled||course.enrollmentOpen)throw new HttpError(409,'The waitlist is not open for this course.');
 const input=schema.parse(await readJson(request));const user=await currentUser();
 const item=await CourseWaitlist.findOneAndUpdate({courseId,email:input.email.toLowerCase()},{$set:{userId:user?._id,email:input.email.toLowerCase(),language:input.language,marketingConsent:input.marketingConsent}},{upsert:true,new:true,setDefaultsOnInsert:true});
 await FunnelEvent.create({userId:user?._id,courseId,event:'waitlist_joined',source:input.source,campaign:input.campaign});
 return NextResponse.json({joined:true,id:String(item._id)});}catch(e){return errorResponse(e);}
}
