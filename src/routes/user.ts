import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/usercontrollers';

const router = Router();

// All routes are admin-only (middleware applied in app.ts)
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);

export default router;
