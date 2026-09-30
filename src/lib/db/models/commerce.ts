import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true }, courseId: { type: Schema.Types.ObjectId, required: true },
  amountMinor: { type: Number, min: 0, required: true }, currency: { type: String, required: true },
  paymentMethod: { type: String, enum: ['whish', 'card', 'usdt'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'awaiting_verification', 'paid', 'failed', 'rejected', 'refunded'], default: 'pending', index: true },
  providerTransactionId: String, providerInvoiceId: String, providerCheckoutUrl: String, providerStatus: String, transactionHash: String, network: String, walletAddress: String, paidAt: Date,
}, { timestamps: true });
orderSchema.index({ paymentMethod: 1, providerTransactionId: 1 }, { unique: true, partialFilterExpression: { providerTransactionId: { $type: 'string' } } });
orderSchema.index({ userId: 1, courseId: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, transactionHash: 1 }, { unique: true, partialFilterExpression: { paymentMethod: 'usdt', transactionHash: { $type: 'string' } } });
export const Order = (models.Order as Model<InferSchemaType<typeof orderSchema>>) || model('Order', orderSchema);
const paymentSchema = new Schema({ orderId: { type: Schema.Types.ObjectId, required: true, index: true }, provider: { type: String, required: true }, eventId: { type: String, required: true }, status: String, verifiedAt: Date }, { timestamps: true });
paymentSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const Payment = (models.Payment as Model<InferSchemaType<typeof paymentSchema>>) || model('Payment', paymentSchema);
const certificateSchema = new Schema({
  certificateId: { type: String, required: true, unique: true }, userId: { type: Schema.Types.ObjectId, required: true },
  courseId: { type: Schema.Types.ObjectId, required: true }, studentName: { type: String, required: true },
  courseName: { type: String, required: true }, brandName: { type: String, required: true }, completedAt: { type: Date, required: true }, revokedAt: Date,
}, { timestamps: true });
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });
export const Certificate = (models.Certificate as Model<InferSchemaType<typeof certificateSchema>>) || model('Certificate', certificateSchema);
const settingsSchema = new Schema({ key: { type: String, default: 'business', unique: true }, businessName: String, logo: String, contactEmail: String, usdtWallet: String, usdtNetwork: { type: String, enum: ['TRC20', 'ERC20', 'BEP20'] }, usdtQr: String, usdtInstructions: String, socialLinks: [{ label: String, url: String }], whishEnabled: { type: Boolean, default: false } }, { timestamps: true });
export const AdminSettings = (models.AdminSettings as Model<InferSchemaType<typeof settingsSchema>>) || model('AdminSettings', settingsSchema);
