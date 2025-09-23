import { Document, Types } from 'mongoose';

export interface IRoom extends Document {
  _id: string;
  title: string;
  description: string;
  price: number;
  maxGuests: number;
  roomType: 'single' | 'double' | 'suite' | 'deluxe';
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  hotel: Types.ObjectId;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomInput {
  title: string;
  description: string;
  price: number;
  maxGuests: number;
  roomType: 'single' | 'double' | 'suite' | 'deluxe';
  amenities?: string[];
  images?: string[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}
