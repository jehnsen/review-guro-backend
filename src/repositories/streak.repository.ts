/**
 * Streak Repository
 * Data access layer for UserStreak entity
 */

import { UserStreak } from '@prisma/client';
import { prisma } from '../config/database';

class StreakRepository {
  /**
   * Find or create user streak record
   */
  async findOrCreate(userId: string): Promise<UserStreak> {
    let streak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await prisma.userStreak.create({
        data: { userId },
      });
    }

    return streak;
  }

  /**
   * Update user streak
   */
  async update(
    userId: string,
    data: {
      currentStreak?: number;
      longestStreak?: number;
      lastActivityDate?: Date | null;
      streakRepairedAt?: Date | null;
    }
  ): Promise<UserStreak> {
    return prisma.userStreak.update({
      where: { userId },
      data,
    });
  }

  /**
   * Get user streak
   */
  async findByUserId(userId: string): Promise<UserStreak | null> {
    return prisma.userStreak.findUnique({
      where: { userId },
    });
  }

  /**
   * Increment streak
   */
  async incrementStreak(userId: string, date: Date): Promise<UserStreak> {
    const streak = await this.findOrCreate(userId);
    const newStreak = streak.currentStreak + 1;

    return this.update(userId, {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longestStreak),
      lastActivityDate: this.getDateOnly(date),
    });
  }

  /**
   * Reset streak
   */
  async resetStreak(userId: string): Promise<UserStreak> {
    return this.update(userId, {
      currentStreak: 0,
      lastActivityDate: null,
    });
  }

  /**
   * Mark streak as repaired
   */
  async markRepaired(userId: string, date: Date): Promise<UserStreak> {
    return this.update(userId, {
      streakRepairedAt: date,
    });
  }

  /**
   * Helper: Get date only (strip time component)
   */
  private getDateOnly(date: Date): Date {
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0);
    return utcDate;
  }
}

export const streakRepository = new StreakRepository();
