/**
 * Season Pass Code Service
 * Business logic for season pass code generation and redemption
 */

import { seasonPassCodeRepository } from '../repositories/seasonPassCode.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { userRepository } from '../repositories/user.repository';
import { generateSeasonPassCodes, normalizeCode, isValidCodeFormat } from '../utils/codeGenerator';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';

class SeasonPassCodeService {
  /**
   * Redeem a season pass code
   * Activates premium access for the user
   */
  async redeemCode(userId: string, code: string): Promise<{
    success: boolean;
    message: string;
    subscription?: any;
  }> {
    // Normalize and validate format
    const normalizedCode = normalizeCode(code);

    if (!isValidCodeFormat(normalizedCode)) {
      throw new BadRequestError('Invalid code format. Code should be in format: RG-XXXXX-XXXXX');
    }

    // Validate code in database
    const validation = await seasonPassCodeRepository.validateCode(normalizedCode);

    if (!validation.valid) {
      throw new BadRequestError(validation.reason || 'Invalid code');
    }

    // Check if user already has premium
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isPremium) {
      throw new ConflictError('You already have an active Season Pass');
    }

    // Check if user already has a subscription
    const existingSubscription = await subscriptionRepository.findByUserId(userId);

    if (existingSubscription && existingSubscription.status === 'active') {
      throw new ConflictError('You already have an active subscription');
    }

    // Mark code as redeemed
    await seasonPassCodeRepository.markAsRedeemed(normalizedCode, userId);

    // Create or update subscription
    let subscription;
    if (existingSubscription) {
      subscription = await subscriptionRepository.update(userId, {
        status: 'active',
        paymentMethod: 'season_pass_code',
        transactionId: normalizedCode,
        paymentProvider: 'code_redemption',
      });
    } else {
      subscription = await subscriptionRepository.create({
        userId,
        planName: 'Season Pass',
        planPrice: 399, // Regular price, but obtained via code
        purchaseDate: new Date(),
        paymentMethod: 'season_pass_code',
        amountPaid: 0, // Free via code
        transactionId: normalizedCode,
        paymentProvider: 'code_redemption',
        status: 'active',
      });
    }

    // Activate premium status
    await userRepository.update(userId, {
      isPremium: true,
      premiumExpiry: null, // No expiry - valid until they pass
    });

    return {
      success: true,
      message: 'Season Pass activated successfully! You now have unlimited access.',
      subscription: {
        id: subscription.id,
        planName: subscription.planName,
        status: subscription.status,
        activatedAt: subscription.purchaseDate.toISOString(),
      },
    };
  }

  /**
   * Generate season pass codes (Admin only)
   */
  async generateCodes(
    adminId: string,
    count: number,
    options?: {
      batchId?: string;
      expiresAt?: Date;
      notes?: string;
    }
  ): Promise<{
    batchId: string;
    codes: string[];
    count: number;
  }> {
    if (count < 1 || count > 1000) {
      throw new BadRequestError('Code count must be between 1 and 1000');
    }

    // Generate unique codes
    const codes = generateSeasonPassCodes(count);

    // Create batch ID if not provided
    const batchId = options?.batchId || `BATCH-${Date.now()}`;

    // Store codes in database
    const codeData = codes.map(code => ({
      code,
      createdBy: adminId,
      batchId,
      expiresAt: options?.expiresAt,
      notes: options?.notes,
    }));

    const createdCount = await seasonPassCodeRepository.createMany(codeData);

    return {
      batchId,
      codes,
      count: createdCount,
    };
  }

  /**
   * Get batch statistics
   */
  async getBatchStats(batchId: string) {
    const stats = await seasonPassCodeRepository.getBatchStats(batchId);
    const codes = await seasonPassCodeRepository.findByBatchId(batchId);

    return {
      batchId,
      ...stats,
      createdAt: codes.length > 0 ? codes[0].createdAt : null,
      expiresAt: codes.length > 0 ? codes[0].expiresAt : null,
      notes: codes.length > 0 ? codes[0].notes : null,
    };
  }

  /**
   * List all unredeemed codes (Admin only)
   */
  async listUnredeemedCodes(limit: number = 100) {
    return seasonPassCodeRepository.findUnredeemed(limit);
  }

  /**
   * List all redeemed codes (Admin only)
   */
  async listRedeemedCodes(limit: number = 100) {
    return seasonPassCodeRepository.findRedeemed(limit);
  }

  /**
   * Verify code without redeeming (check if valid)
   */
  async verifyCode(code: string): Promise<{
    valid: boolean;
    message: string;
    details?: {
      isRedeemed: boolean;
      expiresAt: Date | null;
    };
  }> {
    const normalizedCode = normalizeCode(code);

    if (!isValidCodeFormat(normalizedCode)) {
      return {
        valid: false,
        message: 'Invalid code format',
      };
    }

    const validation = await seasonPassCodeRepository.validateCode(normalizedCode);

    if (!validation.valid) {
      return {
        valid: false,
        message: validation.reason || 'Invalid code',
      };
    }

    return {
      valid: true,
      message: 'Code is valid and ready to redeem',
      details: {
        isRedeemed: validation.seasonPassCode!.isRedeemed,
        expiresAt: validation.seasonPassCode!.expiresAt,
      },
    };
  }
}

export const seasonPassCodeService = new SeasonPassCodeService();
