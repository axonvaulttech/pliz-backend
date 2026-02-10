// ========== DATABASE: Signup with email verification ==========

import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../services/tokenService';
import { EmailService } from '../../services/emailService'; 
import { CacheService } from '../../services/cacheService'; 
import {
  IRegisterRequest,
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
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as IRegisterRequest;

    logger.info('Registration attempt', {
      username,
      email,
      ip: req.ip,
    });

    // Check if user already exists
    const existingUser = await UserService.findByEmailOrUsername(
      email,
      username
    );

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        logger.warn('Registration failed: Email already exists', { email });
        sendResponse(res, 409, {
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      if (existingUser.username === username) {
        logger.warn('Registration failed: Username already exists', {
          username,
        });
        sendResponse(res, 409, {
          success: false,
          message: 'Username already taken',
        });
        return;
      }
    }

    // LOG: Email verification is disabled by default
    logger.info('Creating user with email verification disabled', {
      username,
      email,
      isEmailVerified: false,
    });

    // Create user
    const user = await UserService.createUser({
      username,
      email,
      password,
    });

    // ========== EMAIL & CACHE: Generate and store email verification token ==========
    const emailToken = TokenService.generateEmailToken();

    // Store token in Redis cache (expires in 24 hours)
    await CacheService.storeEmailToken(
      email.toLowerCase(),
      emailToken,
      86400
    );

    logger.info('Email verification token generated', {
      email,
      expiresIn: '24h',
    });

    // Send verification email (non-blocking)
    EmailService.sendVerificationEmail(email, emailToken).catch((error) => {
      logger.error('Failed to send verification email', { error, email });
    });

    logger.info('User registered successfully', {
      userId: user.id,
      username,
      email,
    });

    // Prepare response
    const userResponse: IUserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    sendResponse(res, 201, {
      success: true,
      message:
        'Registration successful! Please check your email for verification link.',
      data: {
        user: userResponse,
      },
    });
  } catch (error: any) {
    logger.error('Registration error', {
      error: error.message,
      stack: error.stack,
    });

    // Prisma unique constraint
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] ?? 'field';
      sendResponse(res, 409, {
        success: false,
        message: `${field} already exists`,
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
};
