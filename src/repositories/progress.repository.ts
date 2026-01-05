/**
 * User Progress Repository
 * Data access layer for UserProgress entity
 */

import { UserProgress, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

class ProgressRepository {
  /**
   * Record a user's answer attempt
   */
  async create(data: Prisma.UserProgressCreateInput): Promise<UserProgress> {
    return prisma.userProgress.create({
      data,
    });
  }

  /**
   * Find progress by user and question
   */
  async findByUserAndQuestion(
    userId: string,
    questionId: string
  ): Promise<UserProgress | null> {
    return prisma.userProgress.findFirst({
      where: {
        userId,
        questionId,
      },
      orderBy: { attemptedAt: 'desc' },
    });
  }

  /**
   * Get all attempts for a user on a specific question
   */
  async findAllAttempts(
    userId: string,
    questionId: string
  ): Promise<UserProgress[]> {
    return prisma.userProgress.findMany({
      where: {
        userId,
        questionId,
      },
      orderBy: { attemptedAt: 'desc' },
    });
  }

  /**
   * Get user's progress summary
   */
  async getUserStats(userId: string): Promise<{
    totalAttempts: number;
    correctAnswers: number;
    accuracy: number;
  }> {
    const totalAttempts = await prisma.userProgress.count({
      where: { userId },
    });

    // isCorrect is a boolean, so we count where it's true
    const correctAnswers = await prisma.userProgress.count({
      where: { userId, isCorrect: true },
    });

    return {
      totalAttempts,
      correctAnswers,
      accuracy: totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0,
    };
  }

  /**
   * Get recent activity for a user
   */
  async getRecentActivity(
    userId: string,
    limit: number = 10
  ): Promise<UserProgress[]> {
    return prisma.userProgress.findMany({
      where: { userId },
      include: { question: true },
      orderBy: { attemptedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get user's progress by category
   * Returns stats for each category the user has attempted
   */
  async getCategoryStats(userId: string): Promise<Array<{
    category: string;
    totalQuestions: number;
    attemptedQuestions: number;
    correctAnswers: number;
    accuracy: number;
  }>> {
    // Get all progress entries with question details
    const progressEntries = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            category: true,
          },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<string, {
      attempted: Set<string>;
      correct: number;
      total: number;
    }>();

    // Process each progress entry
    for (const entry of progressEntries) {
      const category = entry.question.category;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          attempted: new Set(),
          correct: 0,
          total: 0,
        });
      }

      const stats = categoryMap.get(category)!;
      stats.attempted.add(entry.questionId);
      stats.total++;
      if (entry.isCorrect) {
        stats.correct++;
      }
    }

    // Convert to array format
    const result = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      totalQuestions: stats.total,
      attemptedQuestions: stats.attempted.size,
      correctAnswers: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }));

    return result;
  }

  /**
   * Get available questions count per category
   */
  async getAvailableQuestionsByCategory(): Promise<Array<{
    category: string;
    count: number;
  }>> {
    const categories = await prisma.question.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    return categories.map(cat => ({
      category: cat.category,
      count: cat._count.id,
    }));
  }
}

export const progressRepository = new ProgressRepository();
