/**
 * Question Controller
 * Handles HTTP requests for question endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Difficulty, QuestionCategory } from '@prisma/client';
import { questionService } from '../services/question.service';
import { sendPaginated } from '../utils/response';
import { ValidationError } from '../utils/errors';

// Validation schema for query parameters
const querySchema = z.object({
  category: z.nativeEnum(QuestionCategory).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be a positive number'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

class QuestionController {
  /**
   * GET /api/questions
   * Fetch paginated questions with optional filters
   *
   * Query Parameters:
   * - category: VERBAL_ABILITY | NUMERICAL_ABILITY | ANALYTICAL_ABILITY | GENERAL_INFORMATION | CLERICAL_ABILITY
   * - difficulty: EASY | MEDIUM | HARD
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   *
   * Response includes cache metadata indicating if result was from Redis cache
   */
  async getQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate query parameters
      const parseResult = querySchema.safeParse(req.query);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Invalid query parameters', errors);
      }

      const { category, difficulty, page, limit } = parseResult.data;

      // Fetch questions using service (implements cache-aside pattern)
      const { result, cached, cacheKey } = await questionService.getQuestions({
        category,
        difficulty,
        page,
        limit,
      });

      // Return paginated response with cache metadata
      sendPaginated(
        res,
        result.items,
        result.meta.page,
        result.meta.limit,
        result.meta.total,
        'Questions retrieved successfully',
        { cached, cacheKey }
      );
    } catch (error) {
      next(error);
    }
  }
}

export const questionController = new QuestionController();
