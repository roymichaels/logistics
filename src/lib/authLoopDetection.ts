/**
 * Authentication Loop Detection and Prevention
 *
 * Detects when the user is stuck in an infinite authentication/logout loop
 * and prevents the loop by implementing circuit breaker pattern.
 */


import { logger } from './logger';
interface AuthAttempt {
  timestamp: number;
  type: 'login' | 'logout';
  userId?: string;
}

const AUTH_ATTEMPTS_KEY = 'auth_attempts';
const LOOP_DETECTION_WINDOW_MS = 60000; // 1 minute
const MAX_ATTEMPTS_IN_WINDOW = 5; // Maximum 5 auth attempts in 1 minute
const CIRCUIT_BREAKER_COOLDOWN_MS = 300000; // 5 minutes cooldown
const CIRCUIT_BREAKER_KEY = 'auth_circuit_breaker';

/**
 * Records an authentication attempt (login or logout)
 */
export function recordAuthAttempt(type: 'login' | 'logout', userId?: string): void {
  try {
    const attempts = getAuthAttempts();
    const now = Date.now();

    // Add new attempt
    attempts.push({
      timestamp: now,
      type,
      userId
    });

    // Keep only recent attempts (within detection window)
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < LOOP_DETECTION_WINDOW_MS
    );

    localStorage.setItem(AUTH_ATTEMPTS_KEY, JSON.stringify(recentAttempts));

    logger.info(`🔐 Auth attempt recorded: ${type}`, {
      totalAttempts: recentAttempts.length,
      window: `${LOOP_DETECTION_WINDOW_MS / 1000}s`
    });
  } catch (error) {
    logger.error('Failed to record auth attempt:', error);
  }
}

/**
 * Gets all recent authentication attempts
 */
function getAuthAttempts(): AuthAttempt[] {
  try {
    const stored = localStorage.getItem(AUTH_ATTEMPTS_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to parse auth attempts:', error);
    return [];
  }
}

/**
 * Checks if the user is in an authentication loop
 */
export function isInAuthLoop(): boolean {
  try {
    const attempts = getAuthAttempts();
    const now = Date.now();

    // Filter to only recent attempts
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < LOOP_DETECTION_WINDOW_MS
    );

    // Check if there are too many attempts
    if (recentAttempts.length >= MAX_ATTEMPTS_IN_WINDOW) {
      logger.warn(`⚠️ Auth loop detected: ${recentAttempts.length} attempts in ${LOOP_DETECTION_WINDOW_MS / 1000}s`);
      return true;
    }

    // Check for rapid login/logout cycles (alternating pattern)
    if (recentAttempts.length >= 4) {
      let alternatingCount = 0;
      for (let i = 1; i < recentAttempts.length; i++) {
        if (recentAttempts[i].type !== recentAttempts[i - 1].type) {
          alternatingCount++;
        }
      }

      // If we see rapid alternation between login/logout, that's a loop
      if (alternatingCount >= 3) {
        logger.warn(`⚠️ Auth loop detected: rapid login/logout alternation`);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('Failed to check auth loop:', error);
    return false;
  }
}

/**
 * Activates the circuit breaker to prevent further auth attempts
 */
export function activateCircuitBreaker(): void {
  try {
    const cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    localStorage.setItem(CIRCUIT_BREAKER_KEY, cooldownUntil.toString());
    logger.warn(`🚨 Circuit breaker activated until ${new Date(cooldownUntil).toISOString()}`);
  } catch (error) {
    logger.error('Failed to activate circuit breaker:', error);
  }
}

/**
 * Checks if the circuit breaker is active
 */
export function isCircuitBreakerActive(): boolean {
  try {
    const cooldownUntilStr = localStorage.getItem(CIRCUIT_BREAKER_KEY);
    if (!cooldownUntilStr) {
      return false;
    }

    const cooldownUntil = parseInt(cooldownUntilStr, 10);
    const now = Date.now();

    if (now < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
      logger.info(`⏸️ Circuit breaker active for ${remainingSeconds}s more`);
      return true;
    }

    // Cooldown period expired, clear the circuit breaker
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    return false;
  } catch (error) {
    logger.error('Failed to check circuit breaker:', error);
    return false;
  }
}

/**
 * Resets all auth loop detection state
 */
export function resetAuthLoopDetection(): void {
  try {
    localStorage.removeItem(AUTH_ATTEMPTS_KEY);
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    logger.info('✅ Auth loop detection reset');
  } catch (error) {
    logger.error('Failed to reset auth loop detection:', error);
  }
}

/**
 * Gets diagnostic information about the current auth state
 */
export function getAuthLoopDiagnostics(): {
  inLoop: boolean;
  circuitBreakerActive: boolean;
  recentAttempts: AuthAttempt[];
  cooldownRemaining: number;
} {
  const attempts = getAuthAttempts();
  const now = Date.now();
  const recentAttempts = attempts.filter(
    attempt => now - attempt.timestamp < LOOP_DETECTION_WINDOW_MS
  );

  const cooldownUntilStr = localStorage.getItem(CIRCUIT_BREAKER_KEY);
  const cooldownRemaining = cooldownUntilStr
    ? Math.max(0, parseInt(cooldownUntilStr, 10) - now)
    : 0;

  return {
    inLoop: isInAuthLoop(),
    circuitBreakerActive: isCircuitBreakerActive(),
    recentAttempts,
    cooldownRemaining
  };
}
