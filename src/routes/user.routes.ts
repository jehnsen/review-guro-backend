/**
 * User Routes
 * All endpoints for user profile and settings management
 *
 * Base path: /api/users
 */

import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadPhoto } from '../middlewares/upload.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile.bind(userController));

/**
 * @route   PATCH /api/users/profile
 * @desc    Update user profile (name, exam date)
 * @access  Private
 *
 * Request body:
 * {
 *   "firstName": "Maria",
 *   "lastName": "Santos",
 *   "examDate": "2025-03-16"
 * }
 */
router.patch('/profile', userController.updateProfile.bind(userController));

/**
 * @route   POST /api/users/profile/photo
 * @desc    Upload profile photo
 * @access  Private
 *
 * Request: multipart/form-data
 * - photo: File (JPG, PNG, GIF, max 2MB)
 */
router.post('/profile/photo', uploadPhoto, userController.uploadPhoto.bind(userController));

/**
 * @route   GET /api/users/settings
 * @desc    Get all user settings
 * @access  Private
 */
router.get('/settings', userController.getSettings.bind(userController));

/**
 * @route   PATCH /api/users/settings
 * @desc    Update all settings
 * @access  Private
 *
 * Request body: Any combination of settings fields
 */
router.patch('/settings', userController.updateSettings.bind(userController));

/**
 * @route   PATCH /api/users/settings/appearance
 * @desc    Update appearance settings (theme)
 * @access  Private
 *
 * Request body:
 * {
 *   "theme": "light" | "dark"
 * }
 */
router.patch('/settings/appearance', userController.updateAppearance.bind(userController));

/**
 * @route   PATCH /api/users/settings/daily-goal
 * @desc    Update daily goal
 * @access  Private
 *
 * Request body:
 * {
 *   "dailyGoal": 50
 * }
 */
router.patch('/settings/daily-goal', userController.updateDailyGoal.bind(userController));

/**
 * @route   PATCH /api/users/settings/study-preferences
 * @desc    Update study preferences
 * @access  Private
 *
 * Request body:
 * {
 *   "showExplanations": true,
 *   "soundEffects": false
 * }
 */
router.patch('/settings/study-preferences', userController.updateStudyPreferences.bind(userController));

/**
 * @route   PATCH /api/users/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 *
 * Request body:
 * {
 *   "weeklyProgressReport": true,
 *   "examReminders": true,
 *   "dailyStudyReminder": true,
 *   "reminderTime": "09:00 AM",
 *   "pushNotifications": true
 * }
 */
router.patch('/settings/notifications', userController.updateNotifications.bind(userController));

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 *
 * Request body:
 * {
 *   "password": "userPassword123",
 *   "confirmation": "DELETE"
 * }
 */
router.delete('/account', userController.deleteAccount.bind(userController));

export default router;
