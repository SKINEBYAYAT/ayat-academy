import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth/session';
import {Course} from '@/lib/db/models/courses';
import {FunnelEvent} from '@/lib/db/models/growth';
import {errorResponse,readJson,sameOrigin} from '@/lib/http';
const schema=z.object({courseId:z.string().regex(/^[a-f\d]{24}$/i),event:z.enum(['course_view','preview_view']),source:z.string().max(120).optional(),medium:z.string().max(120).optional(),campaign:z.string().max(120).optional(),content:z.string().max(120).optional(),term:z.string().max(120).optional(),sessionId:z.string().max(160).optional()});
export async function POST(request:Request){try{sameOrigin(request);const input=schema.parse(await readJson(request));if(!await Course.exists({_id:input.courseId,published:true}))return NextResponse.json({tracked:false});const user=await currentUser();await FunnelEvent.create({...input,userId:user?._id});return NextResponse.json({tracked:true},{status:201});}catch(e){return errorResponse(e);}}
