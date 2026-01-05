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

    // Get all matching questions
    const allQuestions = await prisma.question.findMany({ where });

    // Shuffle and take requested count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
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
