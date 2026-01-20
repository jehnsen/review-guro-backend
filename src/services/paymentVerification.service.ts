/**
 * Payment Verification Service
 * Manual payment verification business logic
 */

import { paymentVerificationRepository } from '../repositories/paymentVerification.repository';
import { generateActivationCode } from '../utils/activationCode';
import { BadRequestError } from '../utils/errors';

class PaymentVerificationService {
  /**
   * Submit proof of payment for manual verification
   */
  async submitProof(data: {
    userId: string;
    amount: number;
    paymentMethod: string;
    referenceNumber: string;
    proofImageUrl?: string;
    gcashNumber?: string;
  }) {
    // Check for duplicate reference number
    const exists = await paymentVerificationRepository.existsByReferenceNumber(
      data.referenceNumber
    );
    if (exists) {
      throw new BadRequestError('This reference number has already been submitted');
    }

    // Generate activation code
    const activationCode = generateActivationCode();

    // Create verification request
    return paymentVerificationRepository.create({
      ...data,
      activationCode,
    });
  }

  /**
   * Get verification status for user
   */
  async getStatus(userId: string) {
    return paymentVerificationRepository.findByUserId(userId);
  }

  /**
   * Get pending verifications (admin)
   */
  async getPending() {
    return paymentVerificationRepository.findPending();
  }

  /**
   * Get all verifications with filters (admin)
   */
  async getAll(filters: {
    status?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }) {
    return paymentVerificationRepository.findAll(filters);
  }

  /**
   * Approve payment verification (admin)
   */
  async approve(id: string, verifiedBy: string) {
    return paymentVerificationRepository.approve(id, verifiedBy);
  }

  /**
   * Reject payment verification (admin)
   */
  async reject(id: string, verifiedBy: string, reason: string) {
    return paymentVerificationRepository.reject(id, verifiedBy, reason);
  }

  /**
   * Get statistics (admin)
   */
  async getStats() {
    return paymentVerificationRepository.getStats();
  }
}

export const paymentVerificationService = new PaymentVerificationService();
