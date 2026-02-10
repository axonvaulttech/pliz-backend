import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { SessionService } from '../../services/session.service';
import { EmailService } from '../../services/emailService';
import { CacheService } from '../../services/cacheService';
import { IPasswordResetRequest, IApiResponse } from '../../types/user.interface';
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
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body as IPasswordResetRequest;

    logger.info('Password reset attempt', {
      token: token.substring(0, 10) + '...',
    });

    // Verify token from cache
    const email = await CacheService.verifyPasswordResetToken(token);

    if (!email) {
      logger.warn('Password reset: Invalid or expired token');
      const response: IApiResponse = {
        success: false,
        message: 'Invalid or expired reset token. Please request a new one.',
      };
      sendResponse(res, 400, response);
      return;
    }

    // Find user
    const user = await UserService.findByEmail(email);

    if (!user) {
      logger.error('Password reset: User not found', { email });
      const response: IApiResponse = {
        success: false,
        message: 'User not found',
      };
      sendResponse(res, 404, response);
      return;
    }

    // Update password
    await UserService.updatePassword(user.id, newPassword);

    // Delete reset token from cache
    await CacheService.deletePasswordResetToken(email);

    // Delete user session from cache
    await CacheService.deleteUserSession(user.id);

    // Deactivate all sessions (force re-login on all devices)
    await SessionService.deactivateAllUserSessions(user.id);

    logger.info('Password reset successful', { email, userId: user.id });

    // Send confirmation email
    EmailService.sendPasswordChangedEmail(email, user.username).catch(
      (error) => {
        logger.error('Failed to send password changed email', {
          error,
          email,
        });
      }
    );

    const response: IApiResponse = {
      success: true,
      message:
        'Password has been reset successfully. Please login with your new password.',
    };
    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Reset password error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Failed to reset password. Please try again.',
    };
    sendResponse(res, 500, response);
  }
};