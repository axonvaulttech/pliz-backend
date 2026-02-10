import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../services/tokenService';
import { EmailService } from '../../services/emailService';
import { CacheService } from '../../services/cacheService';
import { IApiResponse } from '../../types/user.interface';
import logger from '../../../../config/logger';

/**
 * Helper to send response
 */
const sendResponse = <T = any>(
  res: Response,
  statusCode: number,
  response: IApiResponse<T>
): void => {
  res.status(statusCode).json(response);
};

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link (only if not verified)
 * @access  Public
 */
export const resendVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    logger.info('Resend verification request', { email, ip: req.ip });

    // Find user
    const user = await UserService.findByEmail(email);

    if (!user) {
      logger.warn('Resend verification: User not found', { email });
      const response: IApiResponse = {
        success: false,
        message: 'No account found with this email address.',
      };
      sendResponse(res, 404, response);
      return;
    }

    // Check if already verified
    if (user.isEmailVerified) {
      logger.info('Resend verification: Email already verified', {
        email,
        userId: user.id,
      });
      const response: IApiResponse = {
        success: false,
        message: 'This email is already verified. You can login.',
      };
      sendResponse(res, 400, response);
      return;
    }

    // Generate new verification token
    const emailToken = TokenService.generateEmailToken();

    // Store token in Redis cache (expires in 24 hours)
    await CacheService.storeEmailToken(email.toLowerCase(), emailToken, 86400);

    // Send verification email
    EmailService.sendVerificationEmail(email, emailToken).catch((error) => {
      logger.error('Failed to send verification email', { error, email });
    });

    logger.info('Verification email resent', { email, userId: user.id });

    const response: IApiResponse = {
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    };
    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Resend verification error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Failed to resend verification email. Please try again.',
    };
    sendResponse(res, 500, response);
  }
};