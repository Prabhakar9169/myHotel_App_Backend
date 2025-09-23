import { Request, Response } from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import { IUser } from '../types/user';
import { asyncHandler } from '../utils/helpers';
import emailService from '../services/emailService';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface CreateBookingRequest {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomPrice: number;
  specialRequests?: string;
}

// Create new booking
export const createBooking = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { roomId, checkIn, checkOut, guests, roomPrice, specialRequests } = req.body as CreateBookingRequest;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validation
      if (!roomId || !checkIn || !checkOut || !guests || !roomPrice) {
        res.status(400).json({
          success: false,
          message: 'Missing required booking details'
        });
        return;
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // Validate dates
      if (checkInDate >= checkOutDate) {
        res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
        return;
      }

      if (checkInDate < new Date()) {
        res.status(400).json({
          success: false,
          message: 'Check-in date cannot be in the past'
        });
        return;
      }

      // Calculate total nights and amount
      const totalNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const subtotal = roomPrice * totalNights;
      const taxes = subtotal * 0.18; // 18% GST
      const totalAmount = subtotal + taxes;

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check for existing booking conflicts (optional)
      const existingBooking = await Booking.findOne({
        room: roomId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          {
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
          }
        ]
      });

      if (existingBooking) {
        res.status(409).json({
          success: false,
          message: 'Room is not available for the selected dates'
        });
        return;
      }

      // Create booking
      const booking = new Booking({
        user: userId,
        room: roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        totalNights,
        roomPrice,
        totalAmount,
        taxes,
        specialRequests,
        guestDetails: {
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });

      await booking.save();

      // Populate room details for response
      await booking.populate('room', 'title hotelName images address price');
    

      // Send confirmation email (non-blocking)
      try {
        await emailService.sendBookingConfirmation(user.email, {
          bookingId: booking.bookingId,
          userName: user.name,
          checkIn: checkInDate.toDateString(),
          checkOut: checkOutDate.toDateString(),
          guests,
          totalAmount,
          totalNights
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking: {
          id: booking._id,
          bookingId: booking.bookingId,
          roomId: roomId, // Use original roomId from request
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          totalNights: booking.totalNights,
          totalAmount: booking.totalAmount,
          room: booking.room,
          createdAt: booking.createdAt
        }
      });
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating booking'
      });
    }
  }
);

// Get user's bookings
export const getUserBookings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const bookings = await Booking.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Store roomIds before populating
      const bookingsWithRoomId = bookings.map(booking => ({
        ...booking.toObject(),
        roomId: booking.room
      }));

      // Now populate room details
      await Booking.populate(bookings, {
        path: 'room',
        select: 'title hotelName images address price contact'
      });

      // Merge populated data with roomId
      const finalBookings = bookingsWithRoomId.map((booking, index) => ({
        ...booking,
        room: bookings[index].room
      }));

      const total = await Booking.countDocuments({ user: userId });

      res.json({
        success: true,
        bookings: finalBookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching bookings'
      });
    }
  }
);

// Get single booking
export const getBooking = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const booking = await Booking.findOne({
        _id: id,
        user: userId
      });

      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
        return;
      }

      // Store roomId before populating
      const roomId = booking.room;
      
      // Now populate room details
      await booking.populate('room', 'title hotelName images address price contact amenities');

      res.json({
        success: true,
        booking: {
          ...booking.toObject(),
          roomId: roomId // Use stored roomId
        }
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching booking'
      });
    }
  }
);

// Cancel booking
export const cancelBooking = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const booking = await Booking.findOne({
        _id: id,
        user: userId
      });

      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
        return;
      }

      if (booking.status === 'cancelled') {
        res.status(400).json({
          success: false,
          message: 'Booking is already cancelled'
        });
        return;
      }

      if (booking.status === 'completed') {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel completed booking'
        });
        return;
      }

      // Check if cancellation is allowed (24 hours before check-in)
      const now = new Date();
      const checkIn = new Date(booking.checkIn);
      const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilCheckIn < 24) {
        res.status(400).json({
          success: false,
          message: 'Cancellation not allowed within 24 hours of check-in'
        });
        return;
      }

      booking.status = 'cancelled';
      await booking.save();

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        booking: {
          ...booking.toObject(),
          roomId: booking.room // This will work as we didn't populate here
        }
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Error cancelling booking'
      });
    }
  }
);