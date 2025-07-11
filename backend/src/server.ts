import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
import recommendationRouter from './routes/recommendation';
import { errorHandler } from './middleware/errorHandler';
import { validateEnv } from './utils/validateEnv';
import { logger } from './utils/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

validateEnv();

const app: Express = express();
const PORT = process.env.PORT || 8001;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
db.connect((err, _client, release) => {
  if (err) {
    logger.error('Error acquiring database client', err.stack);
  } else {
    logger.info('Database connected successfully');
    release();
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
}));

// CORS configuration - MUST BE BEFORE ROUTES
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(',');
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoints
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await db.query('SELECT NOW()');
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      dbTime: dbCheck.rows[0].now
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// Readiness check
app.get('/ready', (_req: Request, res: Response) => {
  res.json({ 
    ready: true,
    timestamp: new Date().toISOString()
  });
});

// API Routes - Apply rate limiting only to API routes
app.use('/api/', limiter);
app.use('/api', recommendationRouter);
app.use('/api/auth', authRouter);

// Serve API documentation
app.get('/api/docs', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/auth/register',
        method: 'POST',
        description: 'Register a new user',
        requestBody: {
          email: 'string',
          password: 'string (min 6 chars)',
          name: 'string'
        }
      },
      {
        path: '/api/auth/login',
        method: 'POST',
        description: 'Login user',
        requestBody: {
          email: 'string',
          password: 'string'
        }
      },
      {
        path: '/api/auth/profile',
        method: 'GET',
        description: 'Get user profile (requires auth token)',
        headers: {
          Authorization: 'Bearer <token>'
        }
      },
      {
        path: '/api/recommendation',
        method: 'POST',
        description: 'Get life insurance recommendation',
        requestBody: {
          age: 'number (18-100)',
          income: 'number (>= 0)',
          dependents: 'number (>= 0)',
          riskTolerance: 'string (low|medium|high)'
        },
        response: {
          recommendation: {
            type: 'string',
            coverage: 'number',
            term: 'number',
            monthlyPremium: 'number'
          },
          explanation: 'string',
          factors: {
            incomeMultiplier: 'number',
            dependentsFactor: 'number',
            riskAdjustment: 'number'
          }
        }
      },
      {
        path: '/api/recommendations',
        method: 'GET',
        description: 'Get recommendation history',
        queryParams: {
          limit: 'number (default: 10)',
          offset: 'number (default: 0)'
        }
      }
    ]
  });
});

app.use(errorHandler);

app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001'}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    db.end(() => {
      logger.info('Database connection pool closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;