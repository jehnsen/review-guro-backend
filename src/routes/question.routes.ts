/**
 * Question Routes
 * Defines routes for /api/questions endpoints
 */

import { Router } from 'express';
import { questionController } from '../controllers/question.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/questions
 * @desc    Get paginated questions with optional filters
 * @access  Private (requires authentication)
 *
 * Query Parameters:
 * - category: QuestionCategory enum
 * - difficulty: Difficulty enum
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 *
 * Response includes cache metadata:
 * - cached: boolean - whether result came from Redis cache
 * - cacheKey: string - the Redis key used for this query
 */
router.get(
  '/',
  authenticateToken,
  questionController.getQuestions.bind(questionController)
);

export default router;
