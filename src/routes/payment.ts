import { Router } from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getUserPayments,
  refundPayment
} from '../controllers/paymentcontrollers';
import { authorize } from '../middleware/auth';

const router = Router();

// User routes
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/my-payments', getUserPayments);
router.get('/:id', getPayment);

// Admin routes
router.post('/:id/refund', authorize('admin'), refundPayment);

export default router;
