import { Request, Response } from 'express';
import { SessionService } from '../../services/session.service';
import { ISessionResponse, IApiResponse } from '../../types/user.interface';
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
 * @route   GET /api/sessions
 * @desc    Get all active sessions for current user
 * @access  Private
 */
export const getSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // User ID and session ID are attached by auth middleware
    const userId = (req as any).user?.userId;
    const currentSessionId = (req as any).user?.sessionId;

    if (!userId) {
      const response: IApiResponse = {
        success: false,
        message: 'User not authenticated',
      };
      sendResponse(res, 401, response);
      return;
    }

    logger.info('Get sessions request', { userId });

    // Get all active sessions for user (already transformed)
    const sessions = await SessionService.getUserSessions(userId);

    // Format sessions for response
    const formattedSessions: ISessionResponse[] = sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      location: session.location,
      active: session.active,
      isCurrent: session.id === currentSessionId,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));

    logger.info('Sessions retrieved', {
      userId,
      sessionCount: formattedSessions.length,
    });

    const response: IApiResponse<{ sessions: ISessionResponse[] }> = {
      success: true,
      message: 'Sessions retrieved successfully',
      data: { sessions: formattedSessions },
    };
    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Get sessions error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Failed to retrieve sessions',
    };
    sendResponse(res, 500, response);
  }
};