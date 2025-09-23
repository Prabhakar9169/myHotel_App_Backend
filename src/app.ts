import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import profileRoutes from './routes/profile';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payment';
import userRoutes from './routes/user';
import { protect, authorize } from './middleware/auth';
import errorHandler from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', protect, paymentRoutes);
app.use('/api/users', protect, authorize('admin'), userRoutes);

// Health & Info Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Oracle Inn API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      payments: '/api/payments',
      users: '/api/users',
      health: '/health'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
