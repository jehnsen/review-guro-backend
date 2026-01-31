/**
 * Streak Service
 * Business logic for streak tracking and repair
 */

import { streakRepository } from '../repositories/streak.repository';
import { userRepository } from '../repositories/user.repository';
import { getUserAccessLimits } from '../utils/accessControl';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Streak repair costs (can be configured)
const STREAK_REPAIR_COST = 50; // points or currency
const MAX_REPAIRABLE_DAYS = 1; // Can only repair up to 1 missed day

class StreakService {
  /**
   * Update user's streak based on activity
   * Called when user completes a practice question
   */
  async updateStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewRecord: boolean;
  }> {
    const today = this.getTodayDateUTC();
    const streak = await streakRepository.findOrCreate(userId);

    // If no previous activity, start streak at 1
    if (!streak.lastActivityDate) {
      const updated = await streakRepository.update(userId, {
        currentStreak: 1,
        longestStreak: Math.max(1, streak.longestStreak),
        lastActivityDate: today,
      });

      return {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        isNewRecord: updated.currentStreak === updated.longestStreak,
      };
    }

    // Calculate days since last activity
    const lastActivity = new Date(streak.lastActivityDate);
    const daysSinceLastActivity = this.daysBetween(lastActivity, today);

    // Same day - no change
    if (daysSinceLastActivity === 0) {
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isNewRecord: false,
      };
    }

    // Consecutive day - increment streak
    if (daysSinceLastActivity === 1) {
      const newStreak = streak.currentStreak + 1;
      const updated = await streakRepository.update(userId, {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak.longestStreak),
        lastActivityDate: today,
      });

      return {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        isNewRecord: updated.currentStreak === updated.longestStreak,
      };
    }

    // Missed days - reset streak
    const updated = await streakRepository.update(userId, {
      currentStreak: 1,
      lastActivityDate: today,
    });

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      isNewRecord: false,
    };
  }

  /**
   * Get streak status with repair information
   */
  async getStreakStatus(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
    canRepair: boolean;
    missedDays: number;
    repairCost: number;
  }> {
    const streak = await streakRepository.findOrCreate(userId);
    const today = this.getTodayDateUTC();

    // Calculate missed days
    let missedDays = 0;
    let canRepair = false;

    if (streak.lastActivityDate) {
      const lastActivity = new Date(streak.lastActivityDate);
      const daysSinceLastActivity = this.daysBetween(lastActivity, today);

      // Missed days = daysSince - 1 (excluding today)
      missedDays = Math.max(0, daysSinceLastActivity - 1);

      // Can repair if:
      // 1. Missed exactly 1 day
      // 2. Haven't repaired today already
      canRepair = missedDays === 1 && daysSinceLastActivity === 2;

      // Check if already repaired today
      if (canRepair && streak.streakRepairedAt) {
        const repairedDate = new Date(streak.streakRepairedAt);
        const repairedToday = this.isSameDay(repairedDate, today);
        canRepair = !repairedToday;
      }
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
      canRepair,
      missedDays,
      repairCost: canRepair ? STREAK_REPAIR_COST : 0,
    };
  }

  /**
   * Repair a broken streak
   */
  async repairStreak(userId: string): Promise<{
    success: boolean;
    message: string;
    currentStreak: number;
    repairCost: number;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get current streak status
    const status = await this.getStreakStatus(userId);

    // Validate repair eligibility
    if (!status.canRepair) {
      if (status.missedDays === 0) {
        throw new BadRequestError('Your streak is not broken. Keep it up!');
      } else if (status.missedDays > MAX_REPAIRABLE_DAYS) {
        throw new BadRequestError(
          `You missed ${status.missedDays} days. Streak repair is only available for 1 missed day.`
        );
      } else {
        throw new BadRequestError('Streak repair not available');
      }
    }

    // Check if premium user (free streak repair)
    const accessLimits = getUserAccessLimits(user);
    const isPremium = accessLimits.canAccessPremiumFeatures;

    // For now, we'll allow free repairs for all users
    // You can add points/currency deduction logic here later
    if (!isPremium) {
      // TODO: Deduct points/currency for free users
      // For now, we'll allow it for free
    }

    // Repair the streak
    const today = this.getTodayDateUTC();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const updated = await streakRepository.update(userId, {
      lastActivityDate: yesterday, // Set to yesterday to allow continuation
      streakRepairedAt: today,
    });

    return {
      success: true,
      message: 'Streak repaired successfully! Your streak continues.',
      currentStreak: updated.currentStreak,
      repairCost: isPremium ? 0 : STREAK_REPAIR_COST,
    };
  }

  /**
   * Helper: Get today's date in UTC (date only)
   */
  private getTodayDateUTC(): Date {
    const now = new Date();
    const utcDate = new Date(now);
    utcDate.setUTCHours(0, 0, 0, 0);
    return utcDate;
  }

  /**
   * Helper: Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setUTCHours(0, 0, 0, 0);
    d2.setUTCHours(0, 0, 0, 0);

    const diffTime = d2.getTime() - d1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return this.daysBetween(date1, date2) === 0;
  }
}

export const streakService = new StreakService();
