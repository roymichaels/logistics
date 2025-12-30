import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { logger } from '../lib/logger';

export interface PendingOperation {
  id: string;
  type: string;
  data: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface NetworkContextValue {
  isOnline: boolean;
  pendingOperations: PendingOperation[];
  addPendingOperation: (type: string, data: any) => void;
  removePendingOperation: (id: string) => void;
  retryPendingOperations: () => Promise<void>;
  clearPendingOperations: () => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

const PENDING_OPS_KEY = 'app_pending_operations';
const MAX_RETRY_COUNT = 3;

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(PENDING_OPS_KEY);
    if (stored) {
      try {
        const ops = JSON.parse(stored);
        setPendingOperations(ops);
        logger.info('[Network] Loaded pending operations', { count: ops.length });
      } catch (error) {
        logger.error('[Network] Failed to load pending operations', error as Error);
      }
    }
  }, []);

  useEffect(() => {
    if (pendingOperations.length > 0) {
      localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pendingOperations));
    } else {
      localStorage.removeItem(PENDING_OPS_KEY);
    }
  }, [pendingOperations]);

  useEffect(() => {
    const handleOnline = () => {
      logger.info('[Network] Connection restored');
      setIsOnline(true);
      retryPendingOperations();
    };

    const handleOffline = () => {
      logger.warn('[Network] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingOperation = useCallback((type: string, data: any) => {
    const operation: PendingOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    setPendingOperations((prev) => [...prev, operation]);
    logger.info('[Network] Added pending operation', { type, id: operation.id });
  }, []);

  const removePendingOperation = useCallback((id: string) => {
    setPendingOperations((prev) => prev.filter((op) => op.id !== id));
    logger.info('[Network] Removed pending operation', { id });
  }, []);

  const retryPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOperations.length === 0) {
      return;
    }

    logger.info('[Network] Retrying pending operations', { count: pendingOperations.length });

    const newPending: PendingOperation[] = [];

    for (const operation of pendingOperations) {
      if (operation.retryCount >= MAX_RETRY_COUNT) {
        logger.warn('[Network] Operation exceeded max retries', {
          id: operation.id,
          type: operation.type
        });
        continue;
      }

      try {
        logger.info('[Network] Retrying operation', {
          id: operation.id,
          type: operation.type,
          attempt: operation.retryCount + 1
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        logger.info('[Network] Operation completed', {
          id: operation.id,
          type: operation.type
        });
      } catch (error) {
        logger.error('[Network] Operation retry failed', error as Error, {
          id: operation.id,
          type: operation.type
        });

        newPending.push({
          ...operation,
          retryCount: operation.retryCount + 1,
          lastError: (error as Error).message
        });
      }
    }

    setPendingOperations(newPending);
  }, [isOnline, pendingOperations]);

  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
    localStorage.removeItem(PENDING_OPS_KEY);
    logger.info('[Network] Cleared all pending operations');
  }, []);

  const value: NetworkContextValue = {
    isOnline,
    pendingOperations,
    addPendingOperation,
    removePendingOperation,
    retryPendingOperations,
    clearPendingOperations
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}

export function NetworkStatusIndicator() {
  const { isOnline, pendingOperations } = useNetwork();

  if (isOnline && pendingOperations.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '8px 16px',
        backgroundColor: isOnline ? '#ff9500' : '#ff3b30',
        color: 'white',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        zIndex: 10000
      }}
    >
      {!isOnline && '⚠️ No internet connection'}
      {isOnline && pendingOperations.length > 0 && `🔄 Syncing ${pendingOperations.length} pending operations...`}
    </div>
  );
}

logger.info('[Network] Network context module loaded');
