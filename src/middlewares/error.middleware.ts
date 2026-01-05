/**
 * Global Error Handling Middleware
 * Catches all errors and returns consistent API responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError } from '../utils/errors';
import { sendError } from '../utils/response';
import { config } from '../config/env';

interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Log error in development
  if (config.server.isDevelopment) {
    console.error('Error:', err);
  }

  // Handle our custom AppError instances
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      code: err.code,
    };

    // Add validation errors if present
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    // Add stack trace in development
    if (config.server.isDevelopment) {
      response.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
      code: 'PRISMA_VALIDATION_ERROR',
    });
  }

  // Handle JWT errors (already handled in auth.service but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
    });
  }

  // Default to 500 Internal Server Error for unknown errors
  const response: ErrorResponse = {
    success: false,
    message: config.server.isProduction
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  };

  if (config.server.isDevelopment) {
    response.stack = err.stack;
  }

  return res.status(500).json(response);
};

/**
 * Handle Prisma-specific errors with appropriate HTTP status codes
 */
function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): Response {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const target = err.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`,
        code: 'DUPLICATE_ENTRY',
      });

    case 'P2025':
      // Record not found
      return res.status(404).json({
        success: false,
        message: 'Record not found',
        code: 'NOT_FOUND',
      });

    case 'P2003':
      // Foreign key constraint failed
      return res.status(400).json({
        success: false,
        message: 'Related record not found',
        code: 'FOREIGN_KEY_ERROR',
      });

    case 'P2014':
      // Required relation violation
      return res.status(400).json({
        success: false,
        message: 'Required relation violation',
        code: 'RELATION_ERROR',
      });

    default:
      return res.status(500).json({
        success: false,
        message: 'Database error occurred',
        code: `PRISMA_${err.code}`,
      });
  }
}

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
};
