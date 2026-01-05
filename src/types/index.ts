/**
 * Type definitions for ReviewGuro API
 * Strictly typed interfaces - No `any` types allowed
 */

import { UserRole, Difficulty, QuestionCategory, ExamStatus } from '@prisma/client';

export { ExamStatus };

// ============================================
// API Response Types
// ============================================

/**
 * Standardized API Response interface for consistent JSON responses
 * All API endpoints should return this structure
 */
export interface APIResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  cached?: boolean;
  cacheKey?: string;
}

// ============================================
// Authentication Types
// ============================================

export interface RegisterDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  expiresIn: string;
}

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  isPremium: boolean;
  premiumExpiry: Date | null;
  createdAt: Date;
}

// ============================================
// Question Types
// ============================================

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionFilters {
  category?: QuestionCategory;
  difficulty?: Difficulty;
  page?: number;
  limit?: number;
}

export interface QuestionResponse {
  id: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  questionText: string;
  options: QuestionOption[];
  correctOptionId?: string;
  explanationText?: string;
  aiExplanation?: string;
}

export interface QuestionWithAnswer extends QuestionResponse {
  correctOptionId: string;
  explanationText: string | null;
}

// ============================================
// Practice/Interaction Types
// ============================================

export interface SubmitAnswerDTO {
  questionId: string;
  selectedOptionId: string;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctOptionId: string;
  selectedOptionId: string;
  explanation: string | null;
  pointsEarned: number;
}

export interface ExplainRequestDTO {
  questionId: string;
}

export interface ExplainResponse {
  questionId: string;
  explanation: string;
  source: 'database' | 'cache' | 'ai_generated';
}

// ============================================
// Progress Types
// ============================================

export interface CategoryProgress {
  category: QuestionCategory;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  accuracy: number;
  questionsAvailable: number;
}

export interface CategoryProgressResponse {
  categories: CategoryProgress[];
  overallStats: {
    totalAttempts: number;
    correctAnswers: number;
    accuracy: number;
  };
}

// ============================================
// Mock Exam Types
// ============================================

export interface CreateMockExamDTO {
  totalQuestions: number;
  timeLimitMinutes: number;
  passingScore: number;
  categories: QuestionCategory[] | 'MIXED';
  difficulty?: Difficulty;
}

export interface MockExamSession {
  id: string;
  userId: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  passingScore: number;
  categories: string; // JSON stringified array or 'MIXED'
  difficulty: Difficulty | null;
  status: ExamStatus;
  startedAt: Date;
  completedAt: Date | null;
  timeRemainingSeconds: number | null;
  questions: string; // JSON stringified array of question IDs
  answers: string; // JSON stringified object { questionId: selectedOptionId }
  flaggedQuestions: string; // JSON stringified array of question IDs
  score: number | null;
}

export interface MockExamAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  correctOptionId: string;
}

export interface SubmitMockExamAnswerDTO {
  examId: string;
  questionId: string;
  selectedOptionId: string;
}

export interface FlagQuestionDTO {
  examId: string;
  questionId: string;
  flagged: boolean;
}

export interface CompleteMockExamResponse {
  examId: string;
  score: number;
  passed: boolean;
  passingScore: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  timeSpentMinutes: number;
  answers: MockExamAnswer[];
}

export interface GetMockExamResponse {
  examId: string;
  status: ExamStatus;
  totalQuestions: number;
  timeLimitMinutes: number;
  passingScore: number;
  timeRemainingSeconds: number;
  startedAt: Date;
  questions: QuestionResponse[];
  answers: Record<string, string>;
  flaggedQuestions: string[];
  progress: {
    answered: number;
    flagged: number;
    unanswered: number;
  };
}

export interface MockExamResponse {
  examId: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  passingScore: number;
  status: ExamStatus;
  startedAt: string;
  questions: QuestionResponse[];
}

export interface MockExamResultsResponse {
  examId: string;
  score: number;
  passed: boolean;
  passingScore: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  timeSpentMinutes: number;
  completedAt: string;
  questions: Array<{
    questionId: string;
    questionText: string;
    selectedOptionId: string | null;
    correctOptionId: string;
    isCorrect: boolean;
    options: QuestionOption[];
    explanation: string;
  }>;
}

export interface MockExamHistoryResponse {
  exams: Array<{
    examId: string;
    totalQuestions: number;
    timeLimitMinutes: number;
    passingScore: number;
    categories: string;
    status: ExamStatus;
    score: number | null;
    passed: boolean | null;
    startedAt: string;
    completedAt: string | null;
  }>;
  totalCompleted: number;
  averageScore: number;
  passRate: number;
}

// ============================================
// Cache Types
// ============================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface CachedData<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Error Types
// ============================================

export interface AppErrorDetails {
  code: string;
  field?: string;
  message: string;
}

// ============================================
// Request Types (Express Extensions)
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
