import {Schema,model,models,type InferSchemaType,type Model} from 'mongoose';
const ticketSchema=new Schema({
 userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
 category:{type:String,enum:['device','payment','certificate_name','account','suspension_appeal','technical','other'],required:true,index:true},
 subject:{type:String,required:true,trim:true,maxlength:180},message:{type:String,required:true,trim:true,maxlength:8000},
 status:{type:String,enum:['open','in_review','resolved'],default:'open',index:true},
 priority:{type:String,enum:['normal','urgent'],default:'normal',index:true},
 adminNote:{type:String,maxlength:8000},resolvedAt:Date,
},{timestamps:true});
ticketSchema.index({status:1,priority:-1,createdAt:1});
export const SupportTicket=(models.SupportTicket as Model<InferSchemaType<typeof ticketSchema>>)||model('SupportTicket',ticketSchema);
