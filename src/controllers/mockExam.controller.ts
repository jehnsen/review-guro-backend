/**
 * MockExam Controller Layer
 * Handles HTTP requests/responses for Mock Exam endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { mockExamService } from '../services/mockExam.service';
import { sendSuccess } from '../utils/response';
import { CreateMockExamDTO } from '../types';
import { ExamStatus } from '@prisma/client';

export class MockExamController {
  /**
   * POST /api/mock-exams
   * Create a new mock exam session
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dto: CreateMockExamDTO = req.body;

      const exam = await mockExamService.createMockExam(userId, dto);

      sendSuccess(res, exam, 'Mock exam created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mock-exams/:examId
   * Get current exam state
   */
  async getState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { examId } = req.params;

      const examState = await mockExamService.getExamState(userId, examId);

      sendSuccess(res, examState, 'Mock exam retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mock-exams/:examId/answers
   * Save answer for a question
   */
  async saveAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { examId } = req.params;
      const { questionId, selectedOptionId } = req.body;

      const result = await mockExamService.saveAnswer(
        userId,
        examId,
        questionId,
        selectedOptionId
      );

      sendSuccess(res, result, 'Answer saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/mock-exams/:examId/flag
   * Flag or unflag a question
   */
  async toggleFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { examId } = req.params;
      const { questionId, flagged } = req.body;

      const result = await mockExamService.toggleFlag(userId, examId, questionId, flagged);

      const message = flagged ? 'Question flagged successfully' : 'Question unflagged successfully';
      sendSuccess(res, result, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mock-exams/:examId/submit
   * Complete and submit exam
   */
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { examId } = req.params;

      const results = await mockExamService.submitExam(userId, examId);

      sendSuccess(res, results, 'Mock exam completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mock-exams/:examId/results
   * Get results for a completed exam
   */
  async getResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { examId } = req.params;

      const results = await mockExamService.getResults(userId, examId);

      sendSuccess(res, results, 'Results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mock-exams/history
   * Get user's exam history
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, limit } = req.query;

      const filters: { status?: ExamStatus; limit?: number } = {};

      if (status && typeof status === 'string') {
        filters.status = status as ExamStatus;
      }

      if (limit && typeof limit === 'string') {
        filters.limit = parseInt(limit, 10);
      }

      const history = await mockExamService.getHistory(userId, filters);

      sendSuccess(res, history, 'Exam history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mock-exams/:examId/abandon
   * Abandon an in-progress exam
   */
  async abandon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { examId } = req.params;

      const result = await mockExamService.abandonExam(userId, examId);

      sendSuccess(res, result, 'Exam marked as abandoned');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mock-exams/in-progress
   * Check if user has an in-progress exam
   */
  async checkInProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const result = await mockExamService.getInProgressExam(userId);

      sendSuccess(res, result, 'In-progress exam check completed');
    } catch (error) {
      next(error);
    }
  }
}

export const mockExamController = new MockExamController();
