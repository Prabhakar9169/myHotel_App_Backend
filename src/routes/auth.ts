import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword
} from '../controllers/authcontrollers';
import { protect } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);

export default router;
