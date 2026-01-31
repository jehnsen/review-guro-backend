/**
 * Practice Controller
 * Handles HTTP requests for practice/interaction endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { practiceService } from '../services/practice.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

// Validation schemas
const submitAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
  selectedOptionId: z.string().min(1, 'Option ID is required'),
});

const explainSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
});

class PracticeController {
  /**
   * POST /api/practice/submit
   * Submit an answer for a question
   *
   * Request Body:
   * - questionId: UUID of the question
   * - selectedOptionId: ID of the selected option
   *
   * Response:
   * - isCorrect: boolean
   * - correctOptionId: string
   * - selectedOptionId: string
   * - explanation: string | null
   * - pointsEarned: number
   */
  async submitAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const parseResult = submitAnswerSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }

      const userId = req.user!.userId;
      const result = await practiceService.submitAnswer(userId, parseResult.data);

      sendSuccess(res, result, result.isCorrect ? 'Correct answer!' : 'Incorrect answer');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/practice/explain
   * Get AI-powered explanation for a question
   *
   * This is the "AI Tutor" endpoint that provides detailed explanations.
   *
   * Request Body:
   * - questionId: UUID of the question
   *
   * Response:
   * - questionId: string
   * - explanation: string (AI-generated or cached)
   * - source: 'database' | 'cache' | 'ai_generated'
   */
  async getExplanation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const parseResult = explainSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }

      const result = await practiceService.getExplanation(parseResult.data);

      sendSuccess(res, result, 'Explanation retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/practice/stats
   * Get user's practice statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await practiceService.getUserStats(userId);

      sendSuccess(res, stats, 'Statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/practice/progress/categories
   * Get user's progress by category
   *
   * Returns:
   * - categories: Array of category progress with accuracy percentages
   * - overallStats: Overall user statistics
   *
   * This endpoint matches the UI shown in the screenshot with progress bars per category
   */
  async getCategoryProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const progress = await practiceService.getCategoryProgress(userId);

      sendSuccess(res, progress, 'Category progress retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/practice/limits
   * Get daily practice limits and current usage
   *
   * Returns:
   * - isPremium: boolean
   * - dailyLimit: number (-1 for unlimited)
   * - usedToday: number
   * - remainingToday: number (-1 for unlimited)
   */
  async getDailyLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limits = await practiceService.getDailyLimits(userId);

      sendSuccess(res, limits, 'Daily limits retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const practiceController = new PracticeController();
