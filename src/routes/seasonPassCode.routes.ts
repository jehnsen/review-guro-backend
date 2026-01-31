/**
 * Season Pass Code Routes
 * Defines routes for /api/season-pass-codes endpoints
 */

import { Router } from 'express';
import { seasonPassCodeController } from '../controllers/seasonPassCode.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/season-pass-codes/redeem
 * @desc    Redeem a season pass code
 * @access  Private (authenticated users)
 *
 * Body:
 * - code: string (e.g., "RG-ABC12-XYZ34")
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - subscription: { id, planName, status, activatedAt }
 */
router.post('/redeem', seasonPassCodeController.redeemCode.bind(seasonPassCodeController));

/**
 * @route   POST /api/season-pass-codes/verify
 * @desc    Verify a season pass code without redeeming
 * @access  Private (authenticated users)
 *
 * Body:
 * - code: string
 *
 * Returns:
 * - valid: boolean
 * - message: string
 * - details: { isRedeemed, expiresAt } (if valid)
 */
router.post('/verify', seasonPassCodeController.verifyCode.bind(seasonPassCodeController));

/**
 * @route   POST /api/season-pass-codes/generate
 * @desc    Generate season pass codes
 * @access  Admin only
 *
 * Body:
 * - count: number (1-1000)
 * - batchId: string (optional)
 * - expiresAt: string ISO datetime (optional)
 * - notes: string (optional)
 *
 * Returns:
 * - batchId: string
 * - codes: string[]
 * - count: number
 */
router.post('/generate', seasonPassCodeController.generateCodes.bind(seasonPassCodeController));

/**
 * @route   GET /api/season-pass-codes/batch/:batchId/stats
 * @desc    Get batch statistics
 * @access  Admin only
 *
 * Returns:
 * - batchId: string
 * - total: number
 * - redeemed: number
 * - unredeemed: number
 * - redeemedPercentage: number
 */
router.get('/batch/:batchId/stats', seasonPassCodeController.getBatchStats.bind(seasonPassCodeController));

/**
 * @route   GET /api/season-pass-codes/unredeemed
 * @desc    List unredeemed codes
 * @access  Admin only
 *
 * Query params:
 * - limit: number (default: 100)
 *
 * Returns:
 * - codes: SeasonPassCode[]
 * - count: number
 */
router.get('/unredeemed', seasonPassCodeController.listUnredeemed.bind(seasonPassCodeController));

/**
 * @route   GET /api/season-pass-codes/redeemed
 * @desc    List redeemed codes
 * @access  Admin only
 *
 * Query params:
 * - limit: number (default: 100)
 *
 * Returns:
 * - codes: SeasonPassCode[]
 * - count: number
 */
router.get('/redeemed', seasonPassCodeController.listRedeemed.bind(seasonPassCodeController));

export default router;
