import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const ref=(name:string)=>({type:Schema.Types.ObjectId,ref:name,required:true,index:true});

const reviewSchema=new Schema({
 userId:ref('User'), courseId:ref('Course'), rating:{type:Number,min:1,max:5,required:true},
 comment:{type:String,required:true,trim:true,maxlength:3000}, studentName:{type:String,required:true},
 verifiedStudent:{type:Boolean,default:true}, removedAt:Date, removalReason:String,
},{timestamps:true});
reviewSchema.index({userId:1,courseId:1},{unique:true});
reviewSchema.index({courseId:1,removedAt:1,createdAt:-1});
export const CourseReview=(models.CourseReview as Model<InferSchemaType<typeof reviewSchema>>)||model('CourseReview',reviewSchema);

const waitlistSchema=new Schema({
 courseId:ref('Course'), userId:{type:Schema.Types.ObjectId,ref:'User',index:true}, email:{type:String,required:true,lowercase:true,trim:true},
 language:{type:String,enum:['ar','en'],default:'ar'}, marketingConsent:{type:Boolean,default:false},
 notifiedAt:Date, convertedAt:Date,
},{timestamps:true});
waitlistSchema.index({courseId:1,email:1},{unique:true});
export const CourseWaitlist=(models.CourseWaitlist as Model<InferSchemaType<typeof waitlistSchema>>)||model('CourseWaitlist',waitlistSchema);

const funnelEventSchema=new Schema({
 userId:{type:Schema.Types.ObjectId,ref:'User',index:true}, courseId:{type:Schema.Types.ObjectId,ref:'Course',index:true},
 event:{type:String,enum:['course_view','account_created','preview_view','checkout_started','purchase','waitlist_joined'],required:true,index:true},
 source:String,medium:String,campaign:String,content:String,term:String,sessionId:String, orderId:{type:Schema.Types.ObjectId,ref:'Order'},
},{timestamps:true});
funnelEventSchema.index({courseId:1,event:1,createdAt:-1});
funnelEventSchema.index({event:1,orderId:1},{unique:true,partialFilterExpression:{event:'purchase',orderId:{$type:'objectId'}}});
export const FunnelEvent=(models.FunnelEvent as Model<InferSchemaType<typeof funnelEventSchema>>)||model('FunnelEvent',funnelEventSchema);
