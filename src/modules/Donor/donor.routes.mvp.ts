// src/modules/Donor/donor.routes.ts
// MVP VERSION - Essential routes with proper rate limiting

import { Router } from 'express';
import donorController from './donor.controller';
import { authenticateOptional, authenticateRequired } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rate-limit';

const router = Router();

/**
 * @route   POST /api/donor/donate
 * @desc    Initialize a donation (returns payment URL)
 * @access  Public (tracks user if authenticated)
 * @body    { request_id, amount, is_anonymous, payment_method }
 * 
 * Rate limit: 5 donations per minute per user/IP
 */
router.post(
  '/donate',
  rateLimiter({ 
    max: 5, 
    windowMs: 60 * 1000,
    message: 'Too many donation attempts. Please wait a minute.',
  }),
  authenticateOptional,
  donorController.donate.bind(donorController)
);

/**
 * @route   GET /api/donor/history
 * @desc    Get donation history (basic, no stats)
 * @access  Private
 * @query   ?limit=20
 */
router.get(
  '/history',
  authenticateRequired,
  donorController.getHistory.bind(donorController)
);

/**
 * @route   GET /api/donor/quick-amounts
 * @desc    Get suggested quick donation amounts
 * @access  Public
 */
router.get(
  '/quick-amounts',
  donorController.getQuickAmounts.bind(donorController)
);

export default router;
