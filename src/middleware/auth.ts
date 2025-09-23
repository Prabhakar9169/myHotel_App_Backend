import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IUser } from '../types/user';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;
    
    // Get user from token
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({ 
        success: false,
        message: 'Invalid token or user deactivated' 
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

// Role-based access control
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
      return;
    }
    
    next();
  };
};
