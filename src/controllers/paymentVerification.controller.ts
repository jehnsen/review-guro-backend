/**
 * Payment Verification Controller
 * Manual payment verification endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { paymentVerificationService } from '../services/paymentVerification.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';

export class PaymentVerificationController {
  /**
   * POST /api/payments/manual/submit
   * Submit proof of payment for manual verification
   */
  async submitProof(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { amount, paymentMethod, referenceNumber, gcashNumber } = req.body;
      const proofImageUrl = req.file?.path; // From multer upload

      const verification = await paymentVerificationService.submitProof({
        userId,
        amount: parseFloat(amount),
        paymentMethod,
        referenceNumber,
        proofImageUrl,
        gcashNumber,
      });

      sendSuccess(
        res,
        {
          id: verification.id,
          activationCode: verification.activationCode,
          status: verification.status,
          submittedAt: verification.createdAt,
        },
        'Payment proof submitted successfully. We will verify your payment within 5-30 minutes.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/manual/status
   * Get verification status for current user
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const verification = await paymentVerificationService.getStatus(userId);

      if (!verification) {
        sendSuccess(
          res,
          {
            status: 'none',
            message: 'No payment verification found',
          },
          'No verification found'
        );
        return;
      }

      sendSuccess(
        res,
        {
          id: verification.id,
          status: verification.status,
          activationCode: verification.activationCode,
          amount: Number(verification.amount),
          paymentMethod: verification.paymentMethod,
          submittedAt: verification.createdAt,
          verifiedAt: verification.verifiedAt,
          rejectionReason: verification.rejectionReason,
        },
        'Verification status retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/payments/pending
   * Get all pending payment verifications (Admin only)
   */
  async getPending(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pending = await paymentVerificationService.getPending();

      sendSuccess(
        res,
        {
          pending,
          count: pending.length,
        },
        'Pending verifications retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/payments/history
   * Get all payment verifications with filters (Admin only)
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, paymentMethod, page, limit } = req.query;

      const result = await paymentVerificationService.getAll({
        status: status as string,
        paymentMethod: paymentMethod as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      sendSuccess(res, result, 'Payment history retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/payments/:id/approve
   * Approve payment verification (Admin only)
   */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const verifiedBy = req.user?.userId || 'admin';

      const verification = await paymentVerificationService.approve(id, verifiedBy);

      sendSuccess(
        res,
        {
          id: verification.id,
          userId: verification.userId,
          status: verification.status,
          verifiedAt: verification.verifiedAt,
          user: verification.user,
        },
        'Payment approved and premium activated'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/payments/:id/reject
   * Reject payment verification (Admin only)
   */
  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const verifiedBy = req.user?.userId || 'admin';

      const verification = await paymentVerificationService.reject(id, verifiedBy, reason);

      sendSuccess(
        res,
        {
          id: verification.id,
          userId: verification.userId,
          status: verification.status,
          rejectionReason: verification.rejectionReason,
          verifiedAt: verification.verifiedAt,
        },
        'Payment rejected'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/payments/stats
   * Get payment verification statistics (Admin only)
   */
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await paymentVerificationService.getStats();

      sendSuccess(res, stats, 'Statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentVerificationController = new PaymentVerificationController();
