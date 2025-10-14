import { User } from '../data/types';

export interface ProfileFetchAttempt {
  timestamp: number;
  success: boolean;
  source: string;
  forceRefresh: boolean;
  cacheHit: boolean;
  duration: number;
  error?: string;
  userData?: Partial<User>;
}

class ProfileDebugger {
  private attempts: ProfileFetchAttempt[] = [];
  private readonly MAX_HISTORY = 50;

  logAttempt(attempt: ProfileFetchAttempt): void {
    this.attempts.unshift(attempt);

    if (this.attempts.length > this.MAX_HISTORY) {
      this.attempts = this.attempts.slice(0, this.MAX_HISTORY);
    }

    const icon = attempt.success ? '✅' : '❌';
    const cacheStatus = attempt.cacheHit ? '[CACHE]' : '[FETCH]';

    console.log(`${icon} ${cacheStatus} Profile fetch from ${attempt.source}`, {
      duration: `${attempt.duration}ms`,
      forceRefresh: attempt.forceRefresh,
      success: attempt.success,
      role: attempt.userData?.role,
      error: attempt.error,
      timestamp: new Date(attempt.timestamp).toISOString()
    });
  }

  getHistory(): ProfileFetchAttempt[] {
    return [...this.attempts];
  }

  getStats(): {
    total: number;
    successful: number;
    failed: number;
    cacheHits: number;
    avgDuration: number;
    recentFailures: number;
  } {
    const total = this.attempts.length;
    const successful = this.attempts.filter(a => a.success).length;
    const failed = this.attempts.filter(a => !a.success).length;
    const cacheHits = this.attempts.filter(a => a.cacheHit).length;
    const avgDuration = total > 0
      ? this.attempts.reduce((sum, a) => sum + a.duration, 0) / total
      : 0;
    const recentFailures = this.attempts
      .slice(0, 5)
      .filter(a => !a.success).length;

    return {
      total,
      successful,
      failed,
      cacheHits,
      avgDuration: Math.round(avgDuration),
      recentFailures
    };
  }

  printReport(): void {
    const stats = this.getStats();

    console.group('📊 Profile Fetch Report');
    console.log('Total attempts:', stats.total);
    console.log('Successful:', stats.successful);
    console.log('Failed:', stats.failed);
    console.log('Cache hits:', stats.cacheHits);
    console.log('Avg duration:', `${stats.avgDuration}ms`);
    console.log('Recent failures (last 5):', stats.recentFailures);

    if (stats.recentFailures > 0) {
      console.warn('⚠️ Recent failures detected!');
      console.table(this.attempts.slice(0, 5).map(a => ({
        timestamp: new Date(a.timestamp).toLocaleString(),
        source: a.source,
        success: a.success,
        error: a.error || 'N/A',
        duration: `${a.duration}ms`
      })));
    }

    console.groupEnd();
  }

  clear(): void {
    this.attempts = [];
    console.log('🗑️ Profile fetch history cleared');
  }
}

export const profileDebugger = new ProfileDebugger();

if (typeof window !== 'undefined') {
  (window as any).__profileDebugger = profileDebugger;
  console.log('🔍 Profile debugger available at window.__profileDebugger');
}

export function trackProfileFetch<T>(
  source: string,
  forceRefresh: boolean,
  fetchFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return fetchFn()
    .then((result) => {
      const duration = Date.now() - startTime;

      profileDebugger.logAttempt({
        timestamp: startTime,
        success: true,
        source,
        forceRefresh,
        cacheHit: false,
        duration,
        userData: result as any
      });

      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;

      profileDebugger.logAttempt({
        timestamp: startTime,
        success: false,
        source,
        forceRefresh,
        cacheHit: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    });
}

export function trackCacheHit<T>(
  source: string,
  userData: T
): T {
  profileDebugger.logAttempt({
    timestamp: Date.now(),
    success: true,
    source,
    forceRefresh: false,
    cacheHit: true,
    duration: 0,
    userData: userData as any
  });

  return userData;
}
