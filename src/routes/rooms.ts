import { Router } from 'express';
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  searchRooms
} from '../controllers/roomcontrollers';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getAllRooms);
router.get('/search', searchRooms);
router.get('/:id', getRoomById);

// Protected routes (admin only)
router.use(protect);
router.use(authorize('admin'));
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
