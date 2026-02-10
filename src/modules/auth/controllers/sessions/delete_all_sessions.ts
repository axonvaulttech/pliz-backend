// ========== SESSION: Logout from all sessions (all devices) ==========

import { Request, Response } from 'express';
import { SessionService } from '../../services/session.service';
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
 * @route   DELETE /api/sessions/all
 * @desc    Logout from all sessions (all devices)
 * @access  Private
 */
export const deleteAllSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      const response: IApiResponse = {
        success: false,
        message: 'Unauthorized',
      };
      sendResponse(res, 401, response);
      return;
    }

    // Deactivate all sessions
    const count = await SessionService.deactivateAllUserSessions(userId);

    logger.info('All sessions deleted', { userId, count });

    const response: IApiResponse = {
      success: true,
      message: 'Logged out from all sessions successfully',
      data: {
        sessionsLoggedOut: count,
      },
    };

    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Delete all sessions error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Failed to logout from all sessions',
    };
    sendResponse(res, 500, response);
  }
};