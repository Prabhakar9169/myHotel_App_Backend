import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking
} from '../controllers/bookingcontrollers';
import { protect } from '../middleware/auth';

const router = Router();

// All booking routes require authentication
// router.use(protect);

// POST /api/bookings - Create new booking
router.post('/', createBooking);

// GET /api/bookings - Get user's bookings
router.get('/', getUserBookings);

// GET /api/bookings/:id - Get single booking
router.get('/:id', getBooking);

// PATCH /api/bookings/:id/cancel - Cancel booking
router.patch('/:id/cancel', cancelBooking);

export default router;
