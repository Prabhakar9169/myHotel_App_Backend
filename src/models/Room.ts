import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  _id: string;
  title: string;
  description: string;
  roomType: 'single' | 'double' | 'suite' | 'deluxe' | 'premium';
  price: number;
  originalPrice?: number; // For discount display
  images: string[];
  amenities: string[];
  maxGuests: number;
  bedType: string;
  roomSize: number; // in sq ft
  
  // Hotel/Location Info
  hotelName: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Availability & Status
  isAvailable: boolean;
  isActive: boolean;
  
  // Ratings & Reviews
  rating: number;
  totalReviews: number;
  
  // Additional Info
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  
  // Hotel Contact
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  
  // SEO & Search
  tags: string[];
  featured: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  roomType: { 
    type: String, 
    enum: ['single', 'double', 'suite', 'deluxe', 'premium'],
    required: true 
  },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  images: [{ type: String, required: true }],
  amenities: [{ type: String }],
  maxGuests: { type: Number, required: true, min: 1 },
  bedType: { type: String, required: true },
  roomSize: { type: Number, required: true },
  
  // Hotel Info
  hotelName: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    pincode: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  
  // Status
  isAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  
  // Ratings
  rating: { type: Number, default: 4.0, min: 1, max: 5 },
  totalReviews: { type: Number, default: 0 },
  
  // Times
  checkInTime: { type: String, default: '14:00' },
  checkOutTime: { type: String, default: '11:00' },
  cancellationPolicy: { type: String, default: 'Free cancellation up to 24 hours before check-in' },
  
  // Contact
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String }
  },
  
  // SEO
  tags: [{ type: String }],
  featured: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for better search performance
roomSchema.index({ 'address.city': 1, price: 1 });
roomSchema.index({ roomType: 1, price: 1 });
roomSchema.index({ featured: -1, rating: -1 });
roomSchema.index({ title: 'text', description: 'text', hotelName: 'text' });

export default mongoose.model<IRoom>('Room', roomSchema);
