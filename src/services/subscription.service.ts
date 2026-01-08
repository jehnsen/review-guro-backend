/**
 * Subscription Service
 * Business logic for subscription management
 */

import { subscriptionRepository } from '../repositories/subscription.repository';
import { userRepository } from '../repositories/user.repository';

class SubscriptionService {
  /**
   * Get user's subscription details
   */
  async getSubscription(userId: string) {
    const subscription = await subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      return {
        hasSubscription: false,
        message: 'No active subscription',
      };
    }

    return {
      hasSubscription: true,
      planName: subscription.planName,
      planPrice: Number(subscription.planPrice),
      status: subscription.status,
      features: [
        '50,000+ practice questions',
        'AI Tutor - unlimited questions',
        'Detailed explanations',
        'Progress tracking & analytics',
        'Timed mock exams',
        'Mobile-friendly access',
        'Valid until you pass',
      ],
      billing: {
        purchaseDate: subscription.purchaseDate.toISOString(),
        paymentMethod: subscription.paymentMethod,
        amountPaid: Number(subscription.amountPaid),
      },
    };
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(userId: string, data: {
    paymentMethod: string;
    amount: number;
    transactionId: string;
  }) {
    // Check if user already has subscription
    const existing = await subscriptionRepository.findByUserId(userId);

    if (existing && existing.status === 'active') {
      // Update existing subscription
      const subscription = await subscriptionRepository.update(userId, {
        status: 'active',
      });

      // Update user premium status
      await userRepository.update(userId, {
        isPremium: true,
      });

      return {
        subscriptionId: subscription.id,
        planName: subscription.planName,
        status: subscription.status,
        purchaseDate: subscription.purchaseDate.toISOString(),
      };
    }

    // Create new subscription
    const subscription = await subscriptionRepository.create({
      userId,
      planName: 'Season Pass',
      planPrice: data.amount,
      purchaseDate: new Date(),
      paymentMethod: data.paymentMethod,
      amountPaid: data.amount,
      transactionId: data.transactionId,
    });

    // Update user premium status
    await userRepository.update(userId, {
      isPremium: true,
    });

    return {
      subscriptionId: subscription.id,
      planName: subscription.planName,
      status: subscription.status,
      purchaseDate: subscription.purchaseDate.toISOString(),
    };
  }
}

export const subscriptionService = new SubscriptionService();
