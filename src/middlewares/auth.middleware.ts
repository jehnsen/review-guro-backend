/**
 * Authentication Middleware
 * Protects routes by validating JWT tokens
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';

/**
 * Middleware to authenticate requests using JWT
 *
 * Expects Authorization header in format: "Bearer <token>"
 *
 * On success: Attaches user payload to req.user and calls next()
 * On failure: Throws UnauthorizedError
 */
export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format. Use: Bearer <token>');
    }

    const token = parts[1];

    // Verify token and extract payload
    const payload = authService.verifyToken(token);

    // Attach user info to request for use in route handlers
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Same as authenticateToken but doesn't fail if no token provided
 * Useful for endpoints that have different behavior for authenticated/anonymous users
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];

    try {
      const payload = authService.verifyToken(token);
      req.user = payload;
    } catch {
      // Token invalid, but that's okay for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Must be used after authenticateToken
 *
 * @param roles - Array of allowed roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        throw new UnauthorizedError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
