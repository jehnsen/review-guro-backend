/**
 * Question Repository
 * Data access layer for Question entity
 */

import { Question, Prisma, Difficulty, QuestionCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { QuestionFilters, PaginatedResult, QuestionOption } from '../types';

class QuestionRepository {
  /**
   * Find question by ID
   */
  async findById(id: string): Promise<Question | null> {
    return prisma.question.findUnique({
      where: { id },
    });
  }

  /**
   * Find questions with pagination and filters
   */
  async findMany(filters: QuestionFilters): Promise<PaginatedResult<Question>> {
    const { category, difficulty, page = 1, limit = 10 } = filters;

    // Build where clause dynamically
    const where: Prisma.QuestionWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    // Execute count and findMany in parallel for efficiency
    const [total, items] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new question
   */
  async create(data: Prisma.QuestionCreateInput): Promise<Question> {
    return prisma.question.create({
      data,
    });
  }

  /**
   * Update question by ID
   */
  async update(id: string, data: Prisma.QuestionUpdateInput): Promise<Question> {
    return prisma.question.update({
      where: { id },
      data,
    });
  }

  /**
   * Update AI explanation for a question
   */
  async updateAIExplanation(id: string, explanation: string): Promise<Question> {
    return prisma.question.update({
      where: { id },
      data: { aiExplanation: explanation },
    });
  }

  /**
   * Delete question by ID
   */
  async delete(id: string): Promise<Question> {
    return prisma.question.delete({
      where: { id },
    });
  }

  /**
   * Get random questions for practice
   */
  async getRandomQuestions(
    count: number,
    filters?: { category?: QuestionCategory; difficulty?: Difficulty }
  ): Promise<Question[]> {
    const where: Prisma.QuestionWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    // Get total count matching filters
    const total = await prisma.question.count({ where });

    if (total === 0) {
      return [];
    }

    // Generate random skip value
    const skip = Math.max(0, Math.floor(Math.random() * (total - count)));

    return prisma.question.findMany({
      where,
      skip,
      take: count,
    });
  }

  /**
   * Find random questions with multiple category support
   * Used for mock exams
   *
   * PERFORMANCE OPTIMIZATION:
   * Instead of fetching all 50,000+ questions into memory and shuffling,
   * we use a two-phase approach:
   * 1. Get total count matching filters
   * 2. Generate random offsets and fetch questions at those positions
   *
   * This reduces memory usage from O(n) to O(count) and eliminates
   * expensive in-memory sorting operations
   */
  async findRandom(
    count: number,
    filters?: {
      categories?: QuestionCategory[];
      difficulty?: Difficulty;
    }
  ): Promise<Question[]> {
    const where: Prisma.QuestionWhereInput = {};

    if (filters?.categories && filters.categories.length > 0) {
      where.category = {
        in: filters.categories,
      };
    }

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    // Phase 1: Get total count matching filters
    const total = await prisma.question.count({ where });

    if (total === 0) {
      return [];
    }

    if (total <= count) {
      // If total questions <= requested count, just return all of them
      return prisma.question.findMany({ where });
    }

    // Phase 2: Generate random unique indices using Fisher-Yates sampling
    const indices = this.generateRandomIndices(total, count);

    // Phase 3: Fetch questions using multiple queries with skip/take
    // This is more efficient than ORDER BY RANDOM() which scans the entire table
    const questions = await Promise.all(
      indices.map((index) =>
        prisma.question.findMany({
          where,
          skip: index,
          take: 1,
        })
      )
    );

    // Flatten results (each query returns array of 1 question)
    return questions.flat();
  }

  /**
   * Generate N unique random indices from range [0, max)
   * Uses Fisher-Yates partial shuffle algorithm
   * Time complexity: O(count), Space complexity: O(count)
   */
  private generateRandomIndices(max: number, count: number): number[] {
    const indices = new Set<number>();

    // For small counts relative to max, random sampling is efficient
    // For large counts (>50% of max), we'd use different strategy
    while (indices.size < count) {
      const randomIndex = Math.floor(Math.random() * max);
      indices.add(randomIndex);
    }

    return Array.from(indices);
  }

  /**
   * Find questions by array of IDs
   * Used for retrieving mock exam questions
   */
  async findByIds(ids: string[]): Promise<Question[]> {
    return prisma.question.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  /**
   * Parse options from JSON to typed array
   */
  parseOptions(options: Prisma.JsonValue): QuestionOption[] {
    if (!Array.isArray(options)) {
      return [];
    }

    return options.map((opt) => {
      const option = opt as { id?: string; text?: string };
      return {
        id: String(option.id ?? ''),
        text: String(option.text ?? ''),
      };
    });
  }
}

export const questionRepository = new QuestionRepository();
