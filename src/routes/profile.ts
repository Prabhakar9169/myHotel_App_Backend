import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  getProfileSettings,
  deleteAccount
} from '../controllers/profilecontrollers';
import { protect } from '../middleware/auth';

const router = Router();

// All profile routes are protected
router.use(protect);

// Profile management
router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/avatar', uploadAvatar);
router.get('/settings', getProfileSettings);

// Security
router.patch('/change-password', changePassword);
router.delete('/delete-account', deleteAccount);

export default router;
