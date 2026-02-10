// ========== CACHE: Redis cache service for tokens and sessions ==========

import redisClient from '../../../config/redis';
import logger from '../../../config/logger';

/**
 * Cache Service
 * Handles Redis operations for authentication
 */
export class CacheService {
  /**
   * Blacklist a token (for logout)
   */
  static async blacklistToken(token: string, expirySeconds: number = 900): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `blacklist:${token}`;
      
      await client.setEx(key, expirySeconds, 'true');
      
      logger.info('Token blacklisted', { 
        tokenPrefix: token.substring(0, 20) + '...',
        expirySeconds 
      });
    } catch (error) {
      logger.error('Failed to blacklist token', { error });
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const key = `blacklist:${token}`;
      
      const result = await client.get(key);
      return result !== null;
    } catch (error) {
      logger.error('Failed to check token blacklist', { error });
      // If Redis fails, allow the request (fail open for availability)
      return false;
    }
  }

  /**
   * Cache user session data
   */
  static async cacheUserSession(
    userId: string,
    userData: any,
    expirySeconds: number = 900
  ): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `session:${userId}`;
      
      await client.setEx(key, expirySeconds, JSON.stringify(userData));
      
      logger.debug('User session cached', { userId });
    } catch (error) {
      logger.error('Failed to cache user session', { error, userId });
      // Don't throw - caching is optional
    }
  }

  /**
   * Get cached user session
   */
  static async getUserSession(userId: string): Promise<any | null> {
    try {
      const client = redisClient.getClient();
      const key = `session:${userId}`;
      
      const data = await client.get(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get user session from cache', { error, userId });
      return null;
    }
  }

  /**
   * Delete user session from cache
   */
  static async deleteUserSession(userId: string): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `session:${userId}`;
      
      await client.del(key);
      
      logger.debug('User session deleted from cache', { userId });
    } catch (error) {
      logger.error('Failed to delete user session', { error, userId });
      // Don't throw - cache deletion is optional
    }
  }

  /**
   * Store email verification token
   */
  static async storeEmailToken(
    email: string,
    token: string,
    expirySeconds: number = 86400
  ): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `email_token:${email}`;
      
      await client.setEx(key, expirySeconds, token);
      
      logger.info('Email verification token stored', { email });
    } catch (error) {
      logger.error('Failed to store email token', { error, email });
      throw error;
    }
  }

  /**
   * Verify email token
   */
  static async verifyEmailToken(token: string): Promise<string | null> {
    try {
      const client = redisClient.getClient();
      const keys = await client.keys('email_token:*');
      
      for (const key of keys) {
        const storedToken = await client.get(key);
        if (storedToken === token) {
          const email = key.replace('email_token:', '');
          return email;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to verify email token', { error });
      return null;
    }
  }

  /**
   * Delete email token
   */
  static async deleteEmailToken(email: string): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `email_token:${email}`;
      
      await client.del(key);
      
      logger.debug('Email token deleted', { email });
    } catch (error) {
      logger.error('Failed to delete email token', { error, email });
    }
  }

  /**
   * Store password reset token
   */
  static async storePasswordResetToken(
    email: string,
    token: string,
    expirySeconds: number = 3600
  ): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `password_reset:${email}`;
      
      await client.setEx(key, expirySeconds, token);
      
      logger.info('Password reset token stored', { email });
    } catch (error) {
      logger.error('Failed to store password reset token', { error, email });
      throw error;
    }
  }

  /**
   * Verify password reset token
   */
  static async verifyPasswordResetToken(token: string): Promise<string | null> {
    try {
      const client = redisClient.getClient();
      const keys = await client.keys('password_reset:*');
      
      for (const key of keys) {
        const storedToken = await client.get(key);
        if (storedToken === token) {
          const email = key.replace('password_reset:', '');
          return email;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to verify password reset token', { error });
      return null;
    }
  }

  /**
   * Delete password reset token
   */
  static async deletePasswordResetToken(email: string): Promise<void> {
    try {
      const client = redisClient.getClient();
      const key = `password_reset:${email}`;
      
      await client.del(key);
      
      logger.debug('Password reset token deleted', { email });
    } catch (error) {
      logger.error('Failed to delete password reset token', { error, email });
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  static async clearAll(): Promise<void> {
    try {
      const client = redisClient.getClient();
      await client.flushDb();
      
      logger.warn('All cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
      throw error;
    }
  }
}