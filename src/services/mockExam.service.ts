/**
 * MockExam Service Layer
 * Business logic for Mock Examination sessions
 */

import { Difficulty, QuestionCategory, ExamStatus } from '@prisma/client';
import { mockExamRepository } from '../repositories/mockExam.repository';
import { questionRepository } from '../repositories/question.repository';
import { BadRequestError, NotFoundError } from '../utils/errors';
import {
  CreateMockExamDTO,
  MockExamResponse,
  MockExamResultsResponse,
  MockExamHistoryResponse,
  QuestionResponse,
} from '../types';

export class MockExamService {
  /**
   * Create a new mock exam session
   *
   * 1. Validate parameters
   * 2. Fetch random questions based on criteria
   * 3. Create exam session in DB
   * 4. Return exam with questions (no correct answers revealed)
   */
  async createMockExam(userId: string, dto: CreateMockExamDTO): Promise<MockExamResponse> {
    // Validate total questions
    if (dto.totalQuestions < 1 || dto.totalQuestions > 170) {
      throw new BadRequestError('Total questions must be between 1 and 170');
    }

    // Validate time limit
    if (dto.timeLimitMinutes < 1 || dto.timeLimitMinutes > 180) {
      throw new BadRequestError('Time limit must be between 1 and 180 minutes');
    }

    // Validate passing score
    if (dto.passingScore < 0 || dto.passingScore > 100) {
      throw new BadRequestError('Passing score must be between 0 and 100');
    }

    // Build question filters
    const filters: {
      categories?: QuestionCategory[];
      difficulty?: Difficulty;
    } = {};

    if (dto.categories !== 'MIXED' && Array.isArray(dto.categories)) {
      filters.categories = dto.categories;
    }

    if (dto.difficulty) {
      filters.difficulty = dto.difficulty;
    }

    // Fetch questions from database
    const questions = await questionRepository.findRandom(dto.totalQuestions, filters);

    if (questions.length < dto.totalQuestions) {
      throw new BadRequestError(
        `Not enough questions available. Found ${questions.length}, requested ${dto.totalQuestions}`
      );
    }

    // Store question IDs in exam record
    const questionIds = questions.map((q) => q.id);

    // Create exam session
    const exam = await mockExamRepository.create({
      userId,
      totalQuestions: dto.totalQuestions,
      timeLimitMinutes: dto.timeLimitMinutes,
      passingScore: dto.passingScore,
      categories: typeof dto.categories === 'string' ? dto.categories : JSON.stringify(dto.categories),
      difficulty: dto.difficulty,
      questions: JSON.stringify(questionIds),
    });

    // Map questions to response format (hide correct answers and explanations)
    const questionResponses: QuestionResponse[] = questions.map((q) => ({
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options: questionRepository.parseOptions(q.options),
      correctOptionId: '', // Hidden during exam
      explanationText: '', // Hidden during exam
      aiExplanation: '', // Hidden during exam
    }));

    return {
      examId: exam.id,
      totalQuestions: exam.totalQuestions,
      timeLimitMinutes: exam.timeLimitMinutes,
      passingScore: exam.passingScore,
      status: exam.status,
      startedAt: exam.startedAt.toISOString(),
      questions: questionResponses,
    };
  }

