/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  AuthTokenPayload,
  SafeUser,
} from '../types';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors';

class AuthService {
  private readonly SALT_ROUNDS = 12;

  /**
   * Register a new user
   *
   * @param dto - Registration data (email, password)
   * @returns AuthResponse with user data and JWT token
   * @throws ConflictError if email already exists
   * @throws BadRequestError if validation fails
   */
  async register(dto: RegisterDTO): Promise<AuthResponse> {
    const { email, password } = dto;

    // Validate password strength
    this.validatePassword(password);

    // Check if email already exists
    const existingUser = await userRepository.emailExists(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user in database
    const user = await userRepository.create({
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    // Generate JWT token
    const safeUser = userRepository.toSafeUser(user);
    const accessToken = this.generateToken(safeUser);

    return {
      user: safeUser,
      accessToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Login user with email and password
   *
   * @param dto - Login credentials
   * @returns AuthResponse with user data and JWT token
   * @throws UnauthorizedError if credentials are invalid
   */
  async login(dto: LoginDTO): Promise<AuthResponse> {
    const { email, password } = dto;

    // Find user by email
    const user = await userRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const safeUser = userRepository.toSafeUser(user);
    const accessToken = this.generateToken(safeUser);

    return {
      user: safeUser,
      accessToken,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Verify and decode a JWT token
   *
   * @param token - JWT token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  verifyToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Get user by ID
   *
   * @param userId - User ID
   * @returns SafeUser or null
   */
  async getUserById(userId: string): Promise<SafeUser | null> {
    const user = await userRepository.findById(userId);
    if (!user) {
      return null;
    }
    return userRepository.toSafeUser(user);
  }

  /**
   * Generate JWT token for a user
   */
  private generateToken(user: SafeUser): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    // Validate new passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestError('New passwords do not match');
    }

    // Validate new password strength
    this.validatePassword(newPassword);

    // Get user
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    await userRepository.updatePassword(userId, newPasswordHash);
  }

  /**
   * Get active sessions for user
   */
  async getSessions(_userId: string) {
    // In a production app, you'd query refresh_tokens table using userId
    // For now, return mock data
    return [
      {
        id: '1',
        device: 'Chrome on macOS',
        lastActive: 'Active now',
        isCurrent: true,
      },
    ];
  }

  /**
   * Sign out user (invalidate refresh token)
   */
  async signout(_userId: string): Promise<void> {
    // In production, you would:
    // 1. Delete the refresh token from the database using userId
    // 2. Optionally blacklist the access token
    // For now, this is a no-op (client clears token)
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    // Check for at least one uppercase, one lowercase, and one number
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      throw new BadRequestError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }
  }
}

export const authService = new AuthService();
