/**
 * User Controller
 * Handles user profile and settings endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import bcrypt from 'bcrypt';

export class UserController {
  /**
   * GET /api/users/profile
   * Get user profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const profile = await userRepository.getProfile(userId);

      if (!profile) {
        throw new NotFoundError('User not found');
      }

      sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/profile
   * Update user profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { firstName, lastName, examDate } = req.body;

      const profile = await userRepository.updateProfile(userId, {
        firstName,
        lastName,
        examDate: examDate ? new Date(examDate) : undefined,
      });

      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/profile/photo
   * Upload profile photo
   */
  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        throw new BadRequestError('No photo file provided');
      }

      // In production, upload to cloud storage (S3, Cloudinary, etc.)
      // For now, we'll just save the file path
      const photoUrl = `/uploads/profiles/${req.file.filename}`;

      const profile = await userRepository.updateProfile(userId, {
        photoUrl,
      });

      sendSuccess(res, { photoUrl: profile.photoUrl }, 'Photo uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/settings
   * Get all user settings
   */
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const settings = await userRepository.getSettings(userId);

      // Remove internal fields
      const { id, userId: _, createdAt, updatedAt, ...settingsData } = settings;

      sendSuccess(res, settingsData, 'Settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/settings
   * Update all settings at once
   */
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const settings = await userRepository.updateSettings(userId, req.body);

      const { id, userId: _, createdAt, updatedAt, ...settingsData } = settings;

      sendSuccess(res, settingsData, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/settings/appearance
   * Update appearance settings
   */
  async updateAppearance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { theme } = req.body;

      if (theme && !['light', 'dark'].includes(theme)) {
        throw new BadRequestError('Theme must be "light" or "dark"');
      }

      const settings = await userRepository.updateSettings(userId, { theme });

      sendSuccess(res, { theme: settings.theme }, 'Appearance updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/settings/daily-goal
   * Update daily goal
   */
  async updateDailyGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { dailyGoal } = req.body;

      if (!dailyGoal || dailyGoal < 1 || dailyGoal > 200) {
        throw new BadRequestError('Daily goal must be between 1 and 200');
      }

      const settings = await userRepository.updateSettings(userId, { dailyGoal });

      sendSuccess(res, { dailyGoal: settings.dailyGoal }, 'Daily goal updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/settings/study-preferences
   * Update study preferences
   */
  async updateStudyPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { showExplanations, soundEffects } = req.body;

      const settings = await userRepository.updateSettings(userId, {
        showExplanations,
        soundEffects,
      });

      sendSuccess(
        res,
        {
          showExplanations: settings.showExplanations,
          soundEffects: settings.soundEffects,
        },
        'Study preferences updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/settings/notifications
   * Update notification settings
   */
  async updateNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        weeklyProgressReport,
        examReminders,
        dailyStudyReminder,
        reminderTime,
        pushNotifications,
      } = req.body;

      const settings = await userRepository.updateSettings(userId, {
        weeklyProgressReport,
        examReminders,
        dailyStudyReminder,
        reminderTime,
        pushNotifications,
      });

      sendSuccess(
        res,
        {
          weeklyProgressReport: settings.weeklyProgressReport,
          examReminders: settings.examReminders,
          dailyStudyReminder: settings.dailyStudyReminder,
          reminderTime: settings.reminderTime,
          pushNotifications: settings.pushNotifications,
        },
        'Notification settings updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/account
   * Delete user account
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { password, confirmation } = req.body;

      if (!password || !confirmation) {
        throw new BadRequestError('Password and confirmation required');
      }

      if (confirmation !== 'DELETE') {
        throw new BadRequestError('Confirmation must be "DELETE"');
      }

      // Verify password
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new BadRequestError('Invalid password');
      }

      // Delete account (cascades to all related data)
      await userRepository.delete(userId);

      sendSuccess(res, null, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
