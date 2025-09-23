import { Request, Response } from 'express';

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      auth: '/api/auth',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      payments: '/api/payments',
      users: '/api/users',
      health: '/health'
    }
  });
};
