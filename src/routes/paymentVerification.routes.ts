/**
 * Payment Verification Routes
 * Manual payment verification endpoints
 */

import { Router } from 'express';
import { paymentVerificationController } from '../controllers/paymentVerification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadPaymentProof } from '../middlewares/upload.middleware';

const router = Router();

/**
 * @route   POST /api/payments/manual/submit
 * @desc    Submit proof of payment for manual verification
 * @access  Private
 *
 * Form data:
 * - amount: number
 * - paymentMethod: string (GCash, Maya)
 * - referenceNumber: string
 * - gcashNumber: string
 * - proofImage: file (screenshot)
 */
router.post(
  '/submit',
  authenticateToken,
  uploadPaymentProof,
  paymentVerificationController.submitProof.bind(paymentVerificationController)
);

/**
 * @route   GET /api/payments/manual/status
 * @desc    Get verification status for current user
 * @access  Private
 */
router.get(
  '/status',
  authenticateToken,
  paymentVerificationController.getStatus.bind(paymentVerificationController)
);

/**
 * @route   GET /api/payments/manual/pending
 * @desc    Get all pending verifications (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/pending',
  authenticateToken,
  // TODO: Add admin middleware check
  paymentVerificationController.getPending.bind(paymentVerificationController)
);

/**
 * @route   GET /api/payments/manual/history
 * @desc    Get all verifications with filters (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/history',
  authenticateToken,
  // TODO: Add admin middleware check
  paymentVerificationController.getHistory.bind(paymentVerificationController)
);

/**
 * @route   POST /api/payments/manual/:id/approve
 * @desc    Approve payment verification (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/:id/approve',
  authenticateToken,
  // TODO: Add admin middleware check
  paymentVerificationController.approve.bind(paymentVerificationController)
);

/**
 * @route   POST /api/payments/manual/:id/reject
 * @desc    Reject payment verification (Admin only)
 * @access  Private (Admin)
 *
 * Request body:
 * {
 *   "reason": "Invalid reference number"
 * }
 */
router.post(
  '/:id/reject',
  authenticateToken,
  // TODO: Add admin middleware check
  paymentVerificationController.reject.bind(paymentVerificationController)
);

/**
 * @route   GET /api/payments/manual/stats
 * @desc    Get payment statistics (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  authenticateToken,
  // TODO: Add admin middleware check
  paymentVerificationController.getStats.bind(paymentVerificationController)
);

export default router;
