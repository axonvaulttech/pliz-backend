// ========== SESSION: Logout from all other sessions (keep current device) ==========

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
 * @route   DELETE /api/sessions/others
 * @desc    Logout from all other sessions (keep current device)
 * @access  Private
 */
export const deleteOtherSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const currentSessionId = req.user?.sessionId;

    if (!userId || !currentSessionId) {
      const response: IApiResponse = {
        success: false,
        message: 'Unauthorized',
      };
      sendResponse(res, 401, response);
      return;
    }

    // Deactivate all sessions except current
    const count = await SessionService.deactivateOtherSessions(
      userId,
      currentSessionId
    );

    logger.info('Other sessions deleted', { userId, count });

    const response: IApiResponse = {
      success: true,
      message: 'Logged out from all other sessions successfully',
      data: {
        sessionsLoggedOut: count,
      },
    };

    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Delete other sessions error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Failed to logout from other sessions',
    };
    sendResponse(res, 500, response);
  }
};