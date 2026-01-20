/**
 * PayMongo Service
 * Integration with PayMongo payment API
 * Docs: https://developers.paymongo.com/docs
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { BadRequestError } from '../utils/errors';

interface PayMongoLink {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    description: string;
    checkout_url: string;
    reference_number: string;
    status: string;
  };
}

interface PayMongoPayment {
  id: string;
  type: string;
  attributes: {
    amount: number;
    status: string;
    paid_at: number;
    payment_method_used: string;
    metadata: Record<string, string>;
  };
}

class PayMongoService {
  private client: AxiosInstance;
  private readonly baseURL = 'https://api.paymongo.com/v1';

  constructor() {
    // Create axios instance with PayMongo authentication
    this.client = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: config.paymongo.secretKey,
        password: '', // PayMongo uses only username (secret key)
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Create a payment link (checkout session)
   * This generates a hosted checkout page for the user
   */
  async createPaymentLink(data: {
    userId: string;
    amount: number;
    description: string;
    successUrl: string;
    failedUrl: string;
  }): Promise<{
    checkoutUrl: string;
    referenceNumber: string;
    linkId: string;
  }> {
    try {
      const referenceNumber = this.generateReferenceNumber();

      const payload = {
        data: {
          attributes: {
            amount: data.amount * 100, // Convert to centavos (₱399 → 39900)
            currency: config.payment.currency,
            description: data.description,
            remarks: `Season Pass for User ${data.userId}`,
            // Payment method options
            payment_method_types: [
              'card',
              'gcash',
              'grab_pay',
              'paymaya',
            ],
            reference_number: referenceNumber,
            // Redirect URLs
            success_url: data.successUrl,
            failed_url: data.failedUrl,
            // Store metadata for webhook processing
            metadata: {
              userId: data.userId,
              referenceNumber,
              productType: 'season_pass',
            },
          },
        },
      };

      const response = await this.client.post<{ data: PayMongoLink }>(
        '/links',
        payload
      );

      const link = response.data.data;

      return {
        checkoutUrl: link.attributes.checkout_url,
        referenceNumber: link.attributes.reference_number,
        linkId: link.id,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('PayMongo API Error:', error.response?.data);
        throw new BadRequestError(
          error.response?.data?.errors?.[0]?.detail ||
            'Failed to create payment link'
        );
      }
      throw error;
    }
  }

  /**
   * Retrieve payment details by ID
   */
  async getPayment(paymentId: string): Promise<PayMongoPayment> {
    try {
      const response = await this.client.get<{ data: PayMongoPayment }>(
        `/payments/${paymentId}`
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('PayMongo API Error:', error.response?.data);
        throw new BadRequestError('Failed to retrieve payment');
      }
      throw error;
    }
  }

  /**
   * Retrieve payment link details
   */
  async getPaymentLink(linkId: string): Promise<PayMongoLink> {
    try {
      const response = await this.client.get<{ data: PayMongoLink }>(
        `/links/${linkId}`
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('PayMongo API Error:', error.response?.data);
        throw new BadRequestError('Failed to retrieve payment link');
      }
      throw error;
    }
  }

  /**
   * Generate unique reference number
   * Format: RG-{timestamp}
   */
  private generateReferenceNumber(): string {
    return `RG-${Date.now()}`;
  }

  /**
   * Verify webhook signature
   * PayMongo signs webhooks with HMAC-SHA256
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  /**
   * Get public key for frontend
   * Frontend needs public key to initialize PayMongo.js
   */
  getPublicKey(): string {
    return config.paymongo.publicKey;
  }

  /**
   * Format amount from pesos to centavos
   */
  toCentavos(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Format amount from centavos to pesos
   */
  toPesos(centavos: number): number {
    return centavos / 100;
  }
}

export const paymongoService = new PayMongoService();
