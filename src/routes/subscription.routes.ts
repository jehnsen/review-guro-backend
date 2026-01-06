/**
 * Subscription Routes
 * Endpoints for subscription and payment management
 *
 * Base path: /api/subscription
 */

import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/subscription
 * @desc    Get current subscription info
 * @access  Private
 */
router.get('/', subscriptionController.getSubscription.bind(subscriptionController));

/**
 * @route   POST /api/subscription/purchase
 * @desc    Process subscription purchase
 * @access  Private
 *
 * Request body:
 * {
 *   "paymentMethod": "GCash" | "Maya" | "Debit Card",
 *   "amount": 399,
 *   "transactionId": "GCASH-123456789"
 * }
 */
router.post('/purchase', subscriptionController.purchaseSubscription.bind(subscriptionController));

export default router;
