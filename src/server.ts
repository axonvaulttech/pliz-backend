import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database';
import redisClient from './config/redis';
import { EmailService } from './modules/auth/services/emailService'; 
import logger from './config/logger';
import { createApp } from './app';

// Load environment variables
dotenv.config();

/**
 * Start Server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to PostgreSQL database
    await connectDB();

    // Connect to Redis
    await redisClient.connect();

    // ========== EMAIL: Initialize email service ==========
    EmailService.initialize();

    // Create Express app
    const app = createApp();

    // Start server
    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚀 PLIZ APP - Server Running                                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

✅ PostgreSQL connected
✅ Redis connected
✅ Email service initialized
✅ Server started successfully

📍 Port: ${PORT}
🌐 API: http://localhost:${PORT}/api
💚 Health: http://localhost:${PORT}/health
🔐 Auth: http://localhost:${PORT}/api/auth
📱 Sessions: http://localhost:${PORT}/api/sessions

Environment: ${process.env.NODE_ENV || 'development'}

Database: PostgreSQL (app_users, session_manager)
Cache: Redis (token blacklist, user sessions)
Email: ${process.env.EMAIL_HOST || 'Not configured'}
Rate Limiting: Enabled (${process.env.RATE_LIMIT_MAX_REQUESTS || 5} req/15min for auth)
      `);

      logger.info('Server started successfully', { port: PORT });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDB();
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDB();
  await redisClient.disconnect();
  process.exit(0);
});

// Start the server
startServer();