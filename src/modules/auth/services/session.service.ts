// ========== SESSION: Session service using Prisma with PostgreSQL ==========
// Matches session_manager table schema

import prisma from '../../../config/database';
import { IDeviceInfo, ISessionResponse, ISession } from '../types/user.interface';
import logger from '../../../config/logger';
import { SecurityConfig } from '../../../config/security';

/**
 * Session Service
 * Handles all multi-session management operations
 */
export class SessionService {
  /**
   * Parse User Agent to extract device information
   */
  static parseUserAgent(userAgent: string): IDeviceInfo {
    const deviceInfo: IDeviceInfo = {
      userAgent,
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Desktop',
    };

    // Detect Browser
    if (userAgent.includes('Edg')) deviceInfo.browser = 'Edge';
    else if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR'))
      deviceInfo.browser = 'Opera';

    // Detect Operating System
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh'))
      deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad'))
      deviceInfo.os = 'iOS';

    // Detect Device Type
    if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad'))
      deviceInfo.device = 'Tablet';
    else deviceInfo.device = 'Desktop';

    return deviceInfo;
  }

  /**
   * Transform Prisma session to ISession interface
   * Converts flat database structure to nested interface structure
   */
  private static transformToISession(prismaSession: any): ISession {
    return {
      id: prismaSession.id,
      userId: prismaSession.userId,
      deviceInfo: {
        userAgent: prismaSession.userAgent || 'Unknown',
        browser: prismaSession.browser || 'Unknown',
        os: prismaSession.os || 'Unknown',
        device: prismaSession.device || 'Desktop',
      },
      ipAddress: prismaSession.ipAddress || 'Unknown',
      location: {
        country: prismaSession.country || undefined,
        city: prismaSession.city || undefined,
      },
      active: prismaSession.active,
      lastActive: prismaSession.lastActive,
      createdAt: prismaSession.createdAt,
      expiresAt: prismaSession.expiresAt,
    };
  }

  /**
   * Create a new session
   * ========== SESSION: Creates session in session_manager table ==========
   */
  static async createSession(
    userId: string,
    refreshToken: string,
    userAgent: string,
    ipAddress: string
  ): Promise<ISession> {
    try {
      const deviceInfo = this.parseUserAgent(userAgent);

      // Calculate expiry (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SecurityConfig.session.expiryDays);

      const session = await prisma.session.create({
        data: {
          userId,
          refreshToken,
          userAgent: deviceInfo.userAgent,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device: deviceInfo.device,
          ipAddress,
          active: true,
          lastActive: new Date(),
          expiresAt,
        },
      });

      logger.info('Session created successfully', {
        userId,
        sessionId: session.id,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ipAddress,
      });

      // Transform to ISession interface before returning
      return this.transformToISession(session);
    } catch (error) {
      logger.error('Failed to create session', { error, userId });
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(
    userId: string,
    currentSessionId?: string
  ): Promise<ISessionResponse[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          active: true,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActive: 'desc' },
      });

      return sessions.map((session) => ({
        id: session.id,
        deviceInfo: {
          userAgent: session.userAgent || 'Unknown',
          browser: session.browser || 'Unknown',
          os: session.os || 'Unknown',
          device: session.device || 'Desktop',
        },
        ipAddress: session.ipAddress || 'Unknown',
        location: {
          country: session.country || undefined,
          city: session.city || undefined,
        },
        active: session.active,
        isCurrent: currentSessionId === session.id,
        lastActive: session.lastActive,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }));
    } catch (error) {
      logger.error('Failed to get user sessions', { error, userId });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static async getSessionById(sessionId: string): Promise<ISession | null> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) return null;

      // Transform to ISession interface
      return this.transformToISession(session);
    } catch (error) {
      logger.error('Failed to get session by ID', { error, sessionId });
      return null;
    }
  }

  /**
   * Get session by refresh token (unified method)
   * Replaces both getSessionByRefreshToken and findSessionByRefreshToken
   */
  static async findSessionByRefreshToken(
    refreshToken: string
  ): Promise<ISession | null> {
    try {
      const session = await prisma.session.findFirst({
        where: {
          refreshToken,
          active: true,
        },
      });

      if (!session) return null;

      // Transform to ISession interface
      return this.transformToISession(session);
    } catch (error) {
      logger.error('Failed to get session by refresh token', { error });
      return null;
    }
  }

  /**
   * Alias for findSessionByRefreshToken (for backward compatibility)
   */
  static async getSessionByRefreshToken(
    refreshToken: string
  ): Promise<ISession | null> {
    return this.findSessionByRefreshToken(refreshToken);
  }

  /**
   * Update session last active time
   */
  static async updateLastActive(sessionId: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActive: new Date() },
      });
    } catch (error) {
      logger.error('Failed to update session last active', { error, sessionId });
    }
  }

  /**
   * Deactivate a specific session
   */
  static async deactivateSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { active: false },
      });

      logger.info('Session deactivated successfully', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to deactivate session', { error, sessionId });
      return false;
    }
  }

  /**
   * Deactivate all sessions for a user
   */
  static async deactivateAllUserSessions(userId: string): Promise<number> {
    try {
      const result = await prisma.session.updateMany({
        where: {
          userId,
          active: true,
        },
        data: { active: false },
      });

      logger.info('All user sessions deactivated', {
        userId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to deactivate all user sessions', { error, userId });
      return 0;
    }
  }

  /**
   * Deactivate all sessions except current
   */
  static async deactivateOtherSessions(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    try {
      const result = await prisma.session.updateMany({
        where: {
          userId,
          id: { not: currentSessionId },
          active: true,
        },
        data: { active: false },
      });

      logger.info('Other user sessions deactivated', {
        userId,
        currentSessionId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to deactivate other sessions', {
        error,
        userId,
        currentSessionId,
      });
      return 0;
    }
  }

  /**
   * Delete expired sessions (cleanup job)
   */
  static async deleteExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      logger.info('Expired sessions deleted', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Failed to delete expired sessions', { error });
      return 0;
    }
  }

  /**
   * Count active sessions for a user
   */
  static async countUserSessions(userId: string): Promise<number> {
    try {
      return await prisma.session.count({
        where: {
          userId,
          active: true,
          expiresAt: { gt: new Date() },
        },
      });
    } catch (error) {
      logger.error('Failed to count user sessions', { error, userId });
      return 0;
    }
  }
}