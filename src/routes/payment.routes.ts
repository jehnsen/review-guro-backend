/**
 * Payment Routes
 * Payment processing endpoints for different payment methods
 *
 * Base path: /api/payments
 */

import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/payments/gcash
 * @desc    Process GCash payment
 * @access  Private
 *
 * Request body:
 * {
 *   "amount": 399,
 *   "phoneNumber": "09171234567",
 *   "returnUrl": "https://app.reviewguro.com/payment/callback"
 * }
 */
router.post('/gcash', paymentController.processGCash.bind(paymentController));

/**
 * @route   POST /api/payments/maya
 * @desc    Process Maya payment
 * @access  Private
 *
 * Request body:
 * {
 *   "amount": 399,
 *   "phoneNumber": "09171234567",
 *   "returnUrl": "https://app.reviewguro.com/payment/callback"
 * }
 */
router.post('/maya', paymentController.processMaya.bind(paymentController));

/**
 * @route   POST /api/payments/card
 * @desc    Process debit/credit card payment
 * @access  Private
 *
 * Request body:
 * {
 *   "amount": 399,
 *   "cardNumber": "4111111111111111",
 *   "expiryMonth": "12",
 *   "expiryYear": "2025",
 *   "cvv": "123",
 *   "cardholderName": "MARIA SANTOS"
 * }
 */
router.post('/card', paymentController.processCard.bind(paymentController));

export default router;
