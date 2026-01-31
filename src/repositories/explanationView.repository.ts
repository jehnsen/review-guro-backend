/**
 * Explanation View Repository
 * Tracks daily explanation views for taste test feature
 */

import { prisma } from '../config/database';

class ExplanationViewRepository {
  /**
   * Get today's explanation view count for a user
   */
  async getTodayCount(userId: string): Promise<number> {
    const today = this.getTodayDateUTC();

    const record = await prisma.dailyExplanationView.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    return record?.viewCount || 0;
  }

  /**
   * Increment today's explanation view count
   */
  async incrementTodayCount(userId: string): Promise<number> {
    const today = this.getTodayDateUTC();

    const record = await prisma.dailyExplanationView.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        viewCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        date: today,
        viewCount: 1,
      },
    });

    return record.viewCount;
  }

  /**
   * Get view count for a specific date
   */
  async getCountForDate(userId: string, date: Date): Promise<number> {
    const dateOnly = this.getDateOnly(date);

    const record = await prisma.dailyExplanationView.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateOnly,
        },
      },
    });

    return record?.viewCount || 0;
  }

  /**
   * Get user's view history for the last N days
   */
  async getHistory(userId: string, days: number = 7): Promise<Array<{ date: Date; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const records = await prisma.dailyExplanationView.findMany({
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
      count: r.viewCount,
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

export const explanationViewRepository = new ExplanationViewRepository();
