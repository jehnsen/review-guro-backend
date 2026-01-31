/**
 * Mock Exam Routes
 * Defines all endpoints for Mock Examination feature
 *
 * Base path: /api/mock-exams
 */

import { Router } from 'express';
import { mockExamController } from '../controllers/mockExam.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/mock-exams
 * @desc    Create a new mock exam session
 * @access  Private
 *
 * Request body:
 * {
 *   "totalQuestions": 6,
 *   "timeLimitMinutes": 10,
 *   "passingScore": 80,
 *   "categories": "MIXED" | ["VERBAL_ABILITY", "NUMERICAL_ABILITY"],
 *   "difficulty": "MEDIUM" (optional)
 * }
 *
 * Returns: Exam session with questions (correct answers hidden)
 */
router.post('/', mockExamController.create.bind(mockExamController));

/**
 * @route   GET /api/mock-exams/in-progress
 * @desc    Check if user has an in-progress exam
 * @access  Private
 *
 * Returns: { hasInProgressExam: boolean, examId?: string, startedAt?: string, timeRemainingSeconds?: number }
 */
router.get('/in-progress', mockExamController.checkInProgress.bind(mockExamController));

/**
 * @route   GET /api/mock-exams/history
 * @desc    Get user's exam history
 * @access  Private
 *
 * Query params:
 * - status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED" (optional)
 * - limit: number (optional, default: 10)
 *
 * Returns: List of exams with statistics
 */
router.get('/history', mockExamController.getHistory.bind(mockExamController));

/**
 * @route   GET /api/mock-exams/limits
 * @desc    Get mock exam limits and current usage
 * @access  Private
 *
 * Returns:
 * - isPremium: boolean
 * - maxQuestionsPerExam: number
 * - maxExamsPerMonth: number (-1 for unlimited)
 * - examsUsedThisMonth: number
 * - remainingExamsThisMonth: number (-1 for unlimited)
 */
router.get('/limits', mockExamController.getLimits.bind(mockExamController));

/**
 * @route   GET /api/mock-exams/:examId
 * @desc    Get current exam state
 * @access  Private
 *
 * Returns: Exam state with timer, answers, flags, progress
 */
router.get('/:examId', mockExamController.getState.bind(mockExamController));

/**
 * @route   POST /api/mock-exams/:examId/answers
 * @desc    Save answer for a question
 * @access  Private
 *
 * Request body:
 * {
 *   "questionId": "uuid",
 *   "selectedOptionId": "a"
 * }
 *
 * Returns: Updated progress
 */
router.post('/:examId/answers', mockExamController.saveAnswer.bind(mockExamController));

/**
 * @route   PATCH /api/mock-exams/:examId/flag
 * @desc    Flag or unflag a question for review
 * @access  Private
 *
 * Request body:
 * {
 *   "questionId": "uuid",
 *   "flagged": true | false
 * }
 *
 * Returns: Updated flagged questions list
 */
router.patch('/:examId/flag', mockExamController.toggleFlag.bind(mockExamController));

/**
 * @route   POST /api/mock-exams/:examId/submit
 * @desc    Complete and submit exam
 * @access  Private
 *
 * Returns: Full results with correct answers and score
 */
router.post('/:examId/submit', mockExamController.submit.bind(mockExamController));

/**
 * @route   GET /api/mock-exams/:examId/results
 * @desc    Get results for a completed exam
 * @access  Private
 *
 * Returns: Detailed results with explanations
 */
router.get('/:examId/results', mockExamController.getResults.bind(mockExamController));

/**
 * @route   POST /api/mock-exams/:examId/abandon
 * @desc    Abandon an in-progress exam
 * @access  Private
 *
 * Returns: Updated exam status
 */
router.post('/:examId/abandon', mockExamController.abandon.bind(mockExamController));

export default router;
