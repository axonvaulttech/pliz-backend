// src/modules/Donor/donor.service.ts
// MVP VERSION - Lean & focused

import { PrismaClient } from '@prisma/client';
import {
  CreateDonationRequest,
  CreateDonationResponse,
  PaymentRequest,
  PaymentResponse,
  GRATITUDE_MESSAGES,
} from './types';
import {
  logDonationAttempt,
  logDonationSuccess,
  logDonationFailed,
  logGratitudeSent,
  logBegFunded,
} from '../../logger/pliz-events';
import { trustEngine } from '../../services/trust-engine';

const prisma = new PrismaClient();

export class DonorService {
  
  // ============================================
  // MAKE A DONATION (MVP Core)
  // ============================================
  
  async createDonation(
    donationData: CreateDonationRequest,
    donorId?: string,
    donorIp?: string
  ): Promise<CreateDonationResponse> {
    
    logDonationAttempt({
      donorId,
      begId: donationData.request_id,
      amount: donationData.amount,
      isAnonymous: donationData.is_anonymous || false,
      paymentMethod: donationData.payment_method,
    });
    
    try {
      // 1. Validate the beg exists and is active
      const beg = await prisma.begs.findUnique({
        where: { id: donationData.request_id },
      });
      
      if (!beg) {
        return { success: false, error: 'Request not found' };
      }
      
      if (beg.status !== 'active' || !beg.approved) {
        return { success: false, error: 'This request is no longer active' };
      }
      
      if (new Date() > beg.expires_at) {
        return { success: false, error: 'This request has expired' };
      }
      
      // 2. Check remaining amount
      const remaining = parseFloat(beg.amount_requested.toString()) - 
                       parseFloat(beg.amount_raised.toString());
      
      if (remaining <= 0) {
        return { success: false, error: 'This request is already fully funded' };
      }
      
      // 3. Adjust amount if exceeds remaining
      const actualAmount = Math.min(donationData.amount, remaining);
      
      // 4. TRUST ENGINE CHECK (Critical - even if always returns true in MVP)
      const trustCheck = await trustEngine.canDonate({
        userId: donorId,
        amount: actualAmount,
        requestId: donationData.request_id,
        ip: donorIp,
      });
      
      if (!trustCheck.allowed) {
        logDonationFailed({
          donorId,
          begId: donationData.request_id,
          amount: actualAmount,
          reason: trustCheck.reason || 'Trust check failed',
          paymentMethod: donationData.payment_method,
        });
        
        return {
          success: false,
          error: trustCheck.reason || 'Unable to process donation at this time',
        };
      }
      
      // 5. Initialize payment (get authorization URL, don't confirm yet)
      const paymentInit = await this.initializePayment({
        amount: actualAmount,
        method: donationData.payment_method,
        reference: `DON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        donor_id: donorId,
        metadata: {
          request_id: donationData.request_id,
          is_anonymous: donationData.is_anonymous || false,
        },
      });
      
      if (!paymentInit.success) {
        logDonationFailed({
          donorId,
          begId: donationData.request_id,
          amount: actualAmount,
          reason: paymentInit.error || 'Payment initialization failed',
          paymentMethod: donationData.payment_method,
        });
        
        return {
          success: false,
          error: paymentInit.error || 'Payment failed',
        };
      }
      
      // 6. Create pending donation record (confirmed via webhook)
      const donation = await prisma.donations.create({
        data: {
          request_id: donationData.request_id,
          donor_id: donorId,
          amount: actualAmount,
          is_anonymous: donationData.is_anonymous || false,
          payment_method: donationData.payment_method,
          payment_reference: paymentInit.reference,
          status: 'pending', // Will be updated by webhook
        },
      });
      
      // 7. Return with payment authorization URL
      return {
        success: true,
        donation: {
          id: donation.id,
          amount: actualAmount,
          request_id: donationData.request_id,
          is_anonymous: donation.is_anonymous,
          payment_reference: paymentInit.reference,
          created_at: donation.created_at,
        },
        payment_url: paymentInit.authorization_url, // Client redirects here
      };
      
    } catch (error: any) {
      logDonationFailed({
        donorId,
        begId: donationData.request_id,
        amount: donationData.amount,
        reason: error.message,
        paymentMethod: donationData.payment_method,
      });
      
      return {
        success: false,
        error: 'An error occurred while processing your donation',
      };
    }
  }
  
  // ============================================
  // WEBHOOK: CONFIRM DONATION (Critical)
  // ============================================
  
  async confirmDonation(paymentReference: string): Promise<boolean> {
    try {
      const donation = await prisma.donations.findFirst({
        where: { payment_reference: paymentReference },
        include: { begs: true },
      });
      
      if (!donation || donation.status !== 'pending') {
        return false;
      }
      
      // Update donation and beg in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Confirm donation
        const confirmedDonation = await tx.donations.update({
          where: { id: donation.id },
          data: { status: 'success' },
        });
        
        // Update beg amount raised
        const updatedBeg = await tx.begs.update({
          where: { id: donation.request_id },
          data: {
            amount_raised: { increment: parseFloat(donation.amount.toString()) },
          },
        });
        
        // Check if fully funded
        const isFunded = parseFloat(updatedBeg.amount_raised.toString()) >= 
                        parseFloat(updatedBeg.amount_requested.toString());
        
        if (isFunded) {
          await tx.begs.update({
            where: { id: donation.request_id },
            data: { status: 'funded' },
          });
        }
        
        // Update donor stats
        if (donation.donor_id) {
          await tx.user_stats.upsert({
            where: { user_id: donation.donor_id },
            update: {
              total_donated: { increment: parseFloat(donation.amount.toString()) },
            },
            create: {
              user_id: donation.donor_id,
              total_donated: parseFloat(donation.amount.toString()),
            },
          });
        }
        
        // Create gratitude message
        const gratitudeType = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
        await tx.gratitude_messages.create({
          data: {
            donation_id: donation.id,
            message_type: gratitudeType,
          },
        });
        
        return { updatedBeg, isFunded, gratitudeType };
      });
      
      // Log success
      logDonationSuccess({
        donationId: donation.id,
        donorId: donation.donor_id,
        begId: donation.request_id,
        amount: parseFloat(donation.amount.toString()),
        paymentReference: paymentReference,
        isFirstDonation: false, // Can calculate if needed
      });
      
      logGratitudeSent({
        donationId: donation.id,
        begId: donation.request_id,
        messageType: result.gratitudeType,
      });
      
      // Log if beg funded
      if (result.isFunded) {
        const donationCount = await prisma.donations.count({
          where: { request_id: donation.request_id },
        });
        
        const timeToFund = Date.now() - result.updatedBeg.created_at.getTime();
        
        logBegFunded({
          begId: donation.request_id,
          userId: result.updatedBeg.user_id,
          amountRequested: parseFloat(result.updatedBeg.amount_requested.toString()),
          amountRaised: parseFloat(result.updatedBeg.amount_raised.toString()),
          donorCount: donationCount,
          timeToFund,
        });
      }
      
      return true;
      
    } catch (error: any) {
      console.error('Failed to confirm donation:', error);
      return false;
    }
  }
  
  // ============================================
  // GET BASIC DONATION HISTORY (MVP)
  // ============================================
  
  async getDonationHistory(donorId: string, limit: number = 20) {
    const donations = await prisma.donations.findMany({
      where: { 
        donor_id: donorId,
        status: 'success', // Only confirmed donations
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        begs: {
          include: {
            app_users: {
              include: {
                user_profiles: true,
              },
            },
          },
        },
        gratitude_messages: true,
      },
    });
    
    return donations.map(donation => ({
      id: donation.id,
      amount: parseFloat(donation.amount.toString()),
      is_anonymous: donation.is_anonymous,
      created_at: donation.created_at,
      request: {
        id: donation.begs.id,
        title: donation.begs.title || 'Help Request',
        category: donation.begs.category,
        recipient_name: donation.is_anonymous 
          ? undefined 
          : donation.begs.app_users.user_profiles?.display_name || 'Anonymous',
        is_funded: donation.begs.status === 'funded',
      },
      gratitude: donation.gratitude_messages[0] ? {
        message: GRATITUDE_MESSAGES[donation.gratitude_messages[0].message_type as 1 | 2 | 3],
        donor_replied: donation.gratitude_messages[0].donor_replied,
      } : undefined,
    }));
  }
  
  // ============================================
  // HELPER: INITIALIZE PAYMENT
  // ============================================
  
  private async initializePayment(payment: PaymentRequest): Promise<PaymentResponse & { authorization_url?: string }> {
    // TODO: Replace with actual payment gateway (Paystack)
    // This should NOT confirm payment - only get authorization URL
    
    // Example Paystack implementation:
    /*
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payment.metadata?.donor_email || 'donor@pliz.com',
        amount: payment.amount * 100, // Convert to kobo
        reference: payment.reference,
        callback_url: `${process.env.APP_URL}/api/webhooks/paystack`,
        metadata: payment.metadata,
      }),
    });
    
    const data = await response.json();
    
    return {
      success: data.status,
      reference: payment.reference,
      authorization_url: data.data.authorization_url,
    };
    */
    
    // Placeholder for MVP testing
    return {
      success: true,
      reference: payment.reference,
      authorization_url: `https://checkout.paystack.com/test/${payment.reference}`,
    };
  }
}

export default new DonorService();
