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
  }) {
    return prisma.subscription.update({
      where: { userId },
      data,
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
