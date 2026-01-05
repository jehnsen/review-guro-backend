/**
 * Express Application Configuration
 * Sets up middleware, security, and routes
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();

  // ===========================================
  // SECURITY MIDDLEWARE
  // ===========================================

  // Helmet: Sets various HTTP headers for security
  // - Prevents clickjacking (X-Frame-Options)
  // - Prevents MIME type sniffing (X-Content-Type-Options)
  // - Enables XSS filter (X-XSS-Protection)
  // - Removes X-Powered-By header
  app.use(helmet());

  // CORS: Cross-Origin Resource Sharing
  // Configure based on environment
  app.use(
    cors({
      origin: config.server.isProduction
        ? ['https://reviewguro.com', 'https://www.reviewguro.com'] // Production domains
        : '*', // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400, // 24 hours preflight cache
    })
  );

  // ===========================================
  // BODY PARSING MIDDLEWARE
  // ===========================================

  // Parse JSON bodies (with size limit for security)
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ===========================================
  // REQUEST LOGGING (Development only)
  // ===========================================

  if (config.server.isDevelopment) {
    app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
      next();
    });
  }

  // ===========================================
  // API ROUTES
  // ===========================================

  // Mount all routes under /api prefix
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Welcome to ReviewGuro API',
      data: {
        version: '1.0.0',
        health: '/api/health',
        endpoints: {
          auth: '/api/auth',
          questions: '/api/questions',
          practice: '/api/practice',
          mockExams: '/api/mock-exams',
          analytics: '/api/analytics',
        },
      },
    });
  });

  // ===========================================
  // ERROR HANDLING
  // ===========================================

  // Handle 404 - Route not found
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};
