// src/modules/Donor/types.ts

import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateDonationRequest {
  request_id: string;
  amount: number;
  is_anonymous?: boolean;
  payment_method: 'card' | 'transfer' | 'ussd';
  save_card?: boolean;
}

export interface CreateDonationResponse {
  success: boolean;
  donation?: {
    id: string;
    amount: number;
    request_id: string;
    is_anonymous: boolean;
    payment_reference: string;
    created_at: Date;
  };
  gratitude_message?: {
    message: string;
    type: number;
  };
  milestone?: {
    achieved: boolean;
    title: string;
    message: string;
  };
  error?: string;
}

export interface DonationHistoryResponse {
  donations: DonationHistoryItem[];
  stats: {
    total_donated: number;
    people_helped: number;
    avg_donation: number;
  };
  milestones: DonorMilestone[];
}

export interface DonationHistoryItem {
  id: string;
  amount: number;
  is_anonymous: boolean;
  created_at: Date;
  status: string;
  request: {
    id: string;
    title: string;
    category: string;
    recipient_name?: string;
    is_funded: boolean;
  };
  gratitude?: {
    message: string;
    donor_replied: boolean;
  };
}

export interface DonorImpactResponse {
  total_donated: number;
  people_helped: number;
  impact_stories: ImpactStory[];
  this_week: {
    people_helped: number;
    amount_donated: number;
  };
}

export interface ImpactStory {
  donation_id: string;
  amount: number;
  category: string;
  impact_message: string;
  created_at: Date;
}

export interface DonorMilestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  achieved_at?: Date;
  progress?: {
    current: number;
    target: number;
  };
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface PaymentRequest {
  amount: number;
  method: 'card' | 'transfer' | 'ussd';
  reference: string;
  donor_id?: string;
  metadata?: {
    request_id: string;
    is_anonymous: boolean;
  };
}

export interface PaymentResponse {
  success: boolean;
  reference: string;
  gateway_reference?: string;
  error?: string;
  error_code?: string;
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

// ============================================
// GRATITUDE TYPES
// ============================================

export interface GratitudeMessage {
  id: string;
  donation_id: string;
  message_type: 1 | 2 | 3;
  message: string;
  donor_reply_allowed: boolean;
  donor_replied: boolean;
  created_at: Date;
}

export interface ReplyToGratitudeRequest {
  gratitude_id: string;
  reply_type: 'welcome' | 'custom';
  custom_message?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const GRATITUDE_MESSAGES = {
  1: "Thank you so much! Your kindness means the world to me. 🙏",
  2: "I'm truly grateful for your help. This makes a huge difference! ❤️",
  3: "Your generosity brought me hope today. Thank you from the bottom of my heart! 🌟",
} as const;

export const DONOR_REPLY_MESSAGES = {
  welcome: "You're welcome! Glad I could help! 😊",
} as const;

export const QUICK_DONATION_AMOUNTS = [1000, 2000, 3000, 5000] as const;

export const MILESTONE_DEFINITIONS = [
  {
    id: 'first_help',
    title: 'First Help Given',
    description: 'Made your first donation',
    condition: (stats: any) => stats.total_donated > 0,
  },
  {
    id: 'five_people',
    title: '5 People Helped',
    description: 'Helped 5 different people',
    condition: (stats: any) => stats.people_helped >= 5,
  },
  {
    id: 'ten_people',
    title: '10 People Helped',
    description: 'Helped 10 different people',
    condition: (stats: any) => stats.people_helped >= 10,
  },
  {
    id: 'total_25k',
    title: '₦25,000 Given',
    description: 'Donated ₦25,000 in total',
    condition: (stats: any) => parseFloat(stats.total_donated) >= 25000,
  },
  {
    id: 'total_50k',
    title: '₦50,000 Given',
    description: 'Donated ₦50,000 in total',
    condition: (stats: any) => parseFloat(stats.total_donated) >= 50000,
  },
  {
    id: 'total_100k',
    title: '₦100,000 Given',
    description: 'Donated ₦100,000 in total',
    condition: (stats: any) => parseFloat(stats.total_donated) >= 100000,
  },
] as const;

// ============================================
// DATABASE TYPES (from Prisma)
// ============================================

export interface DonationRecord {
  id: string;
  request_id: string;
  donor_id: string | null;
  amount: Decimal;
  is_anonymous: boolean;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  created_at: Date;
}

export interface DonorStats {
  user_id: string;
  total_donated: Decimal;
  total_received: Decimal;
  requests_count: number;
  abuse_flags: number;
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface DonationValidationError {
  field: string;
  message: string;
  code: string;
}

export interface DonationValidationResult {
  valid: boolean;
  errors?: DonationValidationError[];
}
