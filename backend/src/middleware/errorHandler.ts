import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface CustomError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip
  });

  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || undefined;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid data format';
  } else if (err.code === '23505') {
    status = 409;
    message = 'Duplicate entry';
    details = 'This record already exists';
  } else if (err.code === '23503') {
    status = 400;
    message = 'Invalid reference';
    details = 'Referenced record does not exist';
  } else if (err.code === '22P02') {
    status = 400;
    message = 'Invalid input syntax';
  } else if (err.code === 'ECONNREFUSED') {
    status = 503;
    message = 'Service temporarily unavailable';
    details = 'Database connection failed';
  }

  const errorResponse: any = {
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.originalError = err.message;
  }

  res.status(status).json(errorResponse);
};

export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};