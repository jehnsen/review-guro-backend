/**
 * Practice Routes
 * Defines routes for /api/practice endpoints
 */

import { Router } from 'express';
import { practiceController } from '../controllers/practice.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// All practice routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/practice/submit
 * @desc    Submit an answer for a question
 * @access  Private (requires authentication)
 *
 * Body:
 * - questionId: string (UUID)
 * - selectedOptionId: string
 *
 * Returns:
 * - isCorrect: boolean
 * - correctOptionId: string
 * - selectedOptionId: string
 * - explanation: string | null
 * - pointsEarned: number
 */
router.post('/submit', practiceController.submitAnswer.bind(practiceController));

/**
 * @route   POST /api/practice/explain
 * @desc    Get AI-powered explanation for a question
 * @access  Private (requires authentication)
 *
 * Body:
 * - questionId: string (UUID)
 *
 * Returns:
 * - questionId: string
 * - explanation: string
 * - source: 'database' | 'cache' | 'ai_generated'
 */
router.post('/explain', practiceController.getExplanation.bind(practiceController));

/**
 * @route   GET /api/practice/stats
 * @desc    Get user's practice statistics
 * @access  Private (requires authentication)
 *
 * Returns:
 * - totalAttempts: number
 * - correctAnswers: number
 * - accuracy: number (percentage)
 */
router.get('/stats', practiceController.getStats.bind(practiceController));

/**
 * @route   GET /api/practice/progress/categories
 * @desc    Get user's progress by category (for practice dashboard)
 * @access  Private (requires authentication)
 *
 * Returns:
 * - categories: Array of category progress
 *   - category: QuestionCategory enum
 *   - totalQuestions: number (total attempts in this category)
 *   - attemptedQuestions: number (unique questions attempted)
 *   - correctAnswers: number
 *   - accuracy: number (percentage 0-100)
 *   - questionsAvailable: number (total questions in DB for this category)
 * - overallStats: Overall user statistics
 *   - totalAttempts: number
 *   - correctAnswers: number
 *   - accuracy: number
 *
 * Example Response:
 * {
 *   "categories": [
 *     {
 *       "category": "VERBAL_ABILITY",
 *       "totalQuestions": 10,
 *       "attemptedQuestions": 8,
 *       "correctAnswers": 7,
 *       "accuracy": 70.0,
 *       "questionsAvailable": 60
 *     },
 *     ...
 *   ],
 *   "overallStats": {
 *     "totalAttempts": 50,
 *     "correctAnswers": 40,
 *     "accuracy": 80.0
 *   }
 * }
 */
router.get('/progress/categories', practiceController.getCategoryProgress.bind(practiceController));

/**
 * @route   GET /api/practice/limits
 * @desc    Get daily practice limits and current usage
 * @access  Private (requires authentication)
 *
 * Returns:
 * - isPremium: boolean
 * - dailyLimit: number (-1 for unlimited)
 * - usedToday: number
 * - remainingToday: number (-1 for unlimited)
 */
router.get('/limits', practiceController.getDailyLimits.bind(practiceController));

export default router;
