import { logger } from './logger';

interface EnvironmentVariables {
  DATABASE_URL: string;
  NODE_ENV: string;
  PORT: string;
  CORS_ORIGIN?: string;
}

export const validateEnv = (): void => {
  const requiredEnvVars: (keyof EnvironmentVariables)[] = [
    'DATABASE_URL',
    'NODE_ENV',
    'PORT'
  ];

  const missingVars: string[] = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate NODE_ENV
  const validEnvironments = ['development', 'test', 'production'];
  if (!validEnvironments.includes(process.env.NODE_ENV!)) {
    throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be one of: ${validEnvironments.join(', ')}`);
  }

  // Validate PORT
  const port = parseInt(process.env.PORT!, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535`);
  }

  // Validate DATABASE_URL format
  if (!process.env.DATABASE_URL!.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  logger.info('Environment variables validated successfully');
};