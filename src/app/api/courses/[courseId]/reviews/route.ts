import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth/session';
import {Course,CourseProgress} from '@/lib/db/models/courses';
import {ExamAttempt} from '@/lib/db/models/exams';
import {CourseReview} from '@/lib/db/models/growth';
import {errorResponse,HttpError,readJson,sameOrigin} from '@/lib/http';

const schema=z.object({rating:z.number().int().min(1).max(5),comment:z.string().trim().refine(v=>v.split(/\s+/).filter(Boolean).length>5,'Review must be more than 5 words.').max(3000)});

export async function GET(_:Request,{params}:{params:Promise<{courseId:string}>}){
 try{const {courseId}=await params;const reviews=await CourseReview.find({courseId,removedAt:{$exists:false}}).sort({createdAt:-1}).select('rating comment studentName verifiedStudent createdAt').lean();
 const count=reviews.length;const average=count?reviews.reduce((n,r)=>n+r.rating,0)/count:0;return NextResponse.json({average:Number(average.toFixed(1)),count,reviews});}catch(e){return errorResponse(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{courseId:string}>}){
 try{sameOrigin(request);const user=await requireUser();const {courseId}=await params;const progress=await CourseProgress.findOne({userId:user._id,courseId});
 if(!progress?.completedAt)throw new HttpError(403,'Complete the course before reviewing it.');
 const course=await Course.findById(courseId).select('examEnabled');if(!course)throw new HttpError(404,'Course not found.');
 if(course.examEnabled){const passed=await ExamAttempt.exists({userId:user._id,courseId,passed:true});if(!passed)throw new HttpError(403,'Pass the final exam before reviewing this course.');}
 const input=schema.parse(await readJson(request));const existing=await CourseReview.exists({userId:user._id,courseId});if(existing)throw new HttpError(409,'You already reviewed this course.');
 const review=await CourseReview.create({userId:user._id,courseId,rating:input.rating,comment:input.comment,studentName:user.fullName,verifiedStudent:true});
 return NextResponse.json({review},{status:201});}catch(e){return errorResponse(e);}
}