  /**
   * Get active mock exam state
   *
   * Returns current exam progress including:
   * - Timer (time remaining)
   * - Saved answers
   * - Flagged questions
   * - Progress stats
   */
  async getExamState(userId: string, examId: string): Promise<{
    examId: string;
    status: ExamStatus;
    totalQuestions: number;
    timeLimitMinutes: number;
    passingScore: number;
    timeRemainingSeconds: number;
    startedAt: string;
    questions: QuestionResponse[];
    answers: Record<string, string>;
    flaggedQuestions: string[];
    progress: {
      answered: number;
      flagged: number;
      unanswered: number;
    };
  }> {
    const exam = await mockExamRepository.findById(examId, userId);

    if (!exam) {
      throw new NotFoundError('Mock exam not found');
    }

    // Calculate time remaining
    const elapsedSeconds = Math.floor(
      (Date.now() - exam.startedAt.getTime()) / 1000
    );
    const totalSeconds = exam.timeLimitMinutes * 60;
    const timeRemainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    // Parse stored data
    const questionIds: string[] = JSON.parse(exam.questions);
    const answers: Record<string, string> = exam.answers ? JSON.parse(exam.answers) : {};
    const flaggedQuestions: string[] = exam.flaggedQuestions ? JSON.parse(exam.flaggedQuestions) : [];

    // Fetch full question details
    const questions = await questionRepository.findByIds(questionIds);

    // Sort questions to match original order
    const orderedQuestions = questionIds.map((id) =>
      questions.find((q) => q.id === id)!
    );

    // Map to response format (hide correct answers during exam)
    const questionResponses: QuestionResponse[] = orderedQuestions.map((q) => ({
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options: questionRepository.parseOptions(q.options),
      correctOptionId: '', // Hidden during exam
      explanationText: '', // Hidden during exam
      aiExplanation: '', // Hidden during exam
    }));

    // Calculate progress
    const answered = Object.keys(answers).length;
    const flagged = flaggedQuestions.length;
    const unanswered = exam.totalQuestions - answered;

    return {
      examId: exam.id,
      status: exam.status,
      totalQuestions: exam.totalQuestions,
      timeLimitMinutes: exam.timeLimitMinutes,
      passingScore: exam.passingScore,
      timeRemainingSeconds,
      startedAt: exam.startedAt.toISOString(),
      questions: questionResponses,
      answers,
      flaggedQuestions,
      progress: {
        answered,
        flagged,
        unanswered,
      },
    };
  }

  /**
   * Save answer for a specific question
   *
   * Allows users to update answers multiple times before submission
   */
  async saveAnswer(
    userId: string,
    examId: string,
    questionId: string,
    selectedOptionId: string
  ): Promise<{
    examId: string;
    questionId: string;
    selectedOptionId: string;
    progress: { answered: number; flagged: number; unanswered: number };
  }> {
    const exam = await mockExamRepository.findById(examId, userId);

    if (!exam) {
      throw new NotFoundError('Mock exam not found');
    }

    if (exam.status !== ExamStatus.IN_PROGRESS) {
      throw new BadRequestError('Cannot modify completed exam');
    }

    // Check if time has expired
    const elapsedSeconds = Math.floor(
      (Date.now() - exam.startedAt.getTime()) / 1000
    );
    const totalSeconds = exam.timeLimitMinutes * 60;
    if (elapsedSeconds >= totalSeconds) {
      throw new BadRequestError('Exam time has expired');
    }

    // Verify question belongs to this exam
    const questionIds: string[] = JSON.parse(exam.questions);
    if (!questionIds.includes(questionId)) {
      throw new BadRequestError('Question does not belong to this exam');
    }

    // Update answers
    const currentAnswers: Record<string, string> = exam.answers ? JSON.parse(exam.answers) : {};
    currentAnswers[questionId] = selectedOptionId;

    await mockExamRepository.updateAnswers(examId, JSON.stringify(currentAnswers));

    // Calculate progress
    const flaggedQuestions: string[] = exam.flaggedQuestions ? JSON.parse(exam.flaggedQuestions) : [];
    const answered = Object.keys(currentAnswers).length;
    const flagged = flaggedQuestions.length;
    const unanswered = exam.totalQuestions - answered;

    return {
      examId,
      questionId,
      selectedOptionId,
      progress: {
        answered,
        flagged,
        unanswered,
      },
    };
  }

