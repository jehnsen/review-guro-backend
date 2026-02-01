/**
 * Subscription Repository
 * Data access layer for Subscription entity
 */

import { prisma } from '../config/database';

class SubscriptionRepository {
  /**
   * Find subscription by user ID
   */
  async findByUserId(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
    });
  }

  /**
   * Find subscription by reference number
   */
  async findByReferenceNumber(referenceNumber: string) {
    return prisma.subscription.findFirst({
      where: { referenceNumber },
    });
  }

  /**
   * Create subscription
   */
  async create(data: {
    userId: string;
    planName: string;
    planPrice: number;
    purchaseDate: Date;
    paymentMethod: string;
    amountPaid: number;
    transactionId?: string;
    referenceNumber?: string;
    paymentProvider?: string;
    status?: string;
    expiresAt?: Date | null;
  }) {
    return prisma.subscription.create({
      data,
    });
  }

  /**
   * Update subscription
   */
  async update(userId: string, data: {
    status?: string;
    expiresAt?: Date;
    paymentMethod?: string;
    transactionId?: string;
    paymentProvider?: string;
  }) {
    return prisma.subscription.update({
      where: { userId },
      data,
    });
  }

  /**
   * Create subscription with user premium update in atomic transaction
   * CRITICAL: Ensures both subscription creation and premium activation happen together
   * Prevents scenario where payment succeeds but user doesn't get premium access
   */
  async createWithUserUpdate(data: {
    userId: string;
    planName: string;
    planPrice: number;
    purchaseDate: Date;
    paymentMethod: string;
    amountPaid: number;
    transactionId?: string;
    referenceNumber?: string;
    paymentProvider?: string;
    status?: string;
    expiresAt?: Date | null;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create subscription
      const subscription = await tx.subscription.create({
        data,
      });

      // 2. Activate user premium status
      await tx.user.update({
        where: { id: data.userId },
        data: {
          isPremium: true,
          premiumExpiry: data.expiresAt,
        },
      });

      return subscription;
    });
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.findByUserId(userId);

    if (!subscription || subscription.status !== 'active') {
      return false;
    }

    // Check if expired (if expiresAt is set)
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return false;
    }

    return true;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
