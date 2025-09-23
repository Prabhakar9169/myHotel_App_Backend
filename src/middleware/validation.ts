import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

interface ValidationError {
  message: string;
  field: string;
}

const handleValidationError = (error: Joi.ValidationError): ValidationError[] => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
};

// Registration validation schema
const registrationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name should only contain letters and spaces',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid 10-digit phone number'
    }),
  role: Joi.string()
    .valid('user', 'admin')
    .optional()
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Validation middleware functions
export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = registrationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = handleValidationError(error);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
    return;
  }
  
  next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = handleValidationError(error);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
    return;
  }
  
  next();
};
