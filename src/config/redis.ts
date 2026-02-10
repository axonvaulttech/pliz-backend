import { createClient, RedisClientType } from 'redis';
import logger from './logger';

/**
 * Redis Client Configuration
 */
class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = `redis://${process.env.REDIS_HOST || 'localhost'}:${
      process.env.REDIS_PORT || 6379
    }`;

    this.client = createClient({
      url: redisUrl,
    });

    // Error handling
    this.client.on('error', (err) => {
      logger.error('Redis Client Error', { error: err });
    });

    // Connection events
    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('✅ Redis client connected and ready');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client disconnected');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Failed to connect to Redis', { error });
        throw error;
      }
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
      } catch (error) {
        logger.error('Failed to disconnect from Redis', { error });
      }
    }
  }

  /**
   * Get Redis Client
   */
  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && this.client.isReady;
  }
}

// Export singleton instance
const redisClient = new RedisClient();
export default redisClient;