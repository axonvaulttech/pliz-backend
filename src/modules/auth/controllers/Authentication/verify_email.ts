import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
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
 * @route   GET /api/auth/verify-email
 * @desc    Verify user email with token
 * @access  Public
 */
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      const response: IApiResponse = {
        success: false,
        message: 'Verification token is required',
      };
      sendResponse(res, 400, response);
      return;
    }

    logger.info('Email verification attempt', { token: token.substring(0, 10) });

    // Verify token from Redis cache
    const email = await CacheService.verifyEmailToken(token);

    if (!email) {
      logger.warn('Invalid or expired verification token', { token: token.substring(0, 10) });
      const response: IApiResponse = {
        success: false,
        message: 'Invalid or expired verification token',
      };
      sendResponse(res, 400, response);
      return;
    }

    // Find user
    const user = await UserService.findByEmail(email);

    if (!user) {
      logger.warn('User not found during verification', { email });
      const response: IApiResponse = {
        success: false,
        message: 'User not found',
      };
      sendResponse(res, 404, response);
      return;
    }

    // Check if already verified
    if (user.isEmailVerified) {
      logger.info('Email already verified', { email, userId: user.id });
      const response: IApiResponse = {
        success: true,
        message: 'Email is already verified. You can login.',
      };
      sendResponse(res, 200, response);
      return;
    }

    // Verify email - this will set both isEmailVerified and emailVerifiedAt
    await UserService.verifyEmail(email);

    // Delete verification token from cache
    await CacheService.deleteEmailToken(email);

    logger.info('Email verified successfully', { email, userId: user.id });

    const response: IApiResponse = {
      success: true,
      message: 'Email verified successfully! You can now login.',
    };
    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Email verification error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Email verification failed. Please try again.',
    };
    sendResponse(res, 500, response);
  }
};