/**
 * Practice Service
 * Business logic for practice sessions and answer submissions
 */

import { QuestionCategory } from '@prisma/client';
import { questionRepository } from '../repositories/question.repository';
import { progressRepository } from '../repositories/progress.repository';
import { dailyPracticeUsageRepository } from '../repositories/dailyPracticeUsage.repository';
import { userRepository } from '../repositories/user.repository';
import { aiService } from './ai.service';
import { cacheService } from './cache.service';
import { streakService } from './streak.service';
import { config } from '../config/env';
import {
  SubmitAnswerDTO,
  SubmitAnswerResponse,
  ExplainRequestDTO,
  ExplainResponse,
  CategoryProgressResponse,
  CategoryProgress,
} from '../types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { getUserAccessLimits, exceedsLimit } from '../utils/accessControl';

// Points awarded based on difficulty
const POINTS_BY_DIFFICULTY = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
} as const;

class PracticeService {
  /**
   * Submit an answer for a question
   *
   * @param userId - The authenticated user's ID
   * @param dto - Answer submission data
   * @returns Feedback with correct answer and explanation
   */
  async submitAnswer(
    userId: string,
    dto: SubmitAnswerDTO
  ): Promise<SubmitAnswerResponse> {
    const { questionId, selectedOptionId } = dto;

    // Get user to check premium status
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check free tier limits
    const accessLimits = getUserAccessLimits(user);
    const todayCount = await dailyPracticeUsageRepository.getTodayCount(userId);

    if (exceedsLimit(todayCount, accessLimits.practiceLimitPerDay)) {
      throw new ForbiddenError(
        `Daily practice limit reached. Free users can answer up to ${accessLimits.practiceLimitPerDay} questions per day. Upgrade to Season Pass for unlimited access.`
      );
    }

    // Fetch the question
    const question = await questionRepository.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Validate that selectedOptionId is a valid option
    const options = questionRepository.parseOptions(question.options);
    const isValidOption = options.some((opt) => opt.id === selectedOptionId);
    if (!isValidOption) {
      throw new BadRequestError('Invalid option selected');
    }

    // Check if answer is correct
    const isCorrect = selectedOptionId === question.correctOptionId;

    // Calculate points earned
    const pointsEarned = isCorrect ? POINTS_BY_DIFFICULTY[question.difficulty] : 0;

    // Record the attempt in UserProgress
    await progressRepository.create({
      user: { connect: { id: userId } },
      question: { connect: { id: questionId } },
      selectedOptionId,
      isCorrect,
    });

    // Increment daily practice count for free tier users
    if (!accessLimits.canAccessPremiumFeatures) {
      await dailyPracticeUsageRepository.incrementTodayCount(userId);
    }

    // Update user's streak (activity tracking)
    await streakService.updateStreak(userId);

    return {
      isCorrect,
      correctOptionId: question.correctOptionId,
      selectedOptionId,
      explanation: question.explanationText,
      pointsEarned,
    };
  }

  /**
   * Get AI-powered explanation for a question
   * Implements caching to avoid redundant AI calls
   *
   * Logic:
   * 1. Check if question has a stored AI explanation in DB
   * 2. If not in DB, check Redis cache
   * 3. If not in cache, generate new explanation via AI service
   * 4. Store generated explanation in both DB and cache
   *
   * @param dto - Request containing questionId
   * @returns Explanation with source information
   */
  async getExplanation(dto: ExplainRequestDTO): Promise<ExplainResponse> {
    const { questionId } = dto;

    // Fetch the question
    const question = await questionRepository.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Check if we have a stored AI explanation in the database
    if (question.aiExplanation) {
      return {
        questionId,
        explanation: question.aiExplanation,
        source: 'database',
      };
    }

    // Check Redis cache for previously generated explanation
    const cacheKey = `explanation:${questionId}`;
    const cachedExplanation = await cacheService.get<string>(cacheKey);

    if (cachedExplanation) {
      return {
        questionId,
        explanation: cachedExplanation,
        source: 'cache',
      };
    }

    // No cached explanation found - generate new one via AI
    const aiResult = await aiService.generateExplanation(question);
    const explanation = aiResult.explanation;

    // Store in database for permanent access
    await questionRepository.updateAIExplanation(questionId, explanation);

    // Also cache in Redis for faster subsequent access
    await cacheService.set(cacheKey, explanation, {
      ttl: config.cache.explanationsTTL, // 24 hours
    });

    return {
      questionId,
      explanation,
      source: 'ai_generated',
    };
  }

  /**
   * Get user's practice statistics
   */
  async getUserStats(userId: string): Promise<{
    totalAttempts: number;
    correctAnswers: number;
    accuracy: number;
  }> {
    return progressRepository.getUserStats(userId);
  }

  /**
   * Get daily practice limits and usage for the user
   */
  async getDailyLimits(userId: string): Promise<{
    isPremium: boolean;
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accessLimits = getUserAccessLimits(user);
    const usedToday = await dailyPracticeUsageRepository.getTodayCount(userId);

    const dailyLimit = accessLimits.practiceLimitPerDay === Infinity
      ? -1 // Use -1 to represent unlimited
      : accessLimits.practiceLimitPerDay;

    const remainingToday = accessLimits.practiceLimitPerDay === Infinity
      ? -1 // Use -1 to represent unlimited
      : Math.max(0, accessLimits.practiceLimitPerDay - usedToday);

    return {
      isPremium: accessLimits.canAccessPremiumFeatures,
      dailyLimit,
      usedToday,
      remainingToday,
    };
  }

  /**
   * Get user's progress by category
   * Returns percentage accuracy and question counts for each category
   * Matches the UI shown in the screenshot
   */
  async getCategoryProgress(userId: string): Promise<CategoryProgressResponse> {
    // Get user's stats per category
    const categoryStats = await progressRepository.getCategoryStats(userId);

    // Get available questions per category
    const availableQuestions = await progressRepository.getAvailableQuestionsByCategory();

    // Create a map for quick lookup
    const availableMap = new Map(
      availableQuestions.map(q => [q.category, q.count])
    );

    // Build category progress array for ALL categories (even if not attempted)
    const allCategories = Object.values(QuestionCategory);

    const categories: CategoryProgress[] = allCategories.map(category => {
      const stats = categoryStats.find(s => s.category === category);
      const questionsAvailable = availableMap.get(category) || 0;

      return {
        category,
        totalQuestions: stats?.totalQuestions || 0,
        attemptedQuestions: stats?.attemptedQuestions || 0,
        correctAnswers: stats?.correctAnswers || 0,
        accuracy: stats?.accuracy || 0,
        questionsAvailable,
      };
    });

    // Get overall stats
    const overallStats = await progressRepository.getUserStats(userId);

    return {
      categories,
      overallStats,
    };
  }
}

export const practiceService = new PracticeService();
