import { Request, Response } from 'express';
import { 
  IUserInput, 
  ILoginInput, 
  IUser, 
  IForgotPasswordInput, 
  IResetPasswordInput, 
  IChangePasswordInput 
} from '../types/user';
import { asyncHandler } from '../utils/helpers';
import { validateEmail, validatePassword, validatePhone } from '../utils/validators';
import authService from '../services/authService';
import userService from '../services/userService';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Register User
export const register = asyncHandler(
  async (req: Request<{}, {}, IUserInput>, res: Response): Promise<void> => {
    const { name, email, password, phone, role } = req.body;
    
    try {
      // Use AuthService for registration
      const result = await authService.register({
        name,
        email,
        password,
        phone,
        role
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token: result.token,
        refreshToken: result.refreshToken,
        user: {
          id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          avatar: result.user.avatar
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Login User
export const login = asyncHandler(
  async (req: Request<{}, {}, ILoginInput>, res: Response): Promise<void> => {
    const { email, password } = req.body;
    
    try {
      // Use AuthService for login
      const result = await authService.login(email, password);
      
      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Login successful',
        token: result.token,
        refreshToken: result.refreshToken,
        user: {
          id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          avatar: result.user.avatar
        }
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get current user profile
export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Use UserService for profile data
      const user = await userService.getUserById(userId);
      const stats = await userService.getUserStats(userId);
      const activity = await userService.getUserActivity(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Update user profile
export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Use UserService for profile update
      const updatedUser = await userService.updateUserProfile(userId, req.body);

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Forgot Password
export const forgotPassword = asyncHandler(
  async (req: Request<{}, {}, IForgotPasswordInput>, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
      // Use AuthService for forgot password
      const result = await authService.forgotPassword(email);
      
      res.status(200).json({
        success: true,
        message: result.message,
        // Only include token in development
        ...(process.env.NODE_ENV === 'development' && { 
          resetToken: result.resetToken 
        })
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Reset Password
export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;

    // Basic validation
    if (!password || !confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'Please provide password and confirm password'
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
      return;
    }

    try {
      // Use AuthService for password reset
      const result = await authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
        token: result.token,
        refreshToken: result.refreshToken,
        user: {
          id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Change Password (for logged-in users)
export const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword, confirmPassword } = req.body as IChangePasswordInput;

    // Basic validation
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

    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Use AuthService for password change
      await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Refresh Token
export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    try {
      // Use AuthService for token refresh
      const result = await authService.refreshToken(refreshToken);
      
      if (!result) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        token: result.token,
        refreshToken: result.refreshToken,
        user: {
          id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role
        }
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Logout
export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { token } = req.body;
      
      // Use AuthService for logout (if implementing token blacklist)
      await authService.logout(token);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
);

// Delete Account
export const deleteAccount = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
      return;
    }

    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
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

      // Use UserService for account deactivation
      await userService.deactivateUser(userId);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get auth stats (admin only)
export const getAuthStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      const stats = await authService.getAuthStats();

      res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);
