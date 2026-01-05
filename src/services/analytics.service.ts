/**
 * Analytics Service Layer
 * Business logic for analytics and insights
 */

import { analyticsRepository } from '../repositories/analytics.repository';
import { QuestionCategory } from '@prisma/client';

export interface DashboardMetrics {
  totalQuestions: number;
  accuracy: number;
  studyTime: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  };
  streak: {
    current: number;
    longest: number;
  };
  mockExams: {
    total: number;
    completed: number;
    averageScore: number;
    passRate: number;
  };
}

export interface WeeklyActivityData {
  labels: string[];
  data: Array<{
    date: string;
    day: string;
    questionsAttempted: number;
    correctAnswers: number;
    accuracy: number;
  }>;
}

export interface StrengthsWeaknessesData {
  strengths: Array<{
    category: QuestionCategory;
    accuracy: number;
    totalAttempted: number;
  }>;
  weaknesses: Array<{
    category: QuestionCategory;
    accuracy: number;
    totalAttempted: number;
    recommendation: string;
  }>;
}

export interface CategoryPerformance {
  category: QuestionCategory;
  totalAttempted: number;
  correctAnswers: number;
  accuracy: number;
  averageDifficulty: string;
  status: 'excellent' | 'good' | 'needs_improvement';
}

export interface AIInsights {
  overallAssessment: string;
  recommendations: string[];
  focusAreas: QuestionCategory[];
  encouragement: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakStatus: 'active' | 'at_risk' | 'broken';
  daysUntilBreak: number;
}

export interface TimeTracking {
  totalMinutes: number;
  hours: number;
  breakdown: Array<{
    category: QuestionCategory;
    timeSpentMinutes: number;
    percentage: number;
  }>;
}

export class AnalyticsService {
  /**
   * Get dashboard overview metrics
   */
  async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    const [totalQuestions, accuracy, studyTimeMinutes, streak, mockExamStats] =
      await Promise.all([
        analyticsRepository.getTotalQuestionsAttempted(userId),
        analyticsRepository.getOverallAccuracy(userId),
        analyticsRepository.getTotalStudyTimeMinutes(userId),
        analyticsRepository.getStudyStreak(userId),
        analyticsRepository.getMockExamStats(userId),
      ]);

