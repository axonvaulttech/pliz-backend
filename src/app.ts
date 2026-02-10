import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/routes/authRoutes';
import sessionRoutes from './modules/auth/routes/session.routes';
import { IApiResponse } from './modules/auth/types/user.interface';

/**
 * Create Express Application
 */
export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', sessionRoutes); // ← SESSION: Session management routes

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    const response: IApiResponse = {
      success: true,
      message: 'PLIZ API Server - PostgreSQL Multi-Session Auth',
      data: {
        version: '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          auth: '/api/auth',
          sessions: '/api/sessions', // ← SESSION
        },
        features: [
          'User Registration & Login',
          'Multi-Device Session Management',
          'JWT Authentication',
          'PostgreSQL Database',
          'Session Tracking & Control',
        ],
      },
    };
    res.json(response);
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const response: IApiResponse = {
      success: true,
      message: 'Server is healthy',
      data: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    const response: IApiResponse = {
      success: false,
      message: 'Route not found',
      data: {
        path: req.path,
        method: req.method,
      },
    };
    res.status(404).json(response);
  });

  // Global error handler
  app.use((error: any, req: Request, res: Response, next: any) => {
    console.error('Global error handler:', error);
    
    const response: IApiResponse = {
      success: false,
      message: error.message || 'Internal server error',
    };
    
    res.status(error.status || 500).json(response);
  });

  return app;
};