  /**
   * Flag or unflag a question for review
   */
  async toggleFlag(
    userId: string,
    examId: string,
    questionId: string,
    flagged: boolean
  ): Promise<{
    examId: string;
    questionId: string;
    flagged: boolean;
    flaggedQuestions: string[];
  }> {
    const exam = await mockExamRepository.findById(examId, userId);

    if (!exam) {
      throw new NotFoundError('Mock exam not found');
    }

    if (exam.status !== ExamStatus.IN_PROGRESS) {
      throw new BadRequestError('Cannot modify completed exam');
    }

    // Verify question belongs to this exam
    const questionIds: string[] = JSON.parse(exam.questions);
    if (!questionIds.includes(questionId)) {
      throw new BadRequestError('Question does not belong to this exam');
    }

    // Update flagged questions
    let flaggedQuestions: string[] = exam.flaggedQuestions ? JSON.parse(exam.flaggedQuestions) : [];

    if (flagged) {
      // Add to flagged list if not already present
      if (!flaggedQuestions.includes(questionId)) {
        flaggedQuestions.push(questionId);
      }
    } else {
      // Remove from flagged list
      flaggedQuestions = flaggedQuestions.filter((id) => id !== questionId);
    }

    await mockExamRepository.updateFlags(examId, JSON.stringify(flaggedQuestions));

    return {
      examId,
      questionId,
      flagged,
      flaggedQuestions,
    };
  }

