/**
 * PayMongo Controller
 * Handles automated payment processing via PayMongo
 */

import { Request, Response, NextFunction } from 'express';
import { paymongoService } from '../services/paymongo.service';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess } from '../utils/response';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { config } from '../config/env';

export class PayMongoController {
  /**
   * POST /api/payments/paymongo/create-checkout
   * Create a PayMongo checkout session for Season Pass
   */
  async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // Check if user already has premium
      const user = await userRepository.findById(userId);
      if (user?.isPremium) {
        throw new BadRequestError('You already have an active Season Pass');
      }

      const { successUrl, cancelUrl } = req.body;

      // Create PayMongo payment link
      const { checkoutUrl, referenceNumber, linkId } =
        await paymongoService.createPaymentLink({
          userId,
          amount: config.payment.seasonPassPrice,
          description: 'ReviewGuro Season Pass - Unlimited Access',
          successUrl: successUrl || `${config.frontend.url}/payment/success`,
          failedUrl: cancelUrl || `${config.frontend.url}/payment/failed`,
        });

      sendSuccess(
        res,
        {
          checkoutUrl,
          referenceNumber,
          linkId,
          amount: config.payment.seasonPassPrice,
          currency: config.payment.currency,
        },
        'Checkout session created'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/paymongo/webhook
   * Handle PayMongo webhook events
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['paymongo-signature'] as string;
      const rawBody = JSON.stringify(req.body);

      // Verify webhook signature
      const isValid = paymongoService.verifyWebhookSignature(
        rawBody,
        signature,
        config.paymongo.secretKey
      );

      if (!isValid) {
        throw new UnauthorizedError('Invalid webhook signature');
      }

      const event = req.body;
      const eventType = event.data?.attributes?.type;

      console.log(`📨 PayMongo Webhook: ${eventType}`);

      switch (eventType) {
        case 'payment.paid':
          await this.handlePaymentPaid(event);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(event);
          break;

        case 'link.payment.paid':
          // Payment link completed
          await this.handlePaymentPaid(event);
          break;

        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      // Still return 200 to prevent retries for invalid signatures
      if (error instanceof UnauthorizedError) {
        res.status(200).json({ received: false, error: 'Invalid signature' });
      } else {
        next(error);
      }
    }
  }

  /**
   * Handle successful payment
   * CRITICAL: Uses transaction to ensure atomicity
   * If subscription creation succeeds but premium activation fails,
   * user would have paid but not received premium access
   */
  private async handlePaymentPaid(event: any): Promise<void> {
    const payment = event.data?.attributes?.data;
    const metadata = payment?.attributes?.metadata || {};
    const userId = metadata.userId;
    const referenceNumber = metadata.referenceNumber;

    if (!userId) {
      console.error('No userId in payment metadata');
      return;
    }

    // Check if subscription already exists (idempotency)
    const existing = await subscriptionRepository.findByReferenceNumber(referenceNumber);
    if (existing) {
      console.log(`Subscription already exists for reference ${referenceNumber}`);
      return;
    }

    const amount = paymongoService.toPesos(payment.attributes.amount);
    const paymentMethod = payment.attributes.payment_method_used || 'card';

    // ATOMIC TRANSACTION: Both subscription creation and premium activation
    // must succeed together, or both fail (prevents partial payment processing)
    await subscriptionRepository.createWithUserUpdate({
      userId,
      planName: 'Season Pass',
      planPrice: amount,
      purchaseDate: new Date(),
      paymentMethod,
      amountPaid: amount,
      transactionId: payment.id,
      referenceNumber,
      paymentProvider: 'paymongo',
      status: 'active',
      expiresAt: null, // Season pass doesn't expire
    });

    console.log(`✅ Premium activated for user ${userId} via PayMongo`);

    // TODO: Send confirmation email
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(event: any): Promise<void> {
    const payment = event.data?.attributes?.data;
    const metadata = payment?.attributes?.metadata || {};
    const userId = metadata.userId;

    console.log(`❌ Payment failed for user ${userId}`);

    // TODO: Send failure notification email
  }

  /**
   * GET /api/payments/paymongo/status/:referenceNumber
   * Check payment status by reference number
   */
  async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { referenceNumber } = req.params;

      const subscription = await subscriptionRepository.findByReferenceNumber(referenceNumber);

      if (!subscription) {
        sendSuccess(
          res,
          {
            status: 'pending',
            isPremium: false,
            message: 'Payment not yet completed',
          },
          'Payment status retrieved'
        );
        return;
      }

      const user = await userRepository.findById(subscription.userId);

      sendSuccess(
        res,
        {
          status: subscription.status,
          isPremium: user?.isPremium || false,
          activatedAt: subscription.purchaseDate,
          paymentMethod: subscription.paymentMethod,
          amount: Number(subscription.amountPaid),
        },
        'Payment status retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/paymongo/public-key
   * Get PayMongo public key for frontend
   */
  async getPublicKey(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        {
          publicKey: paymongoService.getPublicKey(),
        },
        'Public key retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const paymongoController = new PayMongoController();
