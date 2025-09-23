import { Schema, model } from 'mongoose';
import { IPayment } from '../types/payment';

const paymentSchema = new Schema<IPayment>({
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    enum: {
      values: ['stripe', 'razorpay', 'cash'],
      message: 'Payment method must be stripe, razorpay, or cash'
    },
    required: [true, 'Payment method is required']
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'failed', 'refunded'],
      message: 'Status must be pending, completed, failed, or refunded'
    },
    default: 'pending'
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    default: null
  },
  refundDate: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true 
});

export default model<IPayment>('Payment', paymentSchema);
