/**
 * API Routes Index
 * Combines all route modules under /api prefix
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import questionRoutes from './question.routes';
import practiceRoutes from './practice.routes';
import mockExamRoutes from './mockExam.routes';
import analyticsRoutes from './analytics.routes';
import userRoutes from './user.routes';
import subscriptionRoutes from './subscription.routes';
import paymentRoutes from './payment.routes';
import paymongoRoutes from './paymongo.routes';
import paymentVerificationRoutes from './paymentVerification.routes';
import seasonPassCodeRoutes from './seasonPassCode.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'ReviewGuro API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/questions', questionRoutes);
router.use('/practice', practiceRoutes);
router.use('/mock-exams', mockExamRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/payments', paymentRoutes);

// Payment system routes
router.use('/payments/paymongo', paymongoRoutes);
router.use('/payments/manual', paymentVerificationRoutes);

// Season pass code routes
router.use('/season-pass-codes', seasonPassCodeRoutes);

export default router;
