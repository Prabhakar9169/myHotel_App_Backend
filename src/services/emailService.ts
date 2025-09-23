import nodemailer from 'nodemailer';
import { config } from '../config/config';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    // Check if email is enabled and credentials exist
    if (process.env.ENABLE_EMAIL !== 'true') {
      console.log('📧 Email service disabled - using console simulation');
      return;
    }

    if (!config.EMAIL_USER || !config.EMAIL_PASS) {
      console.log('📧 Email credentials not configured - using console simulation');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Test connection (optional)
      this.transporter.verify((error, success) => {
        if (error) {
          console.log('❌ Email configuration test failed:', error.message);
          console.log('📧 Falling back to console simulation');
          this.transporter = null;
        } else {
          console.log('✅ Email service is ready to send messages');
        }
      });

    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    // If no email setup, just log to console (for development)
    if (!this.transporter) {
      console.log('\n📧 ===== EMAIL SIMULATION =====');
      console.log('🎯 To:', options.to);
      console.log('📝 Subject:', options.subject);
      console.log('📄 Content Preview:', options.html ? options.html.substring(0, 200) + '...' : options.text);
      console.log('⏰ Timestamp:', new Date().toLocaleString());
      console.log('================================\n');
      return;
    }

    const mailOptions = {
      from: `Oracle INN <${config.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', options.to);
    } catch (error: any) {
      console.error('❌ Email sending failed:', error.message);
      
      // Fallback to console simulation instead of throwing error
      console.log('\n📧 ===== EMAIL FALLBACK SIMULATION =====');
      console.log('🎯 To:', options.to);
      console.log('📝 Subject:', options.subject);
      console.log('📄 Content Preview:', options.html ? options.html.substring(0, 200) + '...' : options.text);
      console.log('❌ Original Error:', error.message);
      console.log('=========================================\n');
      
      // Don't throw error to prevent app from breaking
    }
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const subject = 'Welcome to Oracle Inn! 🎉';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; margin: 0;">🏨 Oracle Inn</h1>
        </div>
        
        <h2 style="color: #4caf50; text-align: center;">Welcome, ${userName}! 🎉</h2>
        
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for joining Oracle Inn! We're excited to have you as part of our community.
        </p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">🌟 What you can do now:</h3>
          <ul style="line-height: 1.8;">
            <li>🏨 Browse and book amazing hotels</li>
            <li>📱 Manage your bookings easily</li>
            <li>💰 Access exclusive deals and discounts</li>
            <li>❤️ Save your favorite properties</li>
            <li>📞 Get 24/7 customer support</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/rooms" 
             style="background-color: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔍 Start Exploring Hotels
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          If you have any questions, feel free to contact our support team at 
          <a href="mailto:support@hotelbooking.com">support@hotelbooking.com</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          You received this email because you created an account with Oracle Inn.<br>
          © 2024 Oracle Inn. All rights reserved.
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendBookingConfirmation(email: string, bookingData: any): Promise<void> {
    
    const subject = `Booking Confirmed! 🎉 - ${bookingData.bookingId}`;
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; background: linear-gradient(135deg, #4caf50, #45a049); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your reservation is all set</p>
        </div>
        
        <p style="font-size: 18px;">Dear ${bookingData.userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Great news! Your Oracle Inn has been confirmed. Here are your booking details:
        </p>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4caf50;">
          <h3 style="color: #333; margin-top: 0;">📋 Booking Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div>
              <p style="margin: 5px 0;"><strong>📋 Booking ID:</strong><br>${bookingData.bookingId}</p>
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>📅 Check-in:</strong><br>${bookingData.checkIn}</p>
              <p style="margin: 5px 0;"><strong>📅 Check-out:</strong><br>${bookingData.checkOut}</p>
              <p style="margin: 5px 0;"><strong>👥 Guests:</strong><br>${bookingData.guests} Guest${bookingData.guests > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
            <p style="margin: 5px 0; font-size: 20px; color: #4caf50;"><strong>💰 Total Amount: ₹${bookingData.totalAmount.toLocaleString()}</strong></p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/bookings" 
             style="background-color: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px;">
            📱 View My Bookings
          </a>
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/rooms" 
             style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔍 Book Another Room
          </a>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1565c0; margin-top: 0;">📋 Important Information</h3>
          <ul style="line-height: 1.8; color: #333;">
            <li>🆔 Please carry a valid government ID for check-in</li>
            <li>⏰ Check-in time: 2:00 PM onwards</li>
            <li>⏰ Check-out time: 11:00 AM</li>
            <li>❌ Free cancellation up to 24 hours before check-in</li>
            <li>📞 Contact hotel directly for any special requests</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #f57c00; margin-top: 0;">💡 Pro Tips</h3>
          <ul style="line-height: 1.8; color: #333;">
            <li>📱 Download our mobile app for easy check-in</li>
            <li>⭐ Rate your stay to help other travelers</li>
            <li>💬 Contact us anytime for assistance</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 16px; line-height: 1.6;">
          We look forward to hosting you! If you have any questions, feel free to reach out to our support team.
        </p>
        
        <p style="font-size: 16px;">
          Best regards,<br>
          <strong>Oracle Inn Team</strong> 🏨
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            © 2024 Oracle Inn. All rights reserved.<br>
            You can manage your bookings anytime from your account dashboard.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendPasswordResetEmail(to: string, resetData: any): Promise<void> {
    const subject = 'Password Reset Request - Oracle Inn 🔐';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset</h1>
          <p style="margin: 10px 0 0 0;">Secure your account</p>
        </div>
        
        <p style="font-size: 18px;">Dear ${resetData.userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          You requested a password reset for your Oracle Inn account. Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetData.resetURL}" 
             style="background-color: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔓 Reset My Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link in your browser:
        </p>
        <p style="word-break: break-all; color: #1976d2; background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace;">
          ${resetData.resetURL}
        </p>
        
        <div style="background: #ffebee; border: 1px solid #ffcdd2; color: #c62828; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>⚠️ Security Notice:</strong></p>
          <ul style="margin: 10px 0;">
            <li>This link will expire in <strong>10 minutes</strong></li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password won't change until you click the link</li>
          </ul>
        </div>
        
        <p style="font-size: 16px;">
          If you're having trouble clicking the button, contact our support team at 
          <a href="mailto:support@hotelbooking.com">support@hotelbooking.com</a>
        </p>
        
        <p style="font-size: 16px;">
          Best regards,<br>
          <strong>Oracle Inn Security Team</strong> 🔒
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendPasswordChangeConfirmation(to: string, userName: string): Promise<void> {
    const subject = 'Password Changed Successfully - Oracle Inn ✅';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; background: linear-gradient(135deg, #4caf50, #45a049); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">✅ Password Updated</h1>
          <p style="margin: 10px 0 0 0;">Your account is secure</p>
        </div>
        
        <p style="font-size: 18px;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your password has been successfully changed for your Oracle Inn account.
        </p>
        
        <div style="background: #e8f5e8; border: 1px solid #c8e6c9; color: #2e7d32; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>✅ Security Update Confirmed:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Password changed on: <strong>${new Date().toLocaleString()}</strong></li>
            <li>All devices have been logged out for security</li>
            <li>Please log in again with your new password</li>
          </ul>
        </div>
        
        <div style="background: #fff3e0; border: 1px solid #ffcc02; color: #e65100; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>⚠️ Didn't make this change?</strong></p>
          <p>If you didn't change your password, please contact our support team immediately:</p>
          <p>📧 <a href="mailto:support@hotelbooking.com">support@hotelbooking.com</a></p>
          <p>📞 +91 98765 43210</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" 
             style="background-color: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔑 Login to Account
          </a>
        </div>
        
        <p style="font-size: 16px;">
          Best regards,<br>
          <strong>Oracle Inn Security Team</strong> 🔒
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendBookingCancellation(to: string, bookingDetails: any): Promise<void> {
    const subject = `Booking Cancelled - ${bookingDetails.bookingId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; background: linear-gradient(135deg, #f44336, #d32f2f); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">❌ Booking Cancelled</h1>
          <p style="margin: 10px 0 0 0;">Cancellation confirmed</p>
        </div>
        
        <p style="font-size: 18px;">Dear ${bookingDetails.userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your booking has been successfully cancelled. Here are the cancellation details:
        </p>
        
        <div style="background: #ffebee; border: 1px solid #ffcdd2; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #d32f2f; margin-top: 0;">Cancelled Booking Details</h3>
          <p><strong>🆔 Booking ID:</strong> ${bookingDetails.bookingId}</p>
          <p><strong>🏨 Hotel:</strong> ${bookingDetails.hotelName}</p>
          <p><strong>🛏️ Room:</strong> ${bookingDetails.roomTitle}</p>
          <p><strong>📅 Check-in:</strong> ${new Date(bookingDetails.checkIn).toLocaleDateString()}</p>
          <p><strong>📅 Check-out:</strong> ${new Date(bookingDetails.checkOut).toLocaleDateString()}</p>
          <p><strong>💰 Amount:</strong> ₹${bookingDetails.totalAmount.toLocaleString()}</p>
          <p><strong>📅 Cancelled on:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="background: #e3f2fd; border: 1px solid #bbdefb; color: #1565c0; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>💰 Refund Information:</strong></p>
          <p>Your refund will be processed within 5-7 business days to your original payment method.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/rooms" 
             style="background-color: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔍 Find Another Hotel
          </a>
        </div>
        
        <p style="font-size: 16px;">
          If you have any questions about your cancellation or refund, please contact our support team.
        </p>
        
        <p style="font-size: 16px;">
          Best regards,<br>
          <strong>Oracle Inn Team</strong> 🏨
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}

export default new EmailService();
