// src/webhooks/paystack.webhook.ts
// Payment webhook handler - CRITICAL for MVP

import { Request, Response } from 'express';
import crypto from 'crypto';
import donorService from '../modules/Donor/donor.service';
import { logPaymentWebhook } from '../logger/pliz-events';

/**
 * Verify Paystack webhook signature
 */
function verifyPaystackSignature(req: Request): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  const signature = req.headers['x-paystack-signature'];
  
  return hash === signature;
}

/**
 * Handle Paystack webhook events
 * POST /api/webhooks/paystack
 */
export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    // 1. Verify signature
    if (!verifyPaystackSignature(req)) {
      req.logger?.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    
    logPaymentWebhook({
      gateway: 'paystack',
      event: event.event,
      reference: event.data?.reference,
      status: event.data?.status,
    });
    
    // 2. Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data, req);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(event.data, req);
        break;
      
      default:
        req.logger?.debug('Unhandled webhook event', { event: event.event });
    }
    
    // 3. Always return 200 to acknowledge receipt
    return res.status(200).json({ status: 'success' });
    
  } catch (error: any) {
    req.logger?.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
    });
    
    // Still return 200 to prevent retries on our errors
    return res.status(200).json({ status: 'error' });
  }
}

/**
 * Handle successful charge
 * THIS IS WHERE DONATIONS ARE ACTUALLY CONFIRMED
 */
async function handleChargeSuccess(data: any, req: Request) {
  const reference = data.reference;
  
  req.logger?.info('Payment successful', {
    reference,
    amount: data.amount,
    customer: data.customer?.email,
  });
  
  // Confirm the donation in database
  const confirmed = await donorService.confirmDonation(reference);
  
  if (!confirmed) {
    req.logger?.error('Failed to confirm donation', { reference });
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(data: any, req: Request) {
  const reference = data.reference;
  
  req.logger?.warn('Payment failed', {
    reference,
    amount: data.amount,
    message: data.gateway_response,
  });
  
  // TODO: Update donation status to 'failed'
  // For MVP, pending donations that never get confirmed will just stay pending
}

// ============================================
// WEBHOOK ROUTES
// ============================================

import { Router } from 'express';

const webhookRouter = Router();

/**
 * Paystack webhook endpoint
 * No authentication middleware - verified by signature
 */
webhookRouter.post('/paystack', handlePaystackWebhook);

export default webhookRouter;
