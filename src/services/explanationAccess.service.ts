/**
 * Explanation Access Service
 * Handles "taste test" feature for mock exam explanations
 */

import { explanationViewRepository } from '../repositories/explanationView.repository';
import { userRepository } from '../repositories/user.repository';
import { getUserAccessLimits } from '../utils/accessControl';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const FREE_EXPLANATION_LIMIT = 3; // Free users can view 3 explanations per day

class ExplanationAccessService {
  /**
   * Check if user can view an explanation
   * Returns access status and current usage
   */
  async checkExplanationAccess(userId: string): Promise<{
    canView: boolean;
    isPremium: boolean;
    dailyLimit: number;
    viewedToday: number;
    remainingToday: number;
    reason?: string;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accessLimits = getUserAccessLimits(user);
    const isPremium = accessLimits.canAccessPremiumFeatures;

    // Premium users have unlimited access
    if (isPremium) {
      return {
        canView: true,
        isPremium: true,
        dailyLimit: -1,
        viewedToday: 0,
        remainingToday: -1,
      };
    }

    // Free users - check daily limit
    const viewedToday = await explanationViewRepository.getTodayCount(userId);
    const remainingToday = Math.max(0, FREE_EXPLANATION_LIMIT - viewedToday);
    const canView = viewedToday < FREE_EXPLANATION_LIMIT;

    return {
      canView,
      isPremium: false,
      dailyLimit: FREE_EXPLANATION_LIMIT,
      viewedToday,
      remainingToday,
      reason: canView ? undefined : 'Daily explanation limit reached',
    };
  }

  /**
   * Record an explanation view
   * Returns updated access status
   */
  async recordExplanationView(userId: string): Promise<{
    success: boolean;
    viewedToday: number;
    remainingToday: number;
    limitReached: boolean;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accessLimits = getUserAccessLimits(user);
    const isPremium = accessLimits.canAccessPremiumFeatures;

    // Premium users - don't track, unlimited access
    if (isPremium) {
      return {
        success: true,
        viewedToday: 0,
        remainingToday: -1,
        limitReached: false,
      };
    }

    // Check if user has reached limit
    const currentCount = await explanationViewRepository.getTodayCount(userId);

    if (currentCount >= FREE_EXPLANATION_LIMIT) {
      throw new ForbiddenError(
        `Daily explanation limit reached. Free users can view up to ${FREE_EXPLANATION_LIMIT} explanations per day in mock exam reviews. Upgrade to Season Pass for unlimited access.`
      );
    }

    // Increment count
    const newCount = await explanationViewRepository.incrementTodayCount(userId);
    const remainingToday = Math.max(0, FREE_EXPLANATION_LIMIT - newCount);

    return {
      success: true,
      viewedToday: newCount,
      remainingToday,
      limitReached: newCount >= FREE_EXPLANATION_LIMIT,
    };
  }

  /**
   * Get explanation access limits for user
   */
  async getExplanationLimits(userId: string): Promise<{
    isPremium: boolean;
    dailyLimit: number;
    viewedToday: number;
    remainingToday: number;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accessLimits = getUserAccessLimits(user);
    const isPremium = accessLimits.canAccessPremiumFeatures;

    if (isPremium) {
      return {
        isPremium: true,
        dailyLimit: -1,
        viewedToday: 0,
        remainingToday: -1,
      };
    }

    const viewedToday = await explanationViewRepository.getTodayCount(userId);
    const remainingToday = Math.max(0, FREE_EXPLANATION_LIMIT - viewedToday);

    return {
      isPremium: false,
      dailyLimit: FREE_EXPLANATION_LIMIT,
      viewedToday,
      remainingToday,
    };
  }
}

export const explanationAccessService = new ExplanationAccessService();
