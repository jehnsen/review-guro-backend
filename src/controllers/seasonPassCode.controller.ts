/**
 * Season Pass Code Controller
 * Handles HTTP requests for season pass code operations
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { seasonPassCodeService } from '../services/seasonPassCode.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

// Validation schemas
const redeemCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
});

const verifyCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
});

const generateCodesSchema = z.object({
  count: z.number().int().min(1).max(1000),
  batchId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

class SeasonPassCodeController {
  /**
   * POST /api/season-pass-codes/redeem
   * Redeem a season pass code
   * Public endpoint (authenticated users)
   */
  async redeemCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = redeemCodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }

      const userId = req.user!.userId;
      const result = await seasonPassCodeService.redeemCode(userId, parseResult.data.code);

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/season-pass-codes/verify
   * Verify a code without redeeming it
   * Public endpoint (authenticated users)
   */
  async verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = verifyCodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }

      const result = await seasonPassCodeService.verifyCode(parseResult.data.code);

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/season-pass-codes/generate
   * Generate season pass codes (Admin only)
   */
  async generateCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = generateCodesSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        throw new ValidationError('Validation failed', errors);
      }

      const adminId = req.user!.userId;
      const data = parseResult.data;

      const result = await seasonPassCodeService.generateCodes(adminId, data.count, {
        batchId: data.batchId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        notes: data.notes,
      });

      sendSuccess(res, result, `Generated ${result.count} season pass codes`, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/season-pass-codes/batch/:batchId/stats
   * Get batch statistics (Admin only)
   */
  async getBatchStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batchId } = req.params;

      const stats = await seasonPassCodeService.getBatchStats(batchId);

      sendSuccess(res, stats, 'Batch statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/season-pass-codes/unredeemed
   * List unredeemed codes (Admin only)
   */
  async listUnredeemed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const codes = await seasonPassCodeService.listUnredeemedCodes(limit);

      sendSuccess(res, { codes, count: codes.length }, 'Unredeemed codes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/season-pass-codes/redeemed
   * List redeemed codes (Admin only)
   */
  async listRedeemed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const codes = await seasonPassCodeService.listRedeemedCodes(limit);

      sendSuccess(res, { codes, count: codes.length }, 'Redeemed codes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const seasonPassCodeController = new SeasonPassCodeController();
