import { Document, Types } from 'mongoose';

export interface IBooking extends Document {
  _id: string;
  user: Types.ObjectId;
  room: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingInput {
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
}
