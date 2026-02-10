import { TokenService } from '../../services/tokenService';
import { CacheService } from '../../services/cacheService';
import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { SessionService } from '../../services/session.service';
import {
  ILoginRequest,
  IUserResponse,
  IApiResponse,
} from '../../types/user.interface';
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
 * @route   POST /api/auth/login
 * @desc    Login user and create session
 * @access  Public
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as ILoginRequest;

    logger.info('Login attempt', { email, ip: req.ip });

    // Find user by email
    const user = await UserService.findByEmail(email);

    if (!user) {
      logger.warn('Login failed: User not found', { email });
      const response: IApiResponse = {
        success: false,
        message: 'Invalid email or password',
      };
      sendResponse(res, 401, response);
      return;
    }

    // Verify password
    const isPasswordValid = await UserService.comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      logger.warn('Login failed: Invalid password', {
        userId: user.id,
        email,
      });
      const response: IApiResponse = {
        success: false,
        message: 'Invalid email or password',
      };
      sendResponse(res, 401, response);
      return;
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      logger.warn('Login failed: Email not verified', {
        userId: user.id,
        email,
      });
      const response: IApiResponse = {
        success: false,
        message: 'Please verify your email before logging in',
      };
      sendResponse(res, 403, response);
      return;
    }

    // Get device and IP information
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = (
      req.ip ||
      req.socket.remoteAddress ||
      'Unknown'
    ).replace('::ffff:', '');

    // Generate refresh token
    const tempRefreshToken = TokenService.generateRefreshToken(
      user.id,
      user.email
    );

    // Create session (returns ISession with nested structure)
    const session = await SessionService.createSession(
      user.id,
      tempRefreshToken,
      userAgent,
      ipAddress
    );

    // Generate access token with sessionId
    const accessToken = TokenService.generateAccessToken(
      user.id,
      user.email,
      session.id
    );

    const refreshToken = tempRefreshToken;

    // Cache user session data
    await CacheService.cacheUserSession(
      user.id,
      {
        email: user.email,
        username: user.username,
        lastLogin: new Date(),
      },
      15 * 60 // 15 minutes
    );

    logger.info('Login successful', {
      userId: user.id,
      email,
      sessionId: session.id,
    });

    // Prepare response
    const userResponse: IUserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    };

    const response: IApiResponse<{
      user: IUserResponse;
      accessToken: string;
      refreshToken: string;
    }> = {
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
      },
    };

    sendResponse(res, 200, response);
  } catch (error: any) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
    });

    const response: IApiResponse = {
      success: false,
      message: 'Login failed. Please try again.',
    };
    sendResponse(res, 500, response);
  }
};