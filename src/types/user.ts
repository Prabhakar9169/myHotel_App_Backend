import { Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'user' | 'admin';
  avatar?: string;
  isActive: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  createPasswordResetToken(): string;
  changedPasswordAfter(JWTTimestamp: number): boolean;
}

export interface IUserInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: 'user' | 'admin';
}

export interface ILoginInput {
  email: string;
  password: string;
}

// New interfaces for password reset
export interface IForgotPasswordInput {
  email: string;
}

export interface IResetPasswordInput {
  password: string;
  confirmPassword: string;
}

export interface IChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
