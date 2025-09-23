import { Request, Response } from 'express';
import { IUser } from '../types/user';
import { asyncHandler } from '../utils/helpers';
import userService from '../services/userService';
import authService from '../services/authService';
import { validateEmail, validatePhone } from '../utils/validators';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Get complete profile with stats and activity
export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const stats = await userService.getUserStats(userId);
      const activity = await userService.getUserActivity(userId);

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        stats,
        activity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching profile data'
      });
    }
  }
);

// Update profile
export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { name, phone, avatar } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Validation
      if (name && name.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long'
        });
        return;
      }

      if (phone && !validatePhone(phone)) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number'
        });
        return;
      }

      const updatedUser = await userService.updateUserProfile(userId, {
        name: name?.trim(),
        phone,
        avatar
      });

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          avatar: updatedUser.avatar
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  }
);

// Change password
export const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'All password fields are required'
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'New passwords do not match'
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
        return;
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error changing password'
      });
    }
  }
);

// Upload avatar
export const uploadAvatar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { avatar } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!avatar) {
        res.status(400).json({
          success: false,
          message: 'Avatar URL is required'
        });
        return;
      }

      const updatedUser = await userService.updateUserProfile(userId, { avatar });

      res.json({
        success: true,
        message: 'Avatar updated successfully',
        user: {
          id: updatedUser?._id,
          avatar: updatedUser?.avatar
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading avatar'
      });
    }
  }
);

// Get profile settings
export const getProfileSettings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const user = await userService.getUserById(userId);
      
      res.json({
        success: true,
        settings: {
          emailNotifications: true, // You can add this to user model
          smsNotifications: false,
          marketingEmails: false,
          language: 'en',
          currency: 'INR',
          timezone: 'Asia/Kolkata'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching profile settings'
      });
    }
  }
);

// Delete account
export const deleteAccount = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      const { password } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
        return;
      }

      // Verify password before deletion
      const user = await userService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Soft delete - deactivate account
      await userService.deactivateUser(userId);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting account'
      });
    }
  }
);
