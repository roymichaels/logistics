import { logger } from '../lib/logger';

export class EdgeFunctionError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = status;
    this.details = details;
  }
}

export interface SessionContext {
  session: any;
}

export async function ensureSession(): Promise<SessionContext> {
  logger.warn('[FRONTEND-ONLY] ensureSession called - returning mock session');

  const mockSession = {
    wallet: 'mock-wallet',
    role: 'customer',
    walletType: 'ethereum'
  };

  return { session: mockSession };
}

export async function callEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown | null>
): Promise<T> {
  logger.warn(`[FRONTEND-ONLY] Edge function ${functionName} called - returning mock data`);

  throw new EdgeFunctionError(
    `Edge functions not available in frontend-only mode: ${functionName}`,
    501,
    { body }
  );
}