    return {
      totalQuestions,
      accuracy,
      studyTime: {
        hours: Math.floor(studyTimeMinutes / 60),
        minutes: studyTimeMinutes % 60,
        totalMinutes: studyTimeMinutes,
      },
      streak: {
        current: streak.currentStreak,
        longest: streak.longestStreak,
      },
      mockExams: {
        total: mockExamStats.totalExams,
        completed: mockExamStats.completedExams,
        averageScore: mockExamStats.averageScore,
        passRate: mockExamStats.passRate,
      },
    };
  }

  /**
   * Get weekly activity data
   */
  async getWeeklyActivity(userId: string): Promise<WeeklyActivityData> {
    const weeklyData = await analyticsRepository.getWeeklyActivity(userId);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const data = weeklyData.map((day) => {
      const date = new Date(day.date);
      return {
        date: day.date,
        day: dayNames[date.getDay()],
        questionsAttempted: day.questionsAttempted,
        correctAnswers: day.correctAnswers,
        accuracy: day.accuracy,
      };
    });

    return {
      labels: data.map((d) => d.day),
      data,
    };
  }

  /**
   * Get strengths and weaknesses
   */
  async getStrengthsWeaknesses(userId: string): Promise<StrengthsWeaknessesData> {
    const performance = await analyticsRepository.getPerformanceByCategory(userId);

    // Filter categories with at least 5 attempts for meaningful analysis
    const meaningfulPerformance = performance.filter((p) => p.totalAttempted >= 5);

    // Sort by accuracy
    const sorted = [...meaningfulPerformance].sort((a, b) => b.accuracy - a.accuracy);

    // Top 3 = strengths
    const strengths = sorted.slice(0, 3).map((p) => ({
      category: p.category,
      accuracy: p.accuracy,
      totalAttempted: p.totalAttempted,
    }));

    // Bottom 3 = weaknesses
    const weaknesses = sorted
      .slice(-3)
      .reverse()
      .map((p) => ({
        category: p.category,
        accuracy: p.accuracy,
        totalAttempted: p.totalAttempted,
        recommendation: this.generateRecommendation(p.category, p.accuracy),
      }));

    return {
      strengths,
      weaknesses,
    };
  }

  /**
   * Get detailed performance by category
   */
  async getPerformanceByCategory(userId: string): Promise<CategoryPerformance[]> {
    const performance = await analyticsRepository.getPerformanceByCategory(userId);

    return performance.map((p) => ({
      category: p.category,
      totalAttempted: p.totalAttempted,
      correctAnswers: p.correctAnswers,
      accuracy: p.accuracy,
      averageDifficulty: p.averageDifficulty,
      status: this.determineStatus(p.accuracy),
    }));
  }

  /**
   * Generate AI insights based on user performance
   */
  async generateAIInsights(userId: string): Promise<AIInsights> {
    const [metrics, performance, streak] = await Promise.all([
      this.getDashboardMetrics(userId),
      analyticsRepository.getPerformanceByCategory(userId),
      analyticsRepository.getStudyStreak(userId),
    ]);

    // Overall assessment
    let overallAssessment = '';
    if (metrics.accuracy >= 80) {
      overallAssessment = `Excellent work! You're performing at a high level with ${metrics.accuracy}% accuracy across ${metrics.totalQuestions} questions.`;
    } else if (metrics.accuracy >= 60) {
      overallAssessment = `Good progress! You have ${metrics.accuracy}% accuracy. With focused practice, you can reach excellence.`;
    } else {
      overallAssessment = `You're building your foundation with ${metrics.totalQuestions} questions attempted. Consistent practice will improve your ${metrics.accuracy}% accuracy.`;
    }

    // Recommendations
    const recommendations: string[] = [];

    if (streak.currentStreak === 0) {
      recommendations.push('Start a study streak today! Daily practice builds momentum.');
    } else if (streak.currentStreak < 7) {
      recommendations.push(
        `Keep your ${streak.currentStreak}-day streak going! Aim for 7 consecutive days.`
      );
    }

    if (metrics.totalQuestions < 50) {
      recommendations.push('Try to complete at least 10 questions per day to build mastery.');
    }

    if (metrics.mockExams.completed === 0) {
      recommendations.push('Take your first mock exam to simulate real test conditions.');
    } else if (metrics.mockExams.passRate < 70) {
      recommendations.push(
        'Focus on weak areas before taking more mock exams to improve your pass rate.'
      );
    }

    // Focus areas (weakest categories)
    const sortedPerformance = [...performance].sort((a, b) => a.accuracy - b.accuracy);
    const focusAreas = sortedPerformance
      .slice(0, 2)
      .map((p) => p.category)
      .filter((cat) => cat !== undefined) as QuestionCategory[];

    if (focusAreas.length > 0) {
      recommendations.push(
        `Dedicate more time to ${focusAreas.map((c) => this.formatCategoryName(c)).join(' and ')}.`
      );
    }

    // Encouragement
    let encouragement = '';
    if (streak.currentStreak >= 7) {
      encouragement = `Amazing ${streak.currentStreak}-day streak! Your consistency is paying off. 🔥`;
    } else if (metrics.accuracy >= 80) {
      encouragement = 'Your high accuracy shows strong understanding. Keep it up!';
    } else if (metrics.totalQuestions >= 100) {
      encouragement = `You've practiced ${metrics.totalQuestions} questions! Your dedication is impressive.`;
    } else {
      encouragement = 'Every question brings you closer to your goal. Stay consistent!';
    }

    return {
      overallAssessment,
      recommendations: recommendations.slice(0, 4), // Max 4 recommendations
      focusAreas,
      encouragement,
    };
  }

  /**
   * Get streak information
   */
  async getStreak(userId: string): Promise<StreakData> {
    const streak = await analyticsRepository.getStudyStreak(userId);

    // Determine streak status
    let streakStatus: 'active' | 'at_risk' | 'broken' = 'broken';
    let daysUntilBreak = 0;

    if (streak.lastActivityDate) {
      const lastActivity = new Date(streak.lastActivityDate);
      const now = new Date();
      const hoursSinceActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
      );

      if (hoursSinceActivity < 24) {
        streakStatus = 'active';
        daysUntilBreak = 1;
      } else if (hoursSinceActivity < 48) {
        streakStatus = 'at_risk';
        daysUntilBreak = 0;
      }
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
      streakStatus,
      daysUntilBreak,
    };
  }

  /**
   * Get time tracking breakdown
   */
  async getTimeTracking(userId: string): Promise<TimeTracking> {
    const [totalMinutes, breakdown] = await Promise.all([
      analyticsRepository.getTotalStudyTimeMinutes(userId),
      analyticsRepository.getTimeBreakdownByCategory(userId),
    ]);

    return {
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      breakdown,
    };
  }

  /**
   * Get all analytics data (combined endpoint)
   */
  async getAllAnalytics(userId: string): Promise<{
    dashboard: DashboardMetrics;
    weeklyActivity: WeeklyActivityData;
    strengthsWeaknesses: StrengthsWeaknessesData;
    performance: CategoryPerformance[];
    insights: AIInsights;
    streak: StreakData;
    timeTracking: TimeTracking;
  }> {
    const [
      dashboard,
      weeklyActivity,
      strengthsWeaknesses,
      performance,
      insights,
      streak,
      timeTracking,
    ] = await Promise.all([
      this.getDashboardMetrics(userId),
      this.getWeeklyActivity(userId),
      this.getStrengthsWeaknesses(userId),
      this.getPerformanceByCategory(userId),
      this.generateAIInsights(userId),
      this.getStreak(userId),
      this.getTimeTracking(userId),
    ]);

    return {
      dashboard,
      weeklyActivity,
      strengthsWeaknesses,
      performance,
      insights,
      streak,
      timeTracking,
    };
  }

  /**
   * Helper: Generate recommendation for weak category
   */
  private generateRecommendation(category: QuestionCategory, accuracy: number): string {
    const categoryName = this.formatCategoryName(category);

    if (accuracy < 50) {
      return `Focus on ${categoryName} fundamentals. Start with easier questions to build confidence.`;
    } else if (accuracy < 70) {
      return `Review ${categoryName} concepts and practice more medium-difficulty questions.`;
    } else {
      return `You're close to mastering ${categoryName}. Focus on harder questions to reach excellence.`;
    }
  }

  /**
   * Helper: Determine performance status
   */
  private determineStatus(accuracy: number): 'excellent' | 'good' | 'needs_improvement' {
    if (accuracy >= 80) return 'excellent';
    if (accuracy >= 60) return 'good';
    return 'needs_improvement';
  }

  /**
   * Helper: Format category name for display
   */
  private formatCategoryName(category: QuestionCategory): string {
    const names: Record<QuestionCategory, string> = {
      VERBAL_ABILITY: 'Verbal Ability',
      NUMERICAL_ABILITY: 'Numerical Ability',
      ANALYTICAL_ABILITY: 'Analytical Ability',
      GENERAL_INFORMATION: 'General Information',
      CLERICAL_ABILITY: 'Clerical Ability',
    };

    return names[category] || category;
  }
}

export const analyticsService = new AnalyticsService();
