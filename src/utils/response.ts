/**
 * API Response Utilities
 * Standardized response helpers for consistent API responses
 */

import { Response } from 'express';
import { APIResponse, ResponseMeta } from '../types';

/**
 * Send a successful response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: ResponseMeta
): Response => {
  const response: APIResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send a no content response (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code: string = 'ERROR'
): Response => {
  const response: APIResponse<null> & { code: string } = {
    success: false,
    message,
    data: null,
    code,
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success',
  additionalMeta?: Partial<ResponseMeta>
): Response => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, items, message, 200, {
    page,
    limit,
    total,
    totalPages,
    ...additionalMeta,
  });
};
