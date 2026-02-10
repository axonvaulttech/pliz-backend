// src/modules/Donor/donor.controller.ts
// MVP VERSION - Essential endpoints only

import { Request, Response } from 'express';
import donorService from './donor.service';
import { CreateDonationRequest, QUICK_DONATION_AMOUNTS } from './types';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createDonationSchema = z.object({
  request_id: z.string().uuid('Invalid request ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .min(100, 'Minimum donation is ₦100')
    .max(100000, 'Maximum donation is ₦100,000'),
  is_anonymous: z.boolean().optional().default(false),
  payment_method: z.enum(['card', 'transfer', 'ussd'], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }),
});

// ============================================
// CONTROLLER
// ============================================

export class DonorController {
  
  /**
   * POST /api/donor/donate
   * Create a new donation (returns payment URL)
   * MVP CORE ENDPOINT
   */
  async donate(req: Request, res: Response) {
    try {
      // Validate request
      const validationResult = createDonationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        req.logger.warn('Invalid donation request', {
          errors: validationResult.error.errors,
        });
        
        return res.status(400).json({
          error: 'Invalid request',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      
      const donationData: CreateDonationRequest = validationResult.data;
      const donorId = (req as any).user?.id;
      const donorIp = req.ip || req.socket.remoteAddress;
      
      req.logger.info('Processing donation', {
        requestId: donationData.request_id,
        amount: donationData.amount,
        isAnonymous: donationData.is_anonymous,
        donorId: donorId || 'anonymous',
      });
      
      // Process donation
      const result = await donorService.createDonation(
        donationData, 
        donorId,
        donorIp
      );
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
        });
      }
      
      req.logger.info('Donation initialized', {
        donationId: result.donation?.id,
        paymentReference: result.donation?.payment_reference,
      });
      
      // Return payment URL for client to redirect
      return res.status(201).json({
        success: true,
        message: 'Please complete payment',
        data: {
          donation_id: result.donation?.id,
          amount: result.donation?.amount,
          payment_reference: result.donation?.payment_reference,
          payment_url: result.payment_url, // Client redirects here
        },
      });
      
    } catch (error: any) {
      req.logger.error('Donation error', {
        error: error.message,
        stack: error.stack,
      });
      
      return res.status(500).json({
        error: 'An error occurred while processing your donation',
      });
    }
  }
  
  /**
   * GET /api/donor/history
   * Get basic donation history (no advanced stats)
   * MVP CORE ENDPOINT
   */
  async getHistory(req: Request, res: Response) {
    try {
      const donorId = (req as any).user?.id;
      
      if (!donorId) {
        return res.status(401).json({
          error: 'Authentication required',
        });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      
      req.logger.debug('Fetching donation history', { donorId, limit });
      
      const donations = await donorService.getDonationHistory(donorId, limit);
      
      return res.json({
        success: true,
        data: { donations },
      });
      
    } catch (error: any) {
      req.logger.error('Failed to fetch donation history', {
        error: error.message,
      });
      
      return res.status(500).json({
        error: 'Failed to load donation history',
      });
    }
  }
  
  /**
   * GET /api/donor/quick-amounts
   * Get suggested quick donation amounts
   * MVP CORE ENDPOINT
   */
  async getQuickAmounts(req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        data: {
          amounts: QUICK_DONATION_AMOUNTS,
          currency: 'NGN',
          min_amount: 100,
          max_amount: 100000,
        },
      });
    } catch (error: any) {
      req.logger.error('Failed to fetch quick amounts', {
        error: error.message,
      });
      
      return res.status(500).json({
        error: 'Failed to load quick amounts',
      });
    }
  }
}

export default new DonorController();
