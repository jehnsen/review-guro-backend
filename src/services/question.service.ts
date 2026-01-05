/**
 * Question Service
 * Business logic for questions with Redis caching
 *
 * CACHE-ASIDE PATTERN IMPLEMENTATION:
 * This service implements the cache-aside (lazy loading) pattern for questions.
 *
 * How it works:
 * 1. When a request comes in, we first check Redis for cached data
 * 2. If data exists in cache (HIT) -> return immediately without DB query
 * 3. If data doesn't exist (MISS) -> query PostgreSQL
 * 4. Store the DB result in Redis with TTL for future requests
 * 5. Return the data
 *
 * Benefits:
 * - Reduces database load for frequently accessed questions
 * - Improves response time (Redis is ~10x faster than PostgreSQL for reads)
 * - TTL ensures data eventually refreshes from source of truth (DB)
 */

import { Question, Difficulty, QuestionCategory } from '@prisma/client';
import { questionRepository } from '../repositories/question.repository';
import { cacheService } from './cache.service';
import { config } from '../config/env';
import {
  QuestionFilters,
  QuestionResponse,
  QuestionWithAnswer,
  PaginatedResult,
} from '../types';
import { generateFilterHash } from '../utils/hash';
import { NotFoundError } from '../utils/errors';

// Cache key prefix for questions
const CACHE_PREFIX = 'questions';

class QuestionService {
  /**
   * Get paginated questions with optional filters
   * Implements Cache-Aside pattern
   *
   * @param filters - Filter parameters (category, difficulty, page, limit)
   * @returns Paginated questions with cache metadata
   */
  async getQuestions(
    filters: QuestionFilters
  ): Promise<{ result: PaginatedResult<QuestionResponse>; cached: boolean; cacheKey: string }> {
    // Normalize filters with defaults
    const normalizedFilters: QuestionFilters = {
      category: filters.category,
      difficulty: filters.difficulty,
      page: filters.page ?? 1,
      limit: Math.min(filters.limit ?? 10, 100), // Cap at 100 per page
    };

    /**
     * STEP 1: Generate unique cache key based on filter parameters
     *
     * The hash ensures that different filter combinations get different cache entries.
     * Example: questions:a1b2c3d4 for category=VERBAL_ABILITY&page=1
     *          questions:e5f6g7h8 for category=NUMERICAL_ABILITY&page=1
     */
    const filterHash = generateFilterHash(normalizedFilters);
    const cacheKey = `${CACHE_PREFIX}:${filterHash}`;

    /**
     * STEP 2: Check Redis cache first (Cache-Aside Read)
     *
     * This is the "aside" part - we look beside the main data store (PostgreSQL)
     * to check if we have a cached copy.
     */
    const cached = await cacheService.get<PaginatedResult<QuestionResponse>>(cacheKey);

    if (cached !== null) {
      /**
       * CACHE HIT!
       * Data was found in Redis. Return immediately without hitting PostgreSQL.
       * This dramatically reduces response time and database load.
       */
      console.log(`[CACHE HIT] Key: ${cacheKey}`);
      return { result: cached, cached: true, cacheKey };
    }

    /**
     * CACHE MISS
     * Data not in Redis. Need to fetch from PostgreSQL.
     */
    console.log(`[CACHE MISS] Key: ${cacheKey} - Fetching from database`);

    /**
     * STEP 3: Query PostgreSQL for the data
     */
    const dbResult = await questionRepository.findMany(normalizedFilters);

    // Transform to response format (remove sensitive fields like correctOptionId)
    const responseItems: QuestionResponse[] = dbResult.items.map((q) =>
      this.toQuestionResponse(q)
    );

    const result: PaginatedResult<QuestionResponse> = {
      items: responseItems,
      meta: dbResult.meta,
    };

    /**
     * STEP 4: Store in Redis cache for future requests
     *
     * TTL (Time To Live) is set to 1 hour by default.
     * After TTL expires, the next request will fetch fresh data from DB.
     * This ensures cached data doesn't become too stale.
     */
    await cacheService.set(cacheKey, result, {
      ttl: config.cache.questionsTTL, // 1 hour (3600 seconds)
    });

    console.log(`[CACHE SET] Key: ${cacheKey} - TTL: ${config.cache.questionsTTL}s`);

    /**
     * STEP 5: Return the fresh data
     */
    return { result, cached: false, cacheKey };
  }

  /**
   * Get a single question by ID (for practice/submission)
   */
  async getQuestionById(id: string): Promise<QuestionWithAnswer> {
    const cacheKey = `question:${id}`;

    // Check cache first
    const cached = await cacheService.get<QuestionWithAnswer>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const question = await questionRepository.findById(id);

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    const result = this.toQuestionWithAnswer(question);

    // Cache for 1 hour
    await cacheService.set(cacheKey, result, {
      ttl: config.cache.questionsTTL,
    });

    return result;
  }

  /**
   * Invalidate question caches
   * Call this when questions are created, updated, or deleted
   */
  async invalidateCache(): Promise<void> {
    /**
     * When questions are modified, we need to invalidate all cached query results.
     * The pattern 'questions:*' matches all keys that start with 'questions:'
     */
    await cacheService.deleteByPattern('questions:*');
    await cacheService.deleteByPattern('question:*');
    console.log('[CACHE INVALIDATED] All question caches cleared');
  }

  /**
   * Transform Question entity to public response (hide correct answer)
   */
  private toQuestionResponse(question: Question): QuestionResponse {
    return {
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      questionText: question.questionText,
      options: questionRepository.parseOptions(question.options),
    };
  }

  /**
   * Transform Question entity to full response (include correct answer)
   */
  private toQuestionWithAnswer(question: Question): QuestionWithAnswer {
    return {
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      questionText: question.questionText,
      options: questionRepository.parseOptions(question.options),
      correctOptionId: question.correctOptionId,
      explanationText: question.explanationText,
    };
  }
}

export const questionService = new QuestionService();
