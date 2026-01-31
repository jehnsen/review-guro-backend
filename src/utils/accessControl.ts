/**
 * Access Control Utilities
 * Helper functions for checking premium status and enforcing free tier limits
 */

import { User } from '@prisma/client';
import { config } from '../config/env';

export interface AccessLimits {
  canAccessPremiumFeatures: boolean;
  practiceLimitPerDay: number;
  mockExamQuestionsLimit: number;
  mockExamsPerMonth: number;
}

/**
 * Check if user has premium access
 */
export function isPremiumUser(user: Pick<User, 'isPremium' | 'premiumExpiry'>): boolean {
  // If not marked as premium, return false
  if (!user.isPremium) {
    return false;
  }

  // If no expiry date, premium is valid (lifetime or until they pass)
  if (!user.premiumExpiry) {
    return true;
  }

  // Check if premium hasn't expired
  return new Date() < new Date(user.premiumExpiry);
}

/**
 * Get access limits for a user based on their premium status
 */
export function getUserAccessLimits(user: Pick<User, 'isPremium' | 'premiumExpiry'>): AccessLimits {
  const hasPremium = isPremiumUser(user);

  if (hasPremium) {
    return {
      canAccessPremiumFeatures: true,
      practiceLimitPerDay: Infinity, // Unlimited
      mockExamQuestionsLimit: 170, // Maximum allowed
      mockExamsPerMonth: Infinity, // Unlimited
    };
  }

  // Free tier limits
  return {
    canAccessPremiumFeatures: false,
    practiceLimitPerDay: config.freeTier.practiceLimitPerDay,
    mockExamQuestionsLimit: config.freeTier.mockExamQuestionsLimit,
    mockExamsPerMonth: config.freeTier.mockExamsPerMonth,
  };
}

/**
 * Check if a number exceeds the limit (handles Infinity)
 */
export function exceedsLimit(current: number, limit: number): boolean {
  if (limit === Infinity) {
    return false;
  }
  return current >= limit;
}
