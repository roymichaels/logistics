import { logger } from '../lib/logger';

const STORAGE_KEYS_TO_CLEAR = [
  'frontend-data-store',
  'frontend_businesses_cache',
  'frontend_business_ownerships',
  'frontend_business_equity',
  'frontend_business_settings',
  'frontend_infrastructure_cache',
  'local-users',
  'user_id',
  'current-business-id',
  'wallet-session',
  'twa-user-context',
  'dev-console:role-override',
  'feature-flags-cache',
  'notification-preferences',
  'cart-items',
];

const INDEXED_DB_NAMES = [
  'logistics-platform-db',
  'notification-store',
  'chat-encryption-store',
  'offline-sync-store',
];

export interface ClearStorageOptions {
  clearLocalStorage?: boolean;
  clearIndexedDB?: boolean;
  clearSessionStorage?: boolean;
  keepAuthSession?: boolean;
}

export async function clearLocalStorage(options: ClearStorageOptions = {}): Promise<void> {
  const {
    clearLocalStorage: shouldClearLocalStorage = true,
    clearIndexedDB: shouldClearIndexedDB = true,
    clearSessionStorage: shouldClearSessionStorage = true,
    keepAuthSession = true,
  } = options;

  logger.info('[ClearStorage] Starting storage cleanup', options);

  if (shouldClearLocalStorage && typeof localStorage !== 'undefined') {
    try {
      const authKeys = [
        'supabase.auth.token',
        'sb-ojehgobnhjcixzrcgixo-auth-token',
      ];

      const preservedAuth: Record<string, string | null> = {};
      if (keepAuthSession) {
        authKeys.forEach(key => {
          preservedAuth[key] = localStorage.getItem(key);
        });
      }

      STORAGE_KEYS_TO_CLEAR.forEach(key => {
        try {
          localStorage.removeItem(key);
          logger.debug(`[ClearStorage] Removed localStorage key: ${key}`);
        } catch (error) {
          logger.error(`[ClearStorage] Failed to remove localStorage key: ${key}`, error);
        }
      });

      if (keepAuthSession) {
        Object.entries(preservedAuth).forEach(([key, value]) => {
          if (value !== null) {
            localStorage.setItem(key, value);
          }
        });
        logger.debug('[ClearStorage] Preserved auth session');
      }

      logger.info('[ClearStorage] localStorage cleared successfully');
    } catch (error) {
      logger.error('[ClearStorage] Failed to clear localStorage', error);
    }
  }

  if (shouldClearIndexedDB && typeof indexedDB !== 'undefined') {
    try {
      for (const dbName of INDEXED_DB_NAMES) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);

          await new Promise<void>((resolve, reject) => {
            deleteRequest.onsuccess = () => {
              logger.debug(`[ClearStorage] Deleted IndexedDB: ${dbName}`);
              resolve();
            };

            deleteRequest.onerror = () => {
              logger.error(`[ClearStorage] Failed to delete IndexedDB: ${dbName}`);
              reject(deleteRequest.error);
            };

            deleteRequest.onblocked = () => {
              logger.warn(`[ClearStorage] IndexedDB deletion blocked: ${dbName}`);
              resolve();
            };
          });
        } catch (error) {
          logger.error(`[ClearStorage] Error deleting IndexedDB ${dbName}`, error);
        }
      }
      logger.info('[ClearStorage] IndexedDB cleared successfully');
    } catch (error) {
      logger.error('[ClearStorage] Failed to clear IndexedDB', error);
    }
  }

  if (shouldClearSessionStorage && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
      logger.info('[ClearStorage] sessionStorage cleared successfully');
    } catch (error) {
      logger.error('[ClearStorage] Failed to clear sessionStorage', error);
    }
  }

  logger.info('[ClearStorage] Storage cleanup completed');
}

export async function clearAllStorageForMigration(): Promise<void> {
  logger.warn('[ClearStorage] MIGRATION: Clearing all local data for Supabase migration');

  await clearLocalStorage({
    clearLocalStorage: true,
    clearIndexedDB: true,
    clearSessionStorage: true,
    keepAuthSession: true,
  });

  localStorage.setItem('supabase-migration-completed', new Date().toISOString());
  logger.info('[ClearStorage] MIGRATION: Migration flag set');
}

export function hasMigrationCompleted(): boolean {
  return localStorage.getItem('supabase-migration-completed') !== null;
}

export function resetMigrationFlag(): void {
  localStorage.removeItem('supabase-migration-completed');
  logger.info('[ClearStorage] Migration flag reset');
}
