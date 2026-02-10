import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { IUserResponse, IApiResponse } from '../../types/user.interface';
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
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // User ID is attached to req by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      logger.warn('Get current user: No user ID in request');
      const response: IApiResponse = {
        success: false,
        message: 'User not authenticated',
      };
      sendResponse(res, 401, response);
      return;
    }

    logger.info('Get current user request', { userId });

    // Get user from database
    const user = await UserService.findById(userId);

    if (!user) {
      logger.warn('Get current user: User not found', { userId });
      const response: IApiResponse = {
        success: false,
        message: 'User not found',
      };
      sendResponse(res, 404, response);
      return;
    }

    // Prepare user response (excluding password hash)
    const userResponse: IUserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    logger.info('Current user retrieved successfully', { userId: user.id });

    const response: IApiResponse<{ user: IUserResponse }> = {
      success: true,
      message: 'User retrieved successfully',
      data: { user: userResponse },
    };
    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Get current user error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Failed to retrieve user information',
    };
    sendResponse(res, 500, response);
  }
};