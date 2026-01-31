/**
 * Season Pass Code Repository
 * Data access layer for SeasonPassCode entity
 */

import { SeasonPassCode } from '@prisma/client';
import { prisma } from '../config/database';

class SeasonPassCodeRepository {
  /**
   * Find season pass code by code string
   */
  async findByCode(code: string): Promise<SeasonPassCode | null> {
    return prisma.seasonPassCode.findUnique({
      where: { code: code.toUpperCase() }, // Store codes in uppercase
    });
  }

  /**
   * Create a single season pass code
   */
  async create(data: {
    code: string;
    createdBy?: string;
    batchId?: string;
    expiresAt?: Date;
    notes?: string;
  }): Promise<SeasonPassCode> {
    return prisma.seasonPassCode.create({
      data: {
        code: data.code.toUpperCase(),
        createdBy: data.createdBy,
        batchId: data.batchId,
        expiresAt: data.expiresAt,
        notes: data.notes,
      },
    });
  }

  /**
   * Create multiple season pass codes in bulk
   */
  async createMany(codes: Array<{
    code: string;
    createdBy?: string;
    batchId?: string;
    expiresAt?: Date;
    notes?: string;
  }>): Promise<number> {
    const result = await prisma.seasonPassCode.createMany({
      data: codes.map(c => ({
        code: c.code.toUpperCase(),
        createdBy: c.createdBy,
        batchId: c.batchId,
        expiresAt: c.expiresAt,
        notes: c.notes,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Mark a code as redeemed
   */
  async markAsRedeemed(code: string, userId: string): Promise<SeasonPassCode> {
    return prisma.seasonPassCode.update({
      where: { code: code.toUpperCase() },
      data: {
        isRedeemed: true,
        redeemedBy: userId,
        redeemedAt: new Date(),
      },
    });
  }

  /**
   * Get all codes in a batch
   */
  async findByBatchId(batchId: string): Promise<SeasonPassCode[]> {
    return prisma.seasonPassCode.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get unredeemed codes
   */
  async findUnredeemed(limit?: number): Promise<SeasonPassCode[]> {
    return prisma.seasonPassCode.findMany({
      where: { isRedeemed: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get redeemed codes with user info
   */
  async findRedeemed(limit?: number): Promise<Array<SeasonPassCode & { user?: any }>> {
    const codes = await prisma.seasonPassCode.findMany({
      where: { isRedeemed: true },
      orderBy: { redeemedAt: 'desc' },
      take: limit,
    });

    return codes as any;
  }

  /**
   * Check if code is valid for redemption
   * Returns null if invalid, otherwise returns the code
   */
  async validateCode(code: string): Promise<{
    valid: boolean;
    reason?: string;
    seasonPassCode?: SeasonPassCode;
  }> {
    const seasonPassCode = await this.findByCode(code);

    if (!seasonPassCode) {
      return { valid: false, reason: 'Invalid code' };
    }

    if (seasonPassCode.isRedeemed) {
      return { valid: false, reason: 'Code already redeemed' };
    }

    if (seasonPassCode.expiresAt && new Date() > seasonPassCode.expiresAt) {
      return { valid: false, reason: 'Code has expired' };
    }

    return { valid: true, seasonPassCode };
  }

  /**
   * Get statistics for a batch
   */
  async getBatchStats(batchId: string): Promise<{
    total: number;
    redeemed: number;
    unredeemed: number;
    redeemedPercentage: number;
  }> {
    const [total, redeemed] = await Promise.all([
      prisma.seasonPassCode.count({ where: { batchId } }),
      prisma.seasonPassCode.count({ where: { batchId, isRedeemed: true } }),
    ]);

    const unredeemed = total - redeemed;
    const redeemedPercentage = total > 0 ? (redeemed / total) * 100 : 0;

    return {
      total,
      redeemed,
      unredeemed,
      redeemedPercentage: Math.round(redeemedPercentage * 100) / 100,
    };
  }
}

export const seasonPassCodeRepository = new SeasonPassCodeRepository();
