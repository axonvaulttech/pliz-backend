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
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
export const updateProfile = async (
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
      displayName,
      isAnonymous,
    } = req.body;

    logger.info('Update profile request', { userId });

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      sendResponse(res, 404, {
        success: false,
        message: 'Profile not found. Please complete your profile first.',
      });
      return;
    }

    // If updating phone number, check if it's already used by someone else
    if (phoneNumber && phoneNumber !== existingProfile.phoneNumber) {
      const existingPhone = await prisma.userProfile.findFirst({
        where: {
          phoneNumber,
          userId: { not: userId },
        },
      });

      if (existingPhone) {
        sendResponse(res, 409, { success: false, message: 'Phone number already registered' });
        return;
      }
    }

    // Update profile
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        firstName: firstName || existingProfile.firstName,
        middleName: middleName !== undefined ? middleName : existingProfile.middleName,
        lastName: lastName || existingProfile.lastName,
        phoneNumber: phoneNumber || existingProfile.phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existingProfile.dateOfBirth,
        gender: gender !== undefined ? gender : existingProfile.gender,
        state: state || existingProfile.state,
        city: city !== undefined ? city : existingProfile.city,
        displayName: displayName !== undefined ? displayName : existingProfile.displayName,
        isAnonymous: isAnonymous !== undefined ? isAnonymous : existingProfile.isAnonymous,
      },
    });

    logger.info('Profile updated successfully', { userId });

    sendResponse(res, 200, {
      success: true,
      message: 'Profile updated successfully',
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
    logger.error('Update profile error', {
      error: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, { success: false, message: 'Failed to update profile' });
  }
};