import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function createRateLimit(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const telegram_id = (req as any).user?.telegram_id;
    
    if (!telegram_id) {
      return next(); // Let auth middleware handle this
    }

    const key = `${telegram_id}:${req.route?.path || req.path}`;
    const now = Date.now();
    
    // Clean up expired entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    // Initialize or increment counter
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[key].count++;
    }

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }

    next();
  };
}