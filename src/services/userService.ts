import User from '../models/User';
import { IUser, IUserInput } from '../types/user';
import { validateEmail, validatePhone } from '../utils/validators';
import emailService from './emailService';
import mongoose from 'mongoose';

class UserService {
  // Get user by ID
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId).select('-password');
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error('Error fetching user');
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const user = await User.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      });
      return user;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Error fetching user by email');
    }
  }

  // Get user by email with password (for authentication)
  async getUserByEmailWithPassword(email: string): Promise<IUser | null> {
    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const user = await User.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      }).select('+password');
      return user;
    } catch (error) {
      console.error('Error fetching user with password:', error);
      throw new Error('Error fetching user');
    }
  }

  // Create new user
  async createUser(userData: IUserInput): Promise<IUser> {
    try {
      // Validation
      if (!userData.name || userData.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      if (!validateEmail(userData.email)) {
        throw new Error('Invalid email format');
      }

      if (!validatePhone(userData.phone)) {
        throw new Error('Invalid phone number format');
      }

      if (!userData.password || userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { phone: userData.phone }
        ]
      });

      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase()) {
          throw new Error('User already exists with this email');
        }
        if (existingUser.phone === userData.phone) {
          throw new Error('User already exists with this phone number');
        }
      }

      // Create user
      const user = new User({
        name: userData.name.trim(),
        email: userData.email.toLowerCase(),
        password: userData.password,
        phone: userData.phone,
        role: userData.role || 'user'
      });

      await user.save();

      // Send welcome email (non-blocking)
      this.sendWelcomeEmail(user.email, user.name).catch(error => {
        console.error('Welcome email failed:', error);
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updateData: any): Promise<IUser | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Validate and update fields
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length < 2) {
          throw new Error('Name must be at least 2 characters long');
        }
        user.name = updateData.name.trim();
      }

      if (updateData.phone !== undefined) {
        if (updateData.phone && !validatePhone(updateData.phone)) {
          throw new Error('Invalid phone number format');
        }
        
        // Check if phone number is already taken by another user
        if (updateData.phone) {
          const existingUser = await User.findOne({
            phone: updateData.phone,
            _id: { $ne: userId }
          });
          
          if (existingUser) {
            throw new Error('Phone number is already registered with another account');
          }
        }
        
        user.phone = updateData.phone;
      }

      if (updateData.avatar !== undefined) {
        // Basic URL validation for avatar
        if (updateData.avatar && !this.isValidUrl(updateData.avatar)) {
          throw new Error('Invalid avatar URL');
        }
        user.avatar = updateData.avatar;
      }

      await user.save();
      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize stats
      let stats = {
        totalBookings: 0,
        totalSpent: 0,
        bookingsByStatus: {},
        memberSince: user.createdAt,
        profileCompleteness: this.calculateProfileCompleteness(user),
        recentBookingsCount: 0,
        averageBookingValue: 0
      };

      try {
        // Import models dynamically to avoid circular dependency
        const { default: Booking } = await import('../models/Booking');
        const { default: Payment } = await import('../models/Payments');

        // Get booking statistics
        const bookingStats = await Booking.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ]);

        // Transform booking stats
        const bookingsByStatus: any = {};
        let totalBookings = 0;
        let totalAmount = 0;

        bookingStats.forEach(stat => {
          bookingsByStatus[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount || 0
          };
          totalBookings += stat.count;
          totalAmount += stat.totalAmount || 0;
        });

        // Get payment statistics
        const paymentStats = await Payment.aggregate([
          { 
            $match: { 
              user: new mongoose.Types.ObjectId(userId),
              status: 'completed'
            } 
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]);

        const totalSpent = paymentStats[0]?.totalPaid || 0;

        // Recent bookings count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentBookingsCount = await Booking.countDocuments({
          user: userId,
          createdAt: { $gte: thirtyDaysAgo }
        });

        stats = {
          totalBookings,
          totalSpent,
          bookingsByStatus,
          memberSince: user.createdAt,
          profileCompleteness: this.calculateProfileCompleteness(user),
          recentBookingsCount,
          averageBookingValue: totalBookings > 0 ? Math.round(totalAmount / totalBookings) : 0
        };

      } catch (modelError) {
        console.error('Error fetching booking/payment models:', modelError);
        // Return basic stats if models are not available
      }

      return stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Get user activity/history
  async getUserActivity(userId: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let activityLog = {
        accountCreated: user.createdAt,
        lastLogin: user.updatedAt,
        recentBookings: [] as any[],
        profileUpdates: user.updatedAt,
        totalActions: 0
      };

      try {
        // Import Booking model dynamically
        const { default: Booking } = await import('../models/Booking');

        // Get recent bookings with room details
        const recentBookings = await Booking.find({ user: userId })
          .populate('room', 'title price images address')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        activityLog.recentBookings = recentBookings;
        activityLog.totalActions = recentBookings.length;

      } catch (modelError) {
        console.error('Error fetching booking model:', modelError);
      }

      return activityLog;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  // Calculate profile completeness percentage
  private calculateProfileCompleteness(user: IUser): number {
    let completeness = 0;
    const totalFields = 5;

    // Required fields
    if (user.name && user.name.trim().length >= 2) completeness += 20;
    if (user.email && validateEmail(user.email)) completeness += 20;
    if (user.phone && validatePhone(user.phone)) completeness += 20;

    // Optional fields
    if (user.avatar) completeness += 20;
    
    // Profile activity (has made bookings, etc.)
    completeness += 20; // Base completion for active account

    return Math.min(completeness, 100);
  }

  // Deactivate user account
  async deactivateUser(userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = false;
      user.email = `deleted_${Date.now()}_${user.email}`;
      await user.save();

      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Reactivate user account
  async reactivateUser(userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = true;
      await user.save();
      return true;
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }

  // Get all users (admin only)
  async getAllUsers(page: number = 1, limit: number = 10, filters: any = {}): Promise<any> {
    try {
      const skip = (page - 1) * limit;
      const query: any = {};

      // Apply filters
      if (filters.role) {
        query.role = filters.role;
      }
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { phone: { $regex: filters.search, $options: 'i' } }
        ];
      }
      if (filters.createdAfter) {
        query.createdAt = { $gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        query.createdAt = { ...query.createdAt, $lte: new Date(filters.createdBefore) };
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  // Delete user permanently (admin only)
  async deleteUser(userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, newRole: 'user' | 'admin'): Promise<IUser | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      if (!['user', 'admin'].includes(newRole)) {
        throw new Error('Invalid role. Must be "user" or "admin"');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.role = newRole;
      await user.save();
      
      return user;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Get user dashboard stats (admin)
  async getUserDashboardStats(): Promise<any> {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const adminUsers = await User.countDocuments({ role: 'admin' });
      const regularUsers = await User.countDocuments({ role: 'user' });

      // Users registered in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      // User registration trend (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const registrationTrend = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id": 1 }
        }
      ]);

      return {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        regularUsers,
        recentUsers,
        registrationTrend
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Helper method to send welcome email
  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await emailService.sendWelcomeEmail(email, name);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error, just log it
    }
  }

  // Helper method to validate URL
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Search users
  async searchUsers(searchTerm: string, limit: number = 10): Promise<IUser[]> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const users = await User.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { name: { $regex: searchTerm.trim(), $options: 'i' } },
              { email: { $regex: searchTerm.trim(), $options: 'i' } },
              { phone: { $regex: searchTerm.trim(), $options: 'i' } }
            ]
          }
        ]
      })
      .select('name email phone avatar role')
      .limit(limit)
      .lean();

      return users as IUser[];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Check if email exists
  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      }).select('_id');
      
      return !!user;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  // Check if phone exists
  async phoneExists(phone: string): Promise<boolean> {
    try {
      const user = await User.findOne({ 
        phone: phone,
        isActive: true 
      }).select('_id');
      
      return !!user;
    } catch (error) {
      console.error('Error checking phone existence:', error);
      return false;
    }
  }
}

export default new UserService();
