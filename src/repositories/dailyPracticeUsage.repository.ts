/**
 * Daily Practice Usage Repository
 * Tracks daily practice question attempts for free tier limit enforcement
 *
 * TIMEZONE HANDLING:
 * All dates are stored in Philippine Time (PHT / GMT+8) to ensure consistent
 * daily limits for users. This prevents confusion where users practicing at
 * 7 AM PHT (11 PM previous day UTC) and 9 AM PHT (1 AM current day UTC) would
 * be counted as different days in UTC but same day in PHT.
 */

import { prisma } from '../config/database';

class DailyPracticeUsageRepository {
  // Philippine timezone offset: GMT+8 (480 minutes)
  private readonly PH_TIMEZONE_OFFSET_MINUTES = 480;

  /**
   * Get today's practice count for a user
   */
  async getTodayCount(userId: string): Promise<number> {
    const today = this.getTodayDatePHT();

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
    const today = this.getTodayDatePHT();

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
    const dateOnly = this.getDateOnlyPHT(date);

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
    // Calculate start date in PHT
    const nowPHT = this.convertToPHT(new Date());
    nowPHT.setDate(nowPHT.getDate() - days);
    const startDate = this.getDateOnlyPHT(nowPHT);

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
   * Helper: Get today's date in Philippine Time (PHT)
   * Example: User practices at 7:00 AM PHT on Jan 31
   * - Server time: 11:00 PM UTC Jan 30
   * - Returns: Jan 31 PHT (correctly reflects user's local date)
   */
  private getTodayDatePHT(): Date {
    const now = new Date();
    return this.getDateOnlyPHT(now);
  }

  /**
   * Helper: Convert UTC date to Philippine Time and extract date only
   */
  private getDateOnlyPHT(date: Date): Date {
    const phtDate = this.convertToPHT(date);

    // Extract date components in PHT
    const year = phtDate.getFullYear();
    const month = phtDate.getMonth();
    const day = phtDate.getDate();

    // Create new date at midnight PHT (stored as UTC equivalent)
    // This ensures consistent date representation regardless of server timezone
    const dateOnly = new Date(Date.UTC(year, month, day));
    dateOnly.setUTCHours(0, 0, 0, 0);

    return dateOnly;
  }

  /**
   * Helper: Convert UTC date to Philippine Time (GMT+8)
   */
  private convertToPHT(utcDate: Date): Date {
    const phtDate = new Date(utcDate);

    // Add 8 hours (480 minutes) to convert UTC to PHT
    phtDate.setMinutes(phtDate.getMinutes() + this.PH_TIMEZONE_OFFSET_MINUTES);

    return phtDate;
  }
}

export const dailyPracticeUsageRepository = new DailyPracticeUsageRepository();
