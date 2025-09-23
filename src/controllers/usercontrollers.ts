import { Request, Response } from 'express';
import User from '../models/User';
import { asyncHandler, getPagination, getTotalPages } from '../utils/helpers';
import { validateObjectId } from '../utils/validators';

// Get all users (Admin only)
export const getAllUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip } = getPagination(page, limit);

    const filter: any = {};
    
    // Filter by role
    if (req.query.role) {
      filter.role = req.query.role;
    }

    // Filter by active status
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(filter)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: getTotalPages(total, limit)
      }
    });
  }
);

// Get user by ID (Admin only)
export const getUserById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findById(id).select('-password -__v');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  }
);

// Update user (Admin only)
export const updateUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, email, phone, role, isActive } = req.body;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update fields
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  }
);

// Delete user (Admin only)
export const deleteUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  }
);

// Toggle user status (Admin only)
export const toggleUserStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  }
);
