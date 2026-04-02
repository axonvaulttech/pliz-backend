import { Request, Response } from 'express';
import prisma from '../../../../config/database';
import { IApiResponse } from '../../types/user.interface';
import logger from '../../../../config/logger';

const sendResponse = <T = any>(
  res: Response,
  statusCode: number,
  response: IApiResponse<T>
): void => {
  res.status(statusCode).json(response);
};

/**
 * @route   POST /api/auth/profile/complete
 * @desc    Complete user profile (Step 3: After email verification)
 * @access  Private
 */
export const completeProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const {
      firstName,
      middleName,
      lastName,
      phoneNumber,
      dateOfBirth,
      gender,
      state,
      city,
      agreeToTerms,
      displayName,
      isAnonymous,
    } = req.body;

    logger.info('Complete profile request', { userId });

    // Validate user exists and email is verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      sendResponse(res, 404, { success: false, message: 'User not found' });
      return;
    }

    if (!user.isEmailVerified) {
      sendResponse(res, 403, {
        success: false,
        message: 'Please verify your email before completing your profile',
      });
      return;
    }

    if (user.profile) {
      sendResponse(res, 400, {
        success: false,
        message: 'Profile already completed. Use update profile endpoint instead.',
      });
      return;
    }

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !dateOfBirth || !state || !city || agreeToTerms !== true) {
      sendResponse(res, 400, {
        success: false,
        message: 'First name, last name, phone number, date of birth, state and city are required. You must agree to terms.',
      });
      return;
    }

    // Check if phone number is already used
    const existingPhone = await prisma.userProfile.findFirst({
      where: { phoneNumber },
    });

    if (existingPhone) {
      sendResponse(res, 409, { success: false, message: 'Phone number already registered' });
      return;
    }

    // Create profile
    const profile = await prisma.userProfile.create({
      data: {
        userId,
        firstName,
        middleName: middleName || null,
        lastName,
        phoneNumber,
        dateOfBirth: new Date(dateOfBirth),
        gender: gender || null,
        state,
        city: city || null,
        agreeToTerms,
        displayName: displayName || `${firstName} ${lastName}`,
        isAnonymous: isAnonymous || false,
      },
    });

    // Mark user profile as complete
    await prisma.user.update({
      where: { id: userId },
      data: { isProfileComplete: true },
    });

    logger.info('Profile completed successfully', { userId });

    sendResponse(res, 201, {
      success: true,
      message: 'Profile completed successfully! You can now start using Pliz.',
      data: {
        profile: {
          firstName: profile.firstName,
          middleName: profile.middleName,
          lastName: profile.lastName,
          phoneNumber: profile.phoneNumber,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          state: profile.state,
          city: profile.city,
          displayName: profile.displayName,
          isAnonymous: profile.isAnonymous,
        },
      },
    });
  } catch (error: any) {
    logger.error('Complete profile error', {
      error: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, { success: false, message: 'Failed to complete profile' });
  }
};