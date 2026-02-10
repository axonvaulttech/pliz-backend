// ========== DATABASE: User service using Prisma with PostgreSQL ==========
// Matches app_users table schema

import prisma from '../../../config/database';
import bcrypt from 'bcryptjs';
import logger from '../../../config/logger';
import { IUser } from '../types/user.interface';
import { SecurityConfig } from '../../../config/security';

/**
 * User Service
 * Handles all user database operations
 */
export class UserService {
  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SecurityConfig.bcrypt.saltRounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password
   */
  static async comparePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Password comparison failed', { error });
      return false;
    }
  }

  /**
   * Create a new user
   */
  static async createUser(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<IUser> {
    try {
      const hashedPassword = await this.hashPassword(data.password);

      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email.toLowerCase(),
          passwordHash: hashedPassword,
          isEmailVerified: false,
        
        },
      });

      logger.info('User created successfully', {
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', { error });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      return null;
    }
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<IUser | null> {
    try {
      return await prisma.user.findUnique({
        where: { username },
      });
    } catch (error) {
      logger.error('Failed to find user by username', { error, username });
      return null;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<IUser | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to find user by ID', { error, id });
      return null;
    }
  }

  /**
   * Find user by email or username
   */
  static async findByEmailOrUsername(
    email: string,
    username: string
  ): Promise<IUser | null> {
    try {
      return await prisma.user.findFirst({
        where: {
          OR: [{ email: email.toLowerCase() }, { username }],
        },
      });
    } catch (error) {
      logger.error('Failed to find user', { error, email, username });
      return null;
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(email: string): Promise<IUser | null> {
    try {
      const user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      logger.info('Email verified successfully', {
        userId: user.id,
        email,
      });

      return user;
    } catch (error) {
      logger.error('Failed to verify email', { error, email });
      return null;
    }
  }

  /**
   * Update password
   */
  static async updatePassword(
    userId: string,
    newPassword: string
  ): Promise<IUser | null> {
    try {
      const hashedPassword = await this.hashPassword(newPassword);

      return await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update password', { error, userId });
      return null;
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id: userId } });
      logger.info('User deleted successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete user', { error, userId });
      return false;
    }
  }
}
