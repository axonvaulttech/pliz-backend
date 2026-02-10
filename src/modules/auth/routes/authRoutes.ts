

import express from 'express';
import { signup } from '../controllers/Authentication/signup';
import { login } from '../controllers/Authentication/login';
import { logout } from '../controllers/Authentication/logout';
import { verifyEmail } from '../controllers/Authentication/verify_email';
import { forgotPassword } from '../controllers/Authentication/forget_password';
import { resetPassword } from '../controllers/Authentication/reset_password';
import { resendVerification } from '../controllers/Authentication/resend_verification';
import { getCurrentUser } from '../controllers/Authentication/get_current_user'; // ← Add
import { refreshToken } from '../controllers/Authentication/refresh_token';      // ← Add
import { authenticate } from '../middleware/auth/auth';
import { validateRequest } from '../middleware/auth/validateRequest';
import {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resendVerificationValidation,
  refreshTokenValidation, // ← Add
} from '../middleware/auth/validation';
import {
  authLimiter,
  generalLimiter,
} from '../middleware/auth/rateLimiter';

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/signup',
  authLimiter,
  signupValidation,
  validateRequest,
  signup
);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email', generalLimiter, verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  resendVerificationValidation,
  validateRequest,
  resendVerification
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  loginValidation,
  validateRequest,
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, getCurrentUser); // ← Add this

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  refreshTokenValidation,
  validateRequest,
  refreshToken
); // ← Add this

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  authLimiter,
  resetPasswordValidation,
  validateRequest,
  resetPassword
);

export default router;