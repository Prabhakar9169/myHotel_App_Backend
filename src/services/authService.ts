import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { IUser } from '../types/user';
import userService from './userService';
import emailService from './emailService';

interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

class AuthService {
// Generate JWT token
generateToken(userId: string, expiresIn: string | number = process.env.JWT_EXPIRE || '30d'): string {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
     const tokenExpiry = expiresIn || process.env.JWT_EXPIRE || '30d';
    
    return jwt.sign(
      { userId },
      secret,
      { expiresIn: tokenExpiry as string | number } as jwt.SignOptions
    )
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Token generation failed');
  }
}

// Generate refresh token
generateRefreshToken(userId: string): string {
  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not defined');
    }
    
    return jwt.sign(
      { userId, type: 'refresh' },
      secret,
      { expiresIn: '7d' }
    );
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error('Refresh token generation failed');
  }
}

  // Verify JWT token
  async verifyToken(token: string): Promise<IUser | null> {
    try {
      if (!token) {
        return null;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
      
      if (!decoded.userId) {
        return null;
      }

      const user = await userService.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        return null;
      }

      // Check if password was changed after token was issued
      if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token: string): Promise<IUser | null> {
    try {
      if (!token) {
        return null;
      }

      const decoded = jwt.verify(
        token, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET as string
      ) as TokenPayload & { type: string };
      
      if (!decoded.userId || decoded.type !== 'refresh') {
        return null;
      }

      const user = await userService.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Register user
  async register(userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role?: 'user' | 'admin';
  }): Promise<{ user: IUser; token: string; refreshToken: string }> {
    try {
      // Additional validation
      if (!userData.name || userData.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required');
      }

      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create user through userService
      const user = await userService.createUser(userData);
      
      // Generate tokens
      const token = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      return { user, token, refreshToken };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Login user
  async login(email: string, password: string): Promise<{ user: IUser; token: string; refreshToken: string } | null> {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Get user with password
      const user = await userService.getUserByEmailWithPassword(email);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Update last login (optional)
      try {
        await User.findByIdAndUpdate(user._id, { 
          updatedAt: new Date() 
        });
      } catch (updateError) {
        console.error('Failed to update last login:', updateError);
        // Don't fail login for this
      }

      // Generate tokens
      const token = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      return { user, token, refreshToken };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Handle forgot password
  async forgotPassword(email: string): Promise<{ resetToken: string; message: string }> {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      const user = await userService.getUserByEmail(email);
      if (!user) {
        throw new Error('No user found with that email address');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Generate reset token
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // Prepare email data
      const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      try {
        await emailService.sendPasswordResetEmail(user.email, {
          userName: user.name,
          resetURL,
          resetToken
        });

        return {
          resetToken: process.env.NODE_ENV === 'development' ? resetToken : 'sent',
          message: 'Password reset link sent to your email'
        };
      } catch (emailError) {
        // Revert the token if email fails
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        console.error('Failed to send password reset email:', emailError);
        throw new Error('Failed to send password reset email. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password failed:', error);
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ user: IUser; token: string; refreshToken: string }> {
    try {
      if (!token || !newPassword) {
        throw new Error('Reset token and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+password +passwordResetToken +passwordResetExpires');

      if (!user) {
        throw new Error('Token is invalid or has expired');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordChangedAt = new Date(Date.now() - 1000); // 1 second before now
      
      await user.save();

      // Send confirmation email (non-blocking)
      emailService.sendPasswordChangeConfirmation(user.email, user.name)
        .catch(error => {
          console.error('Failed to send password change confirmation:', error);
        });

      // Generate new tokens
      const jwtToken = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      return { user, token: jwtToken, refreshToken };
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  // Change password for logged-in user
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      if (!userId || !currentPassword || !newPassword) {
        throw new Error('User ID, current password, and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }

      // Get user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      user.passwordChangedAt = new Date(Date.now() - 1000);
      await user.save();

      // Send confirmation email (non-blocking)
      emailService.sendPasswordChangeConfirmation(user.email, user.name)
        .catch(error => {
          console.error('Failed to send password change confirmation:', error);
        });

      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<{ user: IUser; token: string; refreshToken: string } | null> {
    try {
      const user = await this.verifyRefreshToken(refreshToken);
      if (!user) {
        return null;
      }

      const newToken = this.generateToken(user._id);
      const newRefreshToken = this.generateRefreshToken(user._id);

      return { user, token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  // Logout (invalidate tokens - if using token blacklist)
  async logout(token: string): Promise<boolean> {
    try {
      // If you implement token blacklisting, add the token to blacklist here
      // For now, we'll just return true as logout is handled client-side
      
      // Optional: You can store tokens in Redis with expiration for blacklisting
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  // Validate password strength
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password should contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password should contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password should contain at least one number');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '123456', 'qwerty', 'abc123',
      'letmein', 'monkey', '1234567890', 'password1'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate secure random password
  generateRandomPassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  // Check if user has permission
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await userService.getUserById(userId);
      if (!user || !user.isActive) {
        return false;
      }

      // Simple role-based permissions
      switch (permission) {
        case 'admin':
          return user.role === 'admin';
        case 'user':
          return user.role === 'user' || user.role === 'admin';
        case 'self':
          return true; // User can always access their own data
        default:
          return false;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  // Get authentication statistics
  async getAuthStats(): Promise<any> {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const adminUsers = await User.countDocuments({ role: 'admin' });
      
      // Users registered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayUsers = await User.countDocuments({
        createdAt: { $gte: today }
      });

      // Users registered this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const monthlyUsers = await User.countDocuments({
        createdAt: { $gte: thisMonth }
      });

      return {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
        todayRegistrations: todayUsers,
        monthlyRegistrations: monthlyUsers
      };
    } catch (error) {
      console.error('Error fetching auth stats:', error);
      throw error;
    }
  }

  // Clean expired reset tokens (utility method)
  async cleanExpiredResetTokens(): Promise<number> {
    try {
      const result = await User.updateMany(
        {
          passwordResetExpires: { $lt: Date.now() }
        },
        {
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning expired reset tokens:', error);
      return 0;
    }
  }
}

export default new AuthService();
