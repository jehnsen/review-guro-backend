/**
 * Daily Practice Usage Repository
 * Tracks daily practice question attempts for free tier limit enforcement
 */

import { prisma } from '../config/database';

class DailyPracticeUsageRepository {
  /**
   * Get today's practice count for a user
   */
  async getTodayCount(userId: string): Promise<number> {
    const today = this.getTodayDateUTC();

    const record = await prisma.dailyPracticeUsage.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    return record?.questionsCount || 0;
  }

  /**
   * Increment today's practice count for a user
   */
  async incrementTodayCount(userId: string): Promise<number> {
    const today = this.getTodayDateUTC();

    const record = await prisma.dailyPracticeUsage.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        questionsCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        date: today,
        questionsCount: 1,
      },
    });

    return record.questionsCount;
  }

  /**
   * Get practice count for a specific date
   */
  async getCountForDate(userId: string, date: Date): Promise<number> {
    const dateOnly = this.getDateOnly(date);

    const record = await prisma.dailyPracticeUsage.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateOnly,
        },
      },
    });

    return record?.questionsCount || 0;
  }

  /**
   * Get user's practice history for the last N days
   */
  async getHistory(userId: string, days: number = 7): Promise<Array<{ date: Date; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const records = await prisma.dailyPracticeUsage.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return records.map(r => ({
      date: r.date,
      count: r.questionsCount,
    }));
  }

  /**
   * Helper: Get today's date in UTC (date only, no time)
   */
  private getTodayDateUTC(): Date {
    const now = new Date();
    return this.getDateOnly(now);
  }

  /**
   * Helper: Extract date only (strip time component) in UTC
   */
  private getDateOnly(date: Date): Date {
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0);
    return utcDate;
  }
}

export const dailyPracticeUsageRepository = new DailyPracticeUsageRepository();
