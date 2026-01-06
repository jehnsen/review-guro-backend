/**
 * Authentication Routes
 * Defines routes for /api/auth endpoints
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register.bind(authController));

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authController.login.bind(authController));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get('/me', authenticateToken, authController.getProfile.bind(authController));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 *
 * Request body:
 * {
 *   "currentPassword": "oldPassword123",
 *   "newPassword": "newPassword456",
 *   "confirmPassword": "newPassword456"
 * }
 */
router.post('/change-password', authenticateToken, authController.changePassword.bind(authController));

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', authenticateToken, authController.getSessions.bind(authController));

/**
 * @route   POST /api/auth/signout
 * @desc    Sign out user
 * @access  Private
 */
router.post('/signout', authenticateToken, authController.signout.bind(authController));

export default router;
