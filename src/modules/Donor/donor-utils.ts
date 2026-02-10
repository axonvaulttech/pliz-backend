// src/modules/Donor/donor.validators.ts

import { z } from 'zod';

/**
 * Validation schemas for Donor module
 */

export const donationAmountSchema = z.number()
  .positive('Amount must be positive')
  .min(100, 'Minimum donation is ₦100')
  .max(100000, 'Maximum donation is ₦100,000')
  .refine(
    (val) => Number.isFinite(val),
    'Amount must be a valid number'
  );

export const uuidSchema = z.string().uuid('Invalid ID format');

export const paymentMethodSchema = z.enum(['card', 'transfer', 'ussd'], {
  errorMap: () => ({ message: 'Payment method must be card, transfer, or ussd' }),
});

// ============================================
// src/modules/Donor/donor.utils.ts
// ============================================

/**
 * Utility functions for Donor module
 */

/**
 * Format currency amount (NGN)
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculate percentage of goal reached
 */
export function calculatePercentage(raised: number, requested: number): number {
  if (requested === 0) return 0;
  return Math.min(100, Math.round((raised / requested) * 100));
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-NG');
}

/**
 * Generate a unique reference ID
 */
export function generateReference(prefix: string = 'REF'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Sanitize amount to 2 decimal places
 */
export function sanitizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Check if donation is significant (>= ₦5000)
 */
export function isSignificantDonation(amount: number): boolean {
  return amount >= 5000;
}

/**
 * Get impact level based on amount
 */
export function getImpactLevel(amount: number): 'small' | 'medium' | 'large' {
  if (amount < 1000) return 'small';
  if (amount < 5000) return 'medium';
  return 'large';
}

/**
 * Calculate donation fee (if applicable)
 * For now, no fees - but this is where you'd add it
 */
export function calculateFee(amount: number): number {
  // Example: 1.5% + ₦100 transaction fee
  // return Math.round((amount * 0.015 + 100) * 100) / 100;
  
  // No fees for MVP
  return 0;
}

/**
 * Mask card number for display
 */
export function maskCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\d(?=\d{4})/g, '*');
}

/**
 * Generate donation receipt data
 */
export function generateReceiptData(donation: any) {
  return {
    receipt_number: generateReference('RCP'),
    date: new Date(),
    amount: donation.amount,
    payment_method: donation.payment_method,
    payment_reference: donation.payment_reference,
    request_id: donation.request_id,
    is_anonymous: donation.is_anonymous,
  };
}

/**
 * Validate donation amount against beg remaining
 */
export function validateDonationAmount(
  amount: number,
  amountRequested: number,
  amountRaised: number
): { valid: boolean; error?: string; adjustedAmount?: number } {
  const remaining = amountRequested - amountRaised;
  
  if (remaining <= 0) {
    return {
      valid: false,
      error: 'This request is already fully funded',
    };
  }
  
  if (amount > remaining) {
    return {
      valid: true,
      adjustedAmount: remaining,
    };
  }
  
  return { valid: true };
}

/**
 * Get category icon/emoji
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Food & Essentials': '🍽️',
    'Transport': '🚗',
    'Rent & Utilities': '🏠',
    'Health & Personal Care': '💊',
    'Education & Skills': '📚',
    'Family & Emergencies': '👨‍👩‍👧‍👦',
    'Work & Hustle Support': '💼',
    'Just Need Help': '🤝',
  };
  
  return icons[category] || '💚';
}

/**
 * Calculate estimated time to fund based on current rate
 */
export function estimateTimeToFund(
  amountRemaining: number,
  recentDonations: any[]
): string | null {
  if (recentDonations.length === 0) return null;
  
  // Calculate average donation per hour (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTotal = recentDonations
    .filter(d => new Date(d.created_at) > oneDayAgo)
    .reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
  
  const hoursElapsed = 24;
  const ratePerHour = recentTotal / hoursElapsed;
  
  if (ratePerHour === 0) return null;
  
  const hoursRemaining = Math.ceil(amountRemaining / ratePerHour);
  
  if (hoursRemaining < 1) return 'Less than 1 hour';
  if (hoursRemaining < 24) return `~${hoursRemaining} hours`;
  const daysRemaining = Math.ceil(hoursRemaining / 24);
  return `~${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
}
