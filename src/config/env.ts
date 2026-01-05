/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL format'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Cache TTL (in seconds)
  CACHE_TTL_QUESTIONS: z.string().transform(Number).default('3600'),
  CACHE_TTL_EXPLANATIONS: z.string().transform(Number).default('86400'),
});

// Parse and validate environment variables
const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return parsed.data;
};

// Export validated environment configuration
export const env = parseEnv();

// Export typed configuration object
export const config = {
  server: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  cache: {
    questionsTTL: env.CACHE_TTL_QUESTIONS,
    explanationsTTL: env.CACHE_TTL_EXPLANATIONS,
  },
} as const;

export type Config = typeof config;
