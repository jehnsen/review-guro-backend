/**
 * Analytics Routes
 * Defines all endpoints for Analytics and Insights feature
 *
 * Base path: /api/analytics
 */

import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard overview metrics
 * @access  Private
 *
 * Returns:
 * - totalQuestions: Total questions attempted
 * - accuracy: Overall accuracy percentage
 * - studyTime: Total study time (hours and minutes)
 * - streak: Current and longest streak
 * - mockExams: Mock exam statistics
 */
router.get('/dashboard', analyticsController.getDashboard.bind(analyticsController));

/**
 * @route   GET /api/analytics/weekly-activity
 * @desc    Get weekly activity breakdown (last 7 days)
 * @access  Private
 *
 * Returns:
 * - labels: Array of day names
 * - data: Daily breakdown with questions attempted, correct answers, accuracy
 */
router.get('/weekly-activity', analyticsController.getWeeklyActivity.bind(analyticsController));

/**
 * @route   GET /api/analytics/strengths-weaknesses
 * @desc    Get top 3 strengths and weaknesses
 * @access  Private
 *
 * Returns:
 * - strengths: Top 3 categories by accuracy
 * - weaknesses: Bottom 3 categories with recommendations
 */
router.get(
  '/strengths-weaknesses',
  analyticsController.getStrengthsWeaknesses.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/performance-by-category
 * @desc    Get detailed performance breakdown by category
 * @access  Private
 *
 * Returns: Array of category performance with:
 * - category
 * - totalAttempted
 * - correctAnswers
 * - accuracy
 * - averageDifficulty
 * - status (excellent/good/needs_improvement)
 */
router.get(
  '/performance-by-category',
  analyticsController.getPerformanceByCategory.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/ai-insights
 * @desc    Get AI-generated insights and recommendations
 * @access  Private
 *
 * Returns:
 * - overallAssessment: AI summary of user's performance
 * - recommendations: Personalized action items
 * - focusAreas: Categories to prioritize
 * - encouragement: Motivational message
 */
router.get('/ai-insights', analyticsController.getAIInsights.bind(analyticsController));

/**
 * @route   GET /api/analytics/streak
 * @desc    Get study streak information
 * @access  Private
 *
 * Returns:
 * - currentStreak: Current consecutive days
 * - longestStreak: Longest streak achieved
 * - lastActivityDate: Last study session
 * - streakStatus: active/at_risk/broken
 * - daysUntilBreak: Days until streak breaks
 */
router.get('/streak', analyticsController.getStreak.bind(analyticsController));

/**
 * @route   GET /api/analytics/time-tracking
 * @desc    Get time breakdown by category
 * @access  Private
 *
 * Returns:
 * - totalMinutes: Total study time
 * - hours: Total hours
 * - breakdown: Time spent per category with percentages
 */
router.get('/time-tracking', analyticsController.getTimeTracking.bind(analyticsController));

/**
 * @route   GET /api/analytics
 * @desc    Get all analytics data in one request
 * @access  Private
 *
 * Returns: Combined object with all analytics data:
 * - dashboard
 * - weeklyActivity
 * - strengthsWeaknesses
 * - performance
 * - insights
 * - streak
 * - timeTracking
 */
router.get('/', analyticsController.getAllAnalytics.bind(analyticsController));

export default router;
