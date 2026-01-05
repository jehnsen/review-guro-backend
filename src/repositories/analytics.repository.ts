/**
 * Analytics Repository Layer
 * Data access for analytics and statistics
 */

import { prisma } from '../config/database';
import { QuestionCategory } from '@prisma/client';

export class AnalyticsRepository {
  /**
   * Get total questions attempted by user
   */
  async getTotalQuestionsAttempted(userId: string): Promise<number> {
    return prisma.userProgress.count({
      where: { userId },
    });
  }

  /**
   * Get total correct answers by user
   */
  async getTotalCorrectAnswers(userId: string): Promise<number> {
    return prisma.userProgress.count({
      where: {
        userId,
        isCorrect: true,
      },
    });
  }

  /**
   * Get user's overall accuracy
   */
  async getOverallAccuracy(userId: string): Promise<number> {
    const total = await this.getTotalQuestionsAttempted(userId);
    if (total === 0) return 0;

    const correct = await this.getTotalCorrectAnswers(userId);
    return Math.round((correct / total) * 100);
  }

  /**
   * Get total study time in minutes from UserProgress attempts
   */
  async getTotalStudyTimeMinutes(userId: string): Promise<number> {
    // Estimate: Average 1.5 minutes per question attempt
    const totalQuestions = await this.getTotalQuestionsAttempted(userId);
    return Math.round(totalQuestions * 1.5);
  }

  /**
   * Get weekly activity (last 7 days)
   */
  async getWeeklyActivity(userId: string): Promise<
    Array<{
      date: string;
      questionsAttempted: number;
      correctAnswers: number;
      accuracy: number;
    }>
  > {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const attempts = await prisma.userProgress.findMany({
      where: {
        userId,
        attemptedAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        attemptedAt: 'asc',
      },
    });

    // Group by date
    const dailyStats = new Map<string, { total: number; correct: number }>();

    // Initialize all 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats.set(dateKey, { total: 0, correct: 0 });
    }

    // Populate with actual data
    attempts.forEach((attempt) => {
      const dateKey = attempt.attemptedAt.toISOString().split('T')[0];
      const stats = dailyStats.get(dateKey);
      if (stats) {
        stats.total++;
        if (attempt.isCorrect) stats.correct++;
      }
    });

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      questionsAttempted: stats.total,
      correctAnswers: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }));
  }

  /**
   * Get performance by category
   */
  async getPerformanceByCategory(userId: string): Promise<
    Array<{
      category: QuestionCategory;
      totalAttempted: number;
      correctAnswers: number;
      accuracy: number;
      averageDifficulty: string;
    }>
  > {
    const attempts = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            category: true,
            difficulty: true,
          },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<
      QuestionCategory,
      {
        total: number;
        correct: number;
        difficulties: string[];
      }
    >();

    attempts.forEach((attempt) => {
      const category = attempt.question.category;
      const stats = categoryMap.get(category) || {
        total: 0,
        correct: 0,
        difficulties: [],
      };

      stats.total++;
      if (attempt.isCorrect) stats.correct++;
      stats.difficulties.push(attempt.question.difficulty);

      categoryMap.set(category, stats);
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      totalAttempted: stats.total,
      correctAnswers: stats.correct,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      averageDifficulty: this.calculateAverageDifficulty(stats.difficulties),
    }));
  }

  /**
   * Calculate average difficulty
   */
  private calculateAverageDifficulty(difficulties: string[]): string {
    const difficultyScores = { EASY: 1, MEDIUM: 2, HARD: 3 };
    const total = difficulties.reduce(
      (sum, d) => sum + (difficultyScores[d as keyof typeof difficultyScores] || 2),
      0
    );
    const avg = total / difficulties.length;

    if (avg <= 1.5) return 'EASY';
    if (avg <= 2.5) return 'MEDIUM';
    return 'HARD';
  }

  /**
   * Get user's study streak (consecutive days)
   */
  async getStudyStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  }> {
    const attempts = await prisma.userProgress.findMany({
      where: { userId },
      orderBy: {
        attemptedAt: 'desc',
      },
      select: {
        attemptedAt: true,
      },
    });

    if (attempts.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }

    // Get unique dates
    const uniqueDates = new Set<string>();
    attempts.forEach((attempt) => {
      uniqueDates.add(attempt.attemptedAt.toISOString().split('T')[0]);
    });

    const sortedDates = Array.from(uniqueDates).sort().reverse();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (sortedDates[0] === today || sortedDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i - 1]);
        const prevDate = new Date(sortedDates[i]);
        const diffDays = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i - 1]);
      const prevDate = new Date(sortedDates[i]);
      const diffDays = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActivityDate: attempts[0].attemptedAt.toISOString(),
    };
  }

  /**
   * Get time breakdown by category (estimated)
   */
  async getTimeBreakdownByCategory(userId: string): Promise<
    Array<{
      category: QuestionCategory;
      timeSpentMinutes: number;
      percentage: number;
    }>
  > {
    const attempts = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            category: true,
          },
        },
      },
    });

    // Count attempts per category
    const categoryCount = new Map<QuestionCategory, number>();
    attempts.forEach((attempt) => {
      const category = attempt.question.category;
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });

    const totalAttempts = attempts.length;
    const totalTime = totalAttempts * 1.5; // 1.5 min per question

    return Array.from(categoryCount.entries()).map(([category, count]) => ({
      category,
      timeSpentMinutes: Math.round(count * 1.5),
      percentage: Math.round((count / totalAttempts) * 100),
    }));
  }

  /**
   * Get mock exam statistics
   */
  async getMockExamStats(userId: string): Promise<{
    totalExams: number;
    completedExams: number;
    averageScore: number;
    passRate: number;
  }> {
    const [totalExams, completedExams] = await Promise.all([
      prisma.mockExam.count({
        where: { userId },
      }),
      prisma.mockExam.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        select: {
          score: true,
          passingScore: true,
        },
      }),
    ]);

    if (completedExams.length === 0) {
      return {
        totalExams,
        completedExams: 0,
        averageScore: 0,
        passRate: 0,
      };
    }

    const totalScore = completedExams.reduce((sum, exam) => sum + (exam.score || 0), 0);
    const passedExams = completedExams.filter(
      (exam) => (exam.score || 0) >= exam.passingScore
    ).length;

    return {
      totalExams,
      completedExams: completedExams.length,
      averageScore: Math.round(totalScore / completedExams.length),
      passRate: Math.round((passedExams / completedExams.length) * 100),
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
