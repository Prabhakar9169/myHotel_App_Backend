import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Async error handler wrapper
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// API Response helper
export const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: any
) => {
  res.status(statusCode).json({
    success,
    message,
    ...(data && { data })
  });
};

// Generate pagination
export const getPagination = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: Math.min(limit, 50) }; // Max 50 items per page
};

// Calculate total pages
export const getTotalPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

// Date validation
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// Calculate nights between dates
export const calculateNights = (checkIn: Date, checkOut: Date): number => {
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Generate booking reference
export const generateBookingReference = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `BK${timestamp}${random}`.toUpperCase();
};
