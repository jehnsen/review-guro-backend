/**
 * Subscription Controller
 * Handles subscription and payment endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { sendSuccess } from '../utils/response';

export class SubscriptionController {
  /**
   * GET /api/subscription
   * Get current subscription info
   */
  async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const subscription = await subscriptionService.getSubscription(userId);

      sendSuccess(res, subscription, 'Subscription retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/subscription/purchase
   * Process subscription purchase
   */
  async purchaseSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { paymentMethod, amount, transactionId } = req.body;

      const subscription = await subscriptionService.purchaseSubscription(userId, {
        paymentMethod,
        amount,
        transactionId,
      });

      sendSuccess(res, subscription, 'Subscription activated successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
