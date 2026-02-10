// src/services/trust-engine.ts
// Trust Engine - MVP version (always allows, but wired for future)

import { PrismaClient } from '@prisma/client';
import { logSuspiciousActivity } from '../logger/pliz-events';

const prisma = new PrismaClient();

interface DonationCheckParams {
  userId?: string;
  amount: number;
  requestId: string;
  ip?: string;
}

interface TrustCheckResult {
  allowed: boolean;
  reason?: string;
  requiresVerification?: boolean;
}

export class TrustEngine {
  
  /**
   * Check if a donation is allowed
   * MVP: Always returns true, but logs suspicious patterns
   * Future: Add fraud detection, velocity checks, etc.
   */
  async canDonate(params: DonationCheckParams): Promise<TrustCheckResult> {
    try {
      // MVP: Basic checks only
      
      // 1. Check if user is flagged
      if (params.userId) {
        const stats = await prisma.user_stats.findUnique({
          where: { user_id: params.userId },
        });
        
        if (stats && stats.abuse_flags > 0) {
          logSuspiciousActivity({
            userId: params.userId,
            activityType: 'donation_attempt_with_flags',
            details: {
              abuseFlags: stats.abuse_flags,
              requestId: params.requestId,
              amount: params.amount,
            },
          });
          
          // For MVP: Still allow, but log
          // Future: Block if flags > threshold
        }
      }
      
      // 2. Check donation velocity (same IP, multiple donations)
      if (params.ip) {
        const recentDonations = await this.getRecentDonationsByIp(params.ip);
        
        if (recentDonations.length > 10) {
          logSuspiciousActivity({
            userId: params.userId || 'anonymous',
            activityType: 'high_velocity_donations',
            details: {
              ip: params.ip,
              recentCount: recentDonations.length,
              amount: params.amount,
            },
          });
          
          // For MVP: Still allow, but log
          // Future: Require CAPTCHA or block
        }
      }
      
      // 3. Check if donating to own request
      if (params.userId) {
        const beg = await prisma.begs.findUnique({
          where: { id: params.requestId },
        });
        
        if (beg && beg.user_id === params.userId) {
          logSuspiciousActivity({
            userId: params.userId,
            activityType: 'self_donation_attempt',
            details: {
              requestId: params.requestId,
              amount: params.amount,
            },
          });
          
          // Block self-donations (this is MVP rule)
          return {
            allowed: false,
            reason: 'You cannot donate to your own request',
          };
        }
      }
      
      // 4. Check unusually large donations (potential card testing)
      if (params.amount > 50000) {
        logSuspiciousActivity({
          userId: params.userId || 'anonymous',
          activityType: 'large_donation_attempt',
          details: {
            amount: params.amount,
            requestId: params.requestId,
          },
        });
        
        // For MVP: Still allow, but log
        // Future: Require verification for amounts > ₦50k
      }
      
      // MVP: Allow all donations (except self-donations)
      return { allowed: true };
      
    } catch (error: any) {
      console.error('Trust engine error:', error);
      
      // On error, allow but log
      return { allowed: true };
    }
  }
  
  /**
   * Get recent donations from IP (last 1 hour)
   */
  private async getRecentDonationsByIp(ip: string): Promise<any[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Note: You'd need to store IP with donations for this to work
    // For MVP, you can skip this or implement later
    
    return [];
  }
  
  /**
   * Future methods to implement:
   * - canCreateBeg(userId, amount)
   * - canRequestPayout(userId, begId)
   * - canReportUser(reporterId, targetId)
   * - etc.
   */
}

export const trustEngine = new TrustEngine();
