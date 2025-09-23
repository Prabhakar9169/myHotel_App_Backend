import Booking from '../models/Booking';
import Room from '../models/Room';
import emailService from './emailService';

class BookingService {
  async checkRoomAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    const existingBooking = await Booking.findOne({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          checkIn: { $lte: checkIn },
          checkOut: { $gt: checkIn }
        },
        {
          checkIn: { $lt: checkOut },
          checkOut: { $gte: checkOut }
        },
        {
          checkIn: { $gte: checkIn },
          checkOut: { $lte: checkOut }
        }
      ]
    });

    return !existingBooking;
  }

  async calculateBookingAmount(roomId: string, checkIn: Date, checkOut: Date): Promise<number> {
    const room = await Room.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights * room.price;
  }

  async confirmBooking(bookingId: string): Promise<void> {
    const booking = await Booking.findById(bookingId)
      .populate('room', 'title')
      .populate('user', 'name email');

    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.status = 'confirmed';
    await booking.save();

    // Send confirmation email
    if (booking.user && booking.room) {
      await emailService.sendBookingConfirmation(
        (booking.user as any).email,
        {
          userName: (booking.user as any).name,
          roomTitle: (booking.room as any).title,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          totalAmount: booking.totalAmount
        }
      );
    }
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const booking = await Booking.findById(bookingId)
      .populate('room', 'title')
      .populate('user', 'name email');

    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.status = 'cancelled';
    await booking.save();

    // Send cancellation email
    if (booking.user && booking.room) {
      await emailService.sendBookingCancellation(
        (booking.user as any).email,
        {
          userName: (booking.user as any).name,
          roomTitle: (booking.room as any).title,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalAmount: booking.totalAmount
        }
      );
    }
  }

  async getBookingStats(): Promise<any> {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'confirmed', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    return {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue: totalRevenue[0]?.total || 0
    };
  }
}

export default new BookingService();
