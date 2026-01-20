/**
 * PayMongo Routes
 * Automated payment processing endpoints
 */

import { Router } from 'express';
import { paymongoController } from '../controllers/paymongo.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/payments/paymongo/create-checkout
 * @desc    Create PayMongo checkout session for Season Pass
 * @access  Private
 *
 * Request body:
 * {
 *   "successUrl": "https://reviewguro.com/payment/success",
 *   "cancelUrl": "https://reviewguro.com/payment/failed"
 * }
 */
router.post(
  '/create-checkout',
  authenticateToken,
  paymongoController.createCheckout.bind(paymongoController)
);

/**
 * @route   POST /api/payments/paymongo/webhook
 * @desc    PayMongo webhook endpoint (receives payment events)
 * @access  Public (verified by signature)
 *
 * Webhook events:
 * - payment.paid: Payment successful
 * - payment.failed: Payment failed
 */
router.post('/webhook', paymongoController.handleWebhook.bind(paymongoController));

/**
 * @route   GET /api/payments/paymongo/status/:referenceNumber
 * @desc    Check payment status by reference number
 * @access  Public
 */
router.get(
  '/status/:referenceNumber',
  paymongoController.getPaymentStatus.bind(paymongoController)
);

/**
 * @route   GET /api/payments/paymongo/public-key
 * @desc    Get PayMongo public key for frontend
 * @access  Public
 */
router.get('/public-key', paymongoController.getPublicKey.bind(paymongoController));

export default router;
