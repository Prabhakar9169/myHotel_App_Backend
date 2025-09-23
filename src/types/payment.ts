import { Document, Types } from 'mongoose';

export interface IPayment extends Document {
  _id: string;
  booking: Types.ObjectId;
  user: Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'razorpay' | 'cash';
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  refundAmount?: number;
  refundDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
