/**
 * PaymentVerification Repository
 * Database operations for manual payment verification
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

class PaymentVerificationRepository {
  /**
   * Create a new payment verification request
   */
  async create(data: {
    userId: string;
    amount: number;
    paymentMethod: string;
    referenceNumber: string;
    proofImageUrl?: string;
    gcashNumber?: string;
    activationCode: string;
  }) {
    return prisma.paymentVerification.create({
      data: {
        userId: data.userId,
        amount: new Prisma.Decimal(data.amount),
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        proofImageUrl: data.proofImageUrl,
        gcashNumber: data.gcashNumber,
        activationCode: data.activationCode,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find verification by user ID (most recent)
   */
  async findByUserId(userId: string) {
    return prisma.paymentVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find verification by ID
   */
  async findById(id: string) {
    return prisma.paymentVerification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find by activation code
   */
  async findByActivationCode(activationCode: string) {
    return prisma.paymentVerification.findUnique({
      where: { activationCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Check if reference number already exists
   */
  async existsByReferenceNumber(referenceNumber: string): Promise<boolean> {
    const count = await prisma.paymentVerification.count({
      where: { referenceNumber },
    });
    return count > 0;
  }

  /**
   * Get all pending verifications (for admin)
   */
  async findPending() {
    return prisma.paymentVerification.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }, // Oldest first
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get all verifications with filters (for admin)
   */
  async findAll(filters: {
    status?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, paymentMethod, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentVerificationWhereInput = {};
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [verifications, total] = await Promise.all([
      prisma.paymentVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.paymentVerification.count({ where }),
    ]);

    return {
      verifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Approve verification and activate premium
   */
  async approve(id: string, verifiedBy: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Update verification status
      const verification = await tx.paymentVerification.update({
        where: { id },
        data: {
          status: 'approved',
          verifiedBy,
          verifiedAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      // 2. Create subscription
      await tx.subscription.upsert({
        where: { userId: verification.userId },
        create: {
          userId: verification.userId,
          planName: 'Season Pass',
          planPrice: verification.amount,
          purchaseDate: new Date(),
          paymentMethod: verification.paymentMethod,
          amountPaid: verification.amount,
          transactionId: verification.referenceNumber,
          status: 'active',
          expiresAt: null, // Season pass doesn't expire
        },
        update: {
          planName: 'Season Pass',
          planPrice: verification.amount,
          purchaseDate: new Date(),
          paymentMethod: verification.paymentMethod,
          amountPaid: verification.amount,
          transactionId: verification.referenceNumber,
          status: 'active',
          expiresAt: null,
        },
      });

      // 3. Update user premium status
      await tx.user.update({
        where: { id: verification.userId },
        data: {
          isPremium: true,
          premiumExpiry: null, // No expiry for season pass
        },
      });

      return verification;
    });
  }

  /**
   * Reject verification
   */
  async reject(id: string, verifiedBy: string, reason: string) {
    return prisma.paymentVerification.update({
      where: { id },
      data: {
        status: 'rejected',
        verifiedBy,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get verification statistics (for admin dashboard)
   */
  async getStats() {
    const [pending, approved, rejected, totalRevenue] = await Promise.all([
      prisma.paymentVerification.count({ where: { status: 'pending' } }),
      prisma.paymentVerification.count({ where: { status: 'approved' } }),
      prisma.paymentVerification.count({ where: { status: 'rejected' } }),
      prisma.paymentVerification.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}

export const paymentVerificationRepository = new PaymentVerificationRepository();
