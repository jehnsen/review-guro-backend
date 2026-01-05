/**
 * Analytics Controller Layer
 * Handles HTTP requests/responses for Analytics endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

export class AnalyticsController {
  /**
   * GET /api/analytics/dashboard
   * Get dashboard overview metrics
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const metrics = await analyticsService.getDashboardMetrics(userId);
      sendSuccess(res, metrics, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/weekly-activity
   * Get weekly activity breakdown
   */
  async getWeeklyActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const activity = await analyticsService.getWeeklyActivity(userId);
      sendSuccess(res, activity, 'Weekly activity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/strengths-weaknesses
   * Get top strengths and weaknesses
   */
  async getStrengthsWeaknesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await analyticsService.getStrengthsWeaknesses(userId);
      sendSuccess(res, data, 'Strengths and weaknesses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/performance-by-category
   * Get detailed performance breakdown by category
   */
  async getPerformanceByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const performance = await analyticsService.getPerformanceByCategory(userId);
      sendSuccess(res, performance, 'Category performance retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/ai-insights
   * Get AI-generated insights and recommendations
   */
  async getAIInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const insights = await analyticsService.generateAIInsights(userId);
      sendSuccess(res, insights, 'AI insights generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/streak
   * Get study streak information
   */
  async getStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const streak = await analyticsService.getStreak(userId);
      sendSuccess(res, streak, 'Streak information retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/time-tracking
   * Get time breakdown by category
   */
  async getTimeTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const timeData = await analyticsService.getTimeTracking(userId);
      sendSuccess(res, timeData, 'Time tracking data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics
   * Get all analytics data (combined endpoint)
   */
  async getAllAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const allData = await analyticsService.getAllAnalytics(userId);
      sendSuccess(res, allData, 'All analytics data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
