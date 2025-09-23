import Stripe from 'stripe';
import { config } from './config';

// Initialize Stripe with secret key
export const stripe = new Stripe(config.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil', // Use latest API version
  typescript: true,
});

// Stripe configuration options
export const stripeConfig = {
  publishableKey: config.STRIPE_PUBLISHABLE_KEY || '',
  currency: 'inr',
  supportedPaymentMethods: ['card', 'upi'], // Indian payment methods
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

// Helper function to create payment intent
export const createStripePaymentIntent = async (
  amount: number,
  currency: string = 'inr',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise for INR
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      // Enable specific payment methods for India
      payment_method_types: ['card'],
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Helper function to retrieve payment intent
export const retrieveStripePaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving Stripe payment intent:', error);
    throw new Error('Failed to retrieve payment intent');
  }
};

// Helper function to create refund
export const createStripeRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> => {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to paise
    }

    if (reason) {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    console.error('Error creating Stripe refund:', error);
    throw new Error('Failed to create refund');
  }
};

// Helper function to handle webhooks
export const constructStripeEvent = (
  payload: Buffer,
  signature: string,
  webhookSecret?: string
): Stripe.Event => {
  try {
    const secret = webhookSecret || stripeConfig.webhookSecret;
    if (!secret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error('Error constructing Stripe webhook event:', error);
    throw new Error('Webhook signature verification failed');
  }
};

// Helper function to format amount for display
export const formatStripeAmount = (
  amount: number,
  currency: string = 'inr'
): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

  // Stripe amounts are in smallest currency unit (paise for INR)
  const actualAmount = amount / 100;
  return formatter.format(actualAmount);
};

// Helper function to validate webhook event types
export const isValidStripeEvent = (
  event: Stripe.Event,
  allowedTypes: string[]
): boolean => {
  return allowedTypes.includes(event.type);
};

// Stripe event types we handle
export const STRIPE_EVENT_TYPES = {
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
  PAYMENT_INTENT_CANCELED: 'payment_intent.canceled',
  CHARGE_DISPUTE_CREATED: 'charge.dispute.created',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
} as const;

// Common Stripe error handling
export const handleStripeError = (error: any): string => {
  if (error.type) {
    switch (error.type) {
      case 'StripeCardError':
        return `Card error: ${error.message}`;
      case 'StripeRateLimitError':
        return 'Too many requests made to the API too quickly';
      case 'StripeInvalidRequestError':
        return `Invalid request: ${error.message}`;
      case 'StripeAPIError':
        return 'An error occurred with Stripe API';
      case 'StripeConnectionError':
        return 'Network error occurred while connecting to Stripe';
      case 'StripeAuthenticationError':
        return 'Authentication with Stripe API failed';
      default:
        return `Stripe error: ${error.message}`;
    }
  }
  return 'An unknown payment error occurred';
};

// Export default stripe instance
export default stripe;
