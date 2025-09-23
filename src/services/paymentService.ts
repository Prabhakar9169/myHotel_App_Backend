import { stripe } from '../config/stripe';
import Payment from '../models/Payments';
import Booking from '../models/Booking';

class PaymentService {
  async createPaymentIntent(amount: number, currency: string = 'inr', metadata: any = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error('Webhook handling failed');
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

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
    }
  }

  private async handlePaymentFailure(paymentIntent: any) {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (payment) {
      payment.status = 'failed';
      await payment.save();

      // Update booking status
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = 'failed';
        await booking.save();
      }
    }
  }
}

export default new PaymentService();
