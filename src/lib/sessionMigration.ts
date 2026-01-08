import { logger } from './logger';

export interface SessionVersion {
  version: number;
  hasAuthUserId: boolean;
  isCompatible: boolean;
  needsMigration: boolean;
}

const CURRENT_SESSION_VERSION = 2;
const SESSION_VERSION_KEY = 'session-version';

export function checkSessionVersion(): SessionVersion {
  try {
    const sessionData = localStorage.getItem('local-wallet-session');

    if (!sessionData) {
      return {
        version: 0,
        hasAuthUserId: false,
        isCompatible: true,
        needsMigration: false
      };
    }

    const session = JSON.parse(sessionData);
    const storedVersion = parseInt(localStorage.getItem(SESSION_VERSION_KEY) || '1', 10);

    const hasAuthUserId = !!session.authUserId;
    const hasValidUserId = session.userId && session.userId.length === 36;
    const isCompatible = hasAuthUserId && hasValidUserId;
    const needsMigration = !isCompatible || storedVersion < CURRENT_SESSION_VERSION;

    logger.info('[SessionMigration] Session version check:', {
      storedVersion,
      currentVersion: CURRENT_SESSION_VERSION,
      hasAuthUserId,
      hasValidUserId,
      isCompatible,
      needsMigration
    });

    return {
      version: storedVersion,
      hasAuthUserId,
      isCompatible,
      needsMigration
    };
  } catch (error) {
    logger.error('[SessionMigration] Error checking session version:', error);
    return {
      version: 0,
      hasAuthUserId: false,
      isCompatible: false,
      needsMigration: true
    };
  }
}

export function markSessionMigrated(): void {
  try {
    localStorage.setItem(SESSION_VERSION_KEY, CURRENT_SESSION_VERSION.toString());
    localStorage.setItem('session-migration-completed', Date.now().toString());
    logger.info('[SessionMigration] Session marked as migrated');
  } catch (error) {
    logger.error('[SessionMigration] Error marking session as migrated:', error);
  }
}

export function clearOldSession(): void {
  try {
    const keysToPreserve = [
      'dev-console:role-override',
      'session-migration-completed'
    ];

    const preservedData: Record<string, string> = {};
    keysToPreserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        preservedData[key] = value;
      }
    });

    localStorage.clear();

    Object.entries(preservedData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    logger.info('[SessionMigration] Old session cleared, preserved keys:', Object.keys(preservedData));
  } catch (error) {
    logger.error('[SessionMigration] Error clearing old session:', error);
  }
}

export function shouldShowMigrationNotice(): boolean {
  const migrationCompleted = localStorage.getItem('session-migration-completed');
  const migrationNoticeShown = sessionStorage.getItem('migration-notice-shown');

  if (migrationNoticeShown) {
    return false;
  }

  const sessionCheck = checkSessionVersion();

  if (sessionCheck.needsMigration && !migrationCompleted) {
    return true;
  }

  if (migrationCompleted) {
    const completedTime = parseInt(migrationCompleted, 10);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    if (completedTime < oneDayAgo) {
      localStorage.removeItem('session-migration-completed');
    }
  }

  return false;
}

export function dismissMigrationNotice(): void {
  sessionStorage.setItem('migration-notice-shown', 'true');
}