  /**
   * Complete and submit exam
   *
   * 1. Calculate score
   * 2. Mark as COMPLETED
   * 3. Return results with correct answers
   */
  async submitExam(userId: string, examId: string): Promise<MockExamResultsResponse> {
    const exam = await mockExamRepository.findById(examId, userId);

    if (!exam) {
      throw new NotFoundError('Mock exam not found');
    }

    if (exam.status === ExamStatus.COMPLETED) {
      throw new BadRequestError('Exam already completed');
    }

    if (exam.status === ExamStatus.ABANDONED) {
      throw new BadRequestError('Cannot submit abandoned exam');
    }

    // Parse data
    const questionIds: string[] = JSON.parse(exam.questions);
    const userAnswers: Record<string, string> = exam.answers ? JSON.parse(exam.answers) : {};

    // Fetch questions with correct answers
    const questions = await questionRepository.findByIds(questionIds);

    // Calculate score
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const answerDetails = questionIds.map((qId) => {
      const question = questions.find((q) => q.id === qId)!;
      const userAnswer = userAnswers[qId];

      let isCorrect = false;
      if (userAnswer) {
        isCorrect = userAnswer === question.correctOptionId;
        if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else {
        unansweredCount++;
      }

      return {
        questionId: qId,
        questionText: question.questionText,
        selectedOptionId: userAnswer || null,
        correctOptionId: question.correctOptionId,
        isCorrect,
        options: questionRepository.parseOptions(question.options),
        explanation: question.explanationText || question.aiExplanation || '',
      };
    });

    const score = Math.round((correctCount / exam.totalQuestions) * 100);
    const passed = score >= exam.passingScore;

    // Calculate time spent
    const timeSpentSeconds = Math.floor(
      (Date.now() - exam.startedAt.getTime()) / 1000
    );
    const timeSpentMinutes = Math.round(timeSpentSeconds / 60);

    // Mark exam as completed
    await mockExamRepository.complete(examId, score);

    return {
      examId,
      score,
      passed,
      passingScore: exam.passingScore,
      totalQuestions: exam.totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      timeSpentMinutes,
      completedAt: new Date().toISOString(),
      questions: answerDetails,
    };
  }

  /**
   * Get results for a completed exam
   */
  async getResults(userId: string, examId: string): Promise<MockExamResultsResponse> {
    const exam = await mockExamRepository.findById(examId, userId);

    if (!exam) {
      throw new NotFoundError('Mock exam not found');
    }

    if (exam.status !== ExamStatus.COMPLETED) {
      throw new BadRequestError('Exam is not completed yet');
    }

    // Parse data
    const questionIds: string[] = JSON.parse(exam.questions);
    const userAnswers: Record<string, string> = exam.answers ? JSON.parse(exam.answers) : {};

    // Fetch questions
    const questions = await questionRepository.findByIds(questionIds);

    // Build answer details
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const answerDetails = questionIds.map((qId) => {
      const question = questions.find((q) => q.id === qId)!;
      const userAnswer = userAnswers[qId];

      let isCorrect = false;
      if (userAnswer) {
        isCorrect = userAnswer === question.correctOptionId;
        if (isCorrect) correctCount++;
        else incorrectCount++;
      } else {
        unansweredCount++;
      }

      return {
        questionId: qId,
        questionText: question.questionText,
        selectedOptionId: userAnswer || null,
        correctOptionId: question.correctOptionId,
        isCorrect,
        options: questionRepository.parseOptions(question.options),
        explanation: question.explanationText || question.aiExplanation || '',
      };
    });

    // Calculate time spent
    const timeSpentSeconds = exam.completedAt
      ? Math.floor((exam.completedAt.getTime() - exam.startedAt.getTime()) / 1000)
      : 0;
    const timeSpentMinutes = Math.round(timeSpentSeconds / 60);

    return {
      examId,
      score: exam.score || 0,
      passed: (exam.score || 0) >= exam.passingScore,
      passingScore: exam.passingScore,
      totalQuestions: exam.totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      timeSpentMinutes,
      completedAt: exam.completedAt?.toISOString() || '',
      questions: answerDetails,
    };
  }

  /**
   * Get user's exam history
   */
  async getHistory(
    userId: string,
    filters?: { status?: ExamStatus; limit?: number }
  ): Promise<MockExamHistoryResponse> {
    const exams = await mockExamRepository.findByUserId(userId, filters);
    const stats = await mockExamRepository.getUserExamStats(userId);

    const examList = exams.map((exam) => ({
      examId: exam.id,
      totalQuestions: exam.totalQuestions,
      timeLimitMinutes: exam.timeLimitMinutes,
      passingScore: exam.passingScore,
      categories: exam.categories,
      status: exam.status,
      score: exam.score,
      passed: exam.score ? exam.score >= exam.passingScore : null,
      startedAt: exam.startedAt.toISOString(),
      completedAt: exam.completedAt?.toISOString() || null,
    }));

    return {
      exams: examList,
      totalCompleted: stats.totalCompleted,
      averageScore: stats.averageScore,
      passRate: stats.passRate,
    };
  }

  /**
   * Abandon an in-progress exam
   */
  async abandonExam(userId: string, examId: string): Promise<{ examId: string; status: ExamStatus }> {
    const exam = await mockExamRepository.findById(examId, userId);

    if (!exam) {
      throw new NotFoundError('Mock exam not found');
    }

    if (exam.status !== ExamStatus.IN_PROGRESS) {
      throw new BadRequestError('Only in-progress exams can be abandoned');
    }

    await mockExamRepository.abandon(examId);

    return {
      examId,
      status: ExamStatus.ABANDONED,
    };
  }

  /**
   * Check for in-progress exam
   * Returns the most recent in-progress exam if one exists
   */
  async getInProgressExam(userId: string): Promise<{
    hasInProgressExam: boolean;
    examId?: string;
    startedAt?: string;
    timeRemainingSeconds?: number;
  }> {
    const exams = await mockExamRepository.findByUserId(userId, {
      status: ExamStatus.IN_PROGRESS,
      limit: 1,
    });

    if (exams.length === 0) {
      return { hasInProgressExam: false };
    }

    const exam = exams[0];

    // Calculate time remaining
    const elapsedSeconds = Math.floor(
      (Date.now() - exam.startedAt.getTime()) / 1000
    );
    const totalSeconds = exam.timeLimitMinutes * 60;
    const timeRemainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    // If time has expired, auto-abandon the exam
    if (timeRemainingSeconds === 0) {
      await mockExamRepository.abandon(exam.id);
      return { hasInProgressExam: false };
    }

    return {
      hasInProgressExam: true,
      examId: exam.id,
      startedAt: exam.startedAt.toISOString(),
      timeRemainingSeconds,
    };
  }
}

export const mockExamService = new MockExamService();
