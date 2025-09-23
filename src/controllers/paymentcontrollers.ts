import { Request, Response } from 'express';
import Stripe from 'stripe';
import Payment from '../models/Payments';
import Booking from '../models/Booking';
import { stripe } from '../config/stripe';
import { IUser } from '../types';
import { asyncHandler } from '../utils/helpers';
import { validateObjectId } from '../utils/validators';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Create payment intent
export const createPaymentIntent = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { bookingId } = req.body;

    if (!validateObjectId(bookingId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
      return;
    }

    // Get booking details
    const booking = await Booking.findById(bookingId).populate('room');
    
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user?._id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Check if already paid
    if (booking.paymentStatus === 'paid') {
      res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
      return;
    }

    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.totalAmount * 100), // Convert to paise
        currency: 'inr',
        metadata: {
          bookingId: booking._id.toString(),
          userId: req.user?._id || ''
        }
      });

      // Create payment record
      const payment = await Payment.create({
        booking: booking._id,
        user: req.user?._id,
        amount: booking.totalAmount,
        currency: 'INR',
        paymentMethod: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending'
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentId: payment._id
        }
      });
    } catch (error) {
      console.error('Stripe Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent'
      });
    }
  }
);

// Confirm payment
export const confirmPayment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentIntentId, paymentId } = req.body;

    if (!paymentIntentId || !validateObjectId(paymentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment data'
      });
      return;
    }

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update payment status
        const payment = await Payment.findById(paymentId);
        if (payment) {
          payment.status = 'completed';
          await payment.save();

          // Update booking status
          const booking = await Booking.findById(payment.booking);
          if (booking) {
            booking.paymentStatus = 'paid';
            booking.status = 'confirmed';
            await booking.save();
          }

          res.json({
            success: true,
            message: 'Payment confirmed successfully',
            data: payment
          });
          return;
        }
      }

      res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment'
      });
    }
  }
);

// Get payment details
export const getPayment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
      return;
    }

    const payment = await Payment.findById(id)
      .populate('booking')
      .populate('user', 'name email');

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Check ownership
    if (payment.user._id.toString() !== req.user?._id && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: payment
    });
  }
);

// Get user payments
export const getUserPayments = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const payments = await Payment.find({ user: req.user?._id })
      .populate('booking')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments
    });
  }
);

// Refund payment (Admin only)
export const refundPayment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { refundAmount } = req.body;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
      return;
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    if (payment.status !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
      return;
    }

    try {
      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId!,
        amount: refundAmount ? Math.round(refundAmount * 100) : undefined
      });

      // Update payment record
      payment.status = 'refunded';
      payment.refundAmount = refundAmount || payment.amount;
      payment.refundDate = new Date();
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'refunded';
        booking.status = 'cancelled';
        await booking.save();
      }

      res.json({
        success: true,
        message: 'Payment refunded successfully',
        data: payment
      });
    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund'
      });
    }
  }
);
