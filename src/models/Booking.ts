import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  _id: string;
  bookingId: string; // Unique booking reference
  user: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  
  // Booking Details
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalNights: number;
  
  // Pricing
  roomPrice: number;
  totalAmount: number;
  discount?: number;
  taxes?: number;
  
  // Status
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  
  // Additional Info
  specialRequests?: string;
  guestDetails: {
    name: string;
    email: string;
    phone: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>({
  bookingId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `BK${Date.now()}${Math.floor(Math.random() * 1000)}`
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  room: { 
    type: Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true 
  },
  
  // Dates
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  totalNights: { type: Number, required: true },
  
  // Pricing
  roomPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Additional Info
  specialRequests: { type: String },
  guestDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ status: 1 });

export default mongoose.model<IBooking>('Booking', bookingSchema);
