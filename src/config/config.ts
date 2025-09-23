import dotenv from "dotenv";

dotenv.config();

interface Config {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  CLIENT_URL: string;
  STRIPE_SECRET_KEY?: string;
    ENABLE_EMAIL: boolean;
  EMAIL_HOST?: string;
  EMAIL_PORT?: number;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export const config: Config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT as string) || 5000,
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/hotel-booking",
  JWT_SECRET: process.env.JWT_SECRET || "your-jwt-secret-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "30d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  ENABLE_EMAIL: process.env.ENABLE_EMAIL === "true",
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};